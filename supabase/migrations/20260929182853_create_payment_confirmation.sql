-- Payment integration & booking confirmation — Phase 4.7.
--
-- Phase 4.4's `payments` table already modelled `provider` (free text, no
-- gateway hardcoded), `provider_reference` (the provider's OWN identifier,
-- nullable because it may not exist yet at creation), `amount`/`currency`,
-- and a `pending -> succeeded | failed` status. This migration adds
-- exactly what a real gateway integration needs beyond that:
--
--   1. A second provider identifier column — Razorpay (the selected
--      provider) has TWO distinct identifiers over one payment's
--      lifecycle: an `order_id` assigned at order-creation time (already
--      `provider_reference`) and a `payment_id` assigned only once the
--      traveller actually completes checkout. One column cannot hold both
--      meaningfully at once.
--   2. `record_payment_result()` — the one atomic, idempotent entry point
--      both the webhook handler and the checkout-return verification call
--      converge on, so "the webhook confirms" and "the browser's own
--      return-triggered check confirms" can never both apply, or race,
--      or double-confirm a booking.
--
-- Nothing here touches `bookings_before_insert`/`_before_update`
-- (Phase 4.4/4.6's seat-reservation and expiry triggers) or
-- `create_pending_booking()` (Phase 4.6) — this migration is additive.

-- ========================================================= payments --

-- Phase 4.4's `payments.booking_id` FK had no `on delete` behaviour at
-- all (unlike `booking_participants.booking_id`, which already had `on
-- delete cascade`) — a latent gap that could not surface until a payment
-- row actually existed to test it against, which this phase is the first
-- to create. The same migration's own header explains exactly why a hard
-- delete must still work even though it "is not a normal business
-- operation": test cleanup, and any future data correction, must be able
-- to remove a booking and everything genuinely subordinate to it — a
-- payment attempt against a booking is exactly that, the same as its
-- participants already were. Without this fix, deleting a booking that
-- has any payment row fails with a foreign-key violation, silently
-- leaving that booking's reserved/confirmed seats stuck forever (the
-- delete never completes, so `bookings_before_delete_trigger` — which
-- would otherwise release them — never runs at all).
alter table public.payments drop constraint payments_booking_id_fkey;
alter table public.payments
  add constraint payments_booking_id_fkey
  foreign key (booking_id) references public.bookings (id) on delete cascade;

alter table public.payments add column provider_payment_id text;

comment on column public.payments.provider_reference is
  'The provider''s ORDER/session identifier, assigned at order-creation '
  'time (Razorpay: order_id). Distinct from provider_payment_id, which '
  'only exists once checkout actually completes.';

comment on column public.payments.provider_payment_id is
  'The provider''s PAYMENT identifier, assigned once checkout completes '
  '(Razorpay: payment_id) — null until then. Set by record_payment_result().';

alter table public.payments add column failure_reason text;

comment on column public.payments.failure_reason is
  'A short, safe-to-store reason for a failed payment (e.g. the '
  'provider''s own error code/description) — never a raw provider payload, '
  'never card/bank details. Null for pending/succeeded payments.';

-- Same partial-unique-index shape `payments_provider_reference_unique`
-- already uses, for the same reason: a payment_id is only known once
-- checkout completes, so most rows have it null, and only a genuine
-- provider identifier should ever collide.
create unique index payments_provider_payment_id_unique
  on public.payments (provider, provider_payment_id)
  where provider_payment_id is not null;

-- ============================================== payment confirmation --

