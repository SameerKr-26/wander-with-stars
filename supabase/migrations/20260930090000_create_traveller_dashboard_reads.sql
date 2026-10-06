-- Traveller dashboard & "My Trips" — Phase 4.8.
--
-- Genuinely necessary, minimal migration: `booking_participants` and
-- `payments` have had RLS enabled with ZERO policies since Phase 4.4 (by
-- design — see that migration's own comment: no feature read either table
-- back yet, so no policy was added "because it's possible"). This phase's
-- dashboard is the first real reader of both — a traveller's own booking
-- detail page needs the participant roster and the authoritative payment
-- status, and PostgREST's nested embedding (`bookings.select('*,
-- booking_participants(*), payments(*))')`) requires SELECT permission on
-- the embedded table itself, not just the parent. Without this, every
-- embedded read would silently return an empty array rather than erroring,
-- which is worse than a 403 — it would look like "no participants" or "no
-- payment" rather than "not allowed to see this."
--
-- Both policies mirror `bookings`'s own Phase 4.6 "a traveller can read
-- their own bookings" policy exactly, just one join away: a row is visible
-- only when its PARENT booking belongs to the authenticated user. A guest
-- booking (`bookings.traveller_id is null`) can never match `auth.uid() =
-- b.traveller_id` for any authenticated uid, so this can never expose a
-- guest booking's participants or payment — exactly this phase's own
-- "guest bookings must never become visible/claimable" requirement.
--
-- No INSERT/UPDATE/DELETE policy is added on either table — this phase is
-- read-only for booking data (its own explicit scope), and every existing
-- write path (`create_pending_booking`, `record_payment_result`) already
-- goes through the service-role client, unaffected by these SELECT-only
-- grants.

create policy "a traveller can read their own booking's participants"
  on public.booking_participants
  for select
  to authenticated
  using (
    exists (
      select 1
      from public.bookings b
      where b.id = booking_participants.booking_id
        and b.traveller_id = auth.uid()
    )
  );

create policy "a traveller can read their own booking's payments"
  on public.payments
  for select
  to authenticated
  using (
    exists (
      select 1
      from public.bookings b
      where b.id = payments.booking_id
        and b.traveller_id = auth.uid()
    )
  );