-- The one atomic entry point for recording a payment provider's reported
-- outcome and — only when that outcome is a genuine success — confirming
-- the booking it belongs to. Both `app/booking/[departureId]/payment-actions.ts`'s
-- checkout-return verification AND `app/api/webhooks/razorpay/route.ts`'s
-- webhook handler call this SAME function, so whichever one reaches it
-- first performs the confirmation and the other becomes a safe no-op —
-- there is exactly one place a booking can ever become `confirmed` from a
-- payment result, not two independently-written code paths that could
-- drift or double-apply.
--
-- Idempotency / out-of-order safety, in one guard: once a payment row is
-- no longer `pending` (it already resolved to `succeeded` or `failed`),
-- EVERY further call for that same provider_order_id is a no-op, returning
-- the row unchanged — a duplicate webhook delivery, a stale/out-of-order
-- "failed" event arriving after a genuine "succeeded" one already
-- resolved it (never downgrades a success), and a duplicate delivery of
-- the same "succeeded" event are all the identical case: nothing left to
-- do. A genuine retry after a real failure is never represented by
-- reusing this same row anyway — `lib/payments/repository.ts`'s order
-- creation only ever reuses a still-`pending` payment row, so a `failed`
-- row is always left exactly as it resolved, and a fresh attempt gets a
-- fresh row with its own `provider_order_id`.
--
-- Amount/currency verification: compares what the PROVIDER reported
-- against what THIS ROW already recorded at creation time (itself derived
-- from the booking's own commercial snapshot, never from the browser —
-- see lib/payments/repository.ts's own header) — never against a fresh
-- read of "current" trip pricing, which the booking's snapshot is
-- deliberately immune to. A mismatch fails safely: raises, changes
-- nothing, and — critically — never confirms the booking.
--
-- Booking confirmation only happens if the booking is STILL `pending` at
-- this moment. If it already expired or was cancelled before a genuinely
-- successful payment result arrives, the payment itself is still recorded
-- as `succeeded` (the money genuinely moved — that is a true historical
-- fact this table must not hide), but the booking is deliberately NOT
-- reconfirmed: its seats may already have been released back to
-- inventory (and possibly re-sold), so silently re-confirming would risk
-- overselling the departure. This is a real, documented edge case this
-- phase resolves by NOT resolving it automatically — see
-- docs/ARCHITECTURE.md §20's "Expiry interaction" section for the full
-- reasoning and the manual-reconciliation expectation this leaves in
-- place (no automated refund is issued either — that would be inventing
-- a refund policy this phase explicitly must not do).
create function public.record_payment_result(
  p_provider text,
  p_provider_order_id text,
  p_provider_payment_id text,
  p_status text,
  p_reported_amount numeric,
  p_reported_currency text,
  p_failure_reason text
)
returns public.payments
language plpgsql
as $$
declare
  v_payment public.payments;
begin
  if p_status not in ('succeeded', 'failed') then
    raise exception 'PAYMENT_ERROR: INVALID_STATUS';
  end if;

  select * into v_payment
    from public.payments
    where provider = p_provider and provider_reference = p_provider_order_id
    for update;
  if not found then
    raise exception 'PAYMENT_ERROR: ORDER_NOT_FOUND';
  end if;

  -- Already resolved — duplicate/replayed/out-of-order event. No-op.
  if v_payment.status <> 'pending' then
    return v_payment;
  end if;

  if p_status = 'succeeded' and (
    p_reported_amount is distinct from v_payment.amount
    or p_reported_currency is distinct from v_payment.currency
  ) then
    raise exception 'PAYMENT_ERROR: AMOUNT_MISMATCH';
  end if;

  update public.payments
  set
    status = p_status,
    provider_payment_id = p_provider_payment_id,
    failure_reason = p_failure_reason,
    captured_at = case when p_status = 'succeeded' then now() else captured_at end
  where id = v_payment.id
  returning * into v_payment;

  if p_status = 'succeeded' then
    -- Only advances a still-pending booking — see this function's own
    -- header for why a booking that already left `pending` is
    -- deliberately left untouched rather than reconfirmed.
    update public.bookings
    set status = 'confirmed'
    where id = v_payment.booking_id and status = 'pending';
  end if;

  return v_payment;
end;
$$;

-- No RLS change: `payments` keeps its existing zero anon/authenticated
-- policies (Phase 4.4's own deliberate stance) — this function is called
-- only via the service-role client
-- (`lib/payments/repository.ts`/`app/api/webhooks/razorpay/route.ts`),
-- after the webhook's own signature verification or the checkout-return
-- action's own session/ownership check, exactly the established
-- "service-role client, after an application-layer authorization check"
-- pattern every other privileged write in this project already follows.
