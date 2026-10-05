import 'server-only';

import { createHmac, timingSafeEqual } from 'node:crypto';

import { createAdminClient } from '@/lib/supabase/admin';

import { fromProviderSubunits, toProviderSubunits } from './amount';
import { getPaymentEnv } from './env';
import { createRazorpayOrder, fetchRazorpayPayment } from './razorpay';
import { isRecordablePaymentStatus, mapRazorpayPaymentStatus } from './status';

/**
 * Server-only payment orchestration — Phase 4.7.
 *
 * Every function here uses the service-role client
 * (`lib/supabase/admin.ts`): `payments` still has zero `anon`/
 * `authenticated` INSERT/UPDATE policy (Phase 4.4's stance, unchanged —
 * see docs/DATABASE.md), so this is the only write path, exactly the
 * established `lib/admin/`/`lib/booking/repository.ts` pattern.
 *
 * `createPaymentOrder` is the ONE place an order amount is decided — it
 * reads the booking's own `participant_count` × `snapshot_price_amount`
 * (the commercial snapshot fixed at booking-creation time, Phase 4.6),
 * never a value any caller supplies. `verifyAndRecordPayment` is a
 * convenience fast-path (the checkout-return flow), NOT the sole
 * authority — it independently re-fetches the payment from Razorpay's own
 * API before trusting anything, and converges on the exact same
 * `record_payment_result()` database function
 * (`supabase/migrations/20260929182853_*.sql`) the webhook route also
 * calls, so whichever path reaches a genuine success first is the one
 * that actually confirms the booking — see that migration's own header
 * for the full idempotency/race reasoning.
 */

export type CreatePaymentOrderErrorCode = 'BOOKING_NOT_FOUND' | 'BOOKING_NOT_PAYABLE' | 'UNKNOWN';

export interface PaymentOrderResult {
  orderId: string;
  /** Human-readable decimal amount — participant_count × per-person price, server-derived. */
  amount: number;
  amountInSubunits: number;
  currency: string;
  /** Public identifier, safe to send to the browser for Razorpay Checkout. */
  keyId: string;
  bookingReference: string;
}

interface BookingForPayment {
  id: string;
  reference: string;
  status: string;
  participant_count: number;
  snapshot_price_amount: number;
  snapshot_price_currency: string;
  expires_at: string | null;
}

function isExpired(booking: BookingForPayment): boolean {
  return Boolean(booking.expires_at && new Date(booking.expires_at).getTime() < Date.now());
}

/**
 * Creates (or safely reuses) a Razorpay order for the given booking.
 * Reuses an existing still-`pending` payment row for the same booking
 * rather than creating a second Razorpay order every time the traveller
 * reopens or retries checkout (double-click, page re-render, network
 * retry) — the common instance of "Case C/D" from this phase's own
 * requirements. A genuine concurrent race (two simultaneous requests for
 * the same booking) is resolved by re-querying after a unique-index
 * conflict rather than erroring — see the inline comment below.
 */
export async function createPaymentOrder(
  bookingId: string,
): Promise<
  { ok: true; order: PaymentOrderResult } | { ok: false; errorCode: CreatePaymentOrderErrorCode }
> {
  const supabase = createAdminClient();

  const { data: booking, error } = await supabase
    .from('bookings')
    .select(
      'id, reference, status, participant_count, snapshot_price_amount, snapshot_price_currency, expires_at',
    )
    .eq('id', bookingId)
    .maybeSingle<BookingForPayment>();

  if (error || !booking) return { ok: false, errorCode: 'BOOKING_NOT_FOUND' };
  if (booking.status !== 'pending' || isExpired(booking)) {
    return { ok: false, errorCode: 'BOOKING_NOT_PAYABLE' };
  }

  const amount = booking.participant_count * booking.snapshot_price_amount;
  const currency = booking.snapshot_price_currency;
  const { RAZORPAY_KEY_ID } = getPaymentEnv();

  const buildResult = (orderId: string): PaymentOrderResult => ({
    orderId,
    amount,
    amountInSubunits: toProviderSubunits(amount),
    currency,
    keyId: RAZORPAY_KEY_ID,
    bookingReference: booking.reference,
  });

  const { data: existing } = await supabase
    .from('payments')
    .select('provider_reference, amount, currency')
    .eq('booking_id', bookingId)
    .eq('provider', 'razorpay')
    .eq('status', 'pending')
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle();

  if (
    existing?.provider_reference &&
    Number(existing.amount) === amount &&
    existing.currency === currency
  ) {
    return { ok: true, order: buildResult(existing.provider_reference) };
  }

  let order;
  try {
    order = await createRazorpayOrder({
      amountInSubunits: toProviderSubunits(amount),
      currency,
      receipt: booking.reference,
    });
  } catch {
    return { ok: false, errorCode: 'UNKNOWN' };
  }

  const { error: insertError } = await supabase.from('payments').insert({
    booking_id: bookingId,
    provider: 'razorpay',
    provider_reference: order.id,
    amount,
    currency,
  });

  if (insertError) {
    // Unique-violation on (provider, provider_reference) means a
    // concurrent request already recorded a pending payment for this
    // booking — vanishingly unlikely (this order's own id is freshly
    // generated by Razorpay), but re-querying rather than erroring keeps
    // this path correct under genuine concurrency too.
    const { data: winner } = await supabase
      .from('payments')
      .select('provider_reference')
      .eq('booking_id', bookingId)
      .eq('provider', 'razorpay')
      .eq('status', 'pending')
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle();
    if (winner?.provider_reference)
      return { ok: true, order: buildResult(winner.provider_reference) };
    return { ok: false, errorCode: 'UNKNOWN' };
  }

  return { ok: true, order: buildResult(order.id) };
}

export type VerifyPaymentErrorCode =
  'INVALID_SIGNATURE' | 'PAYMENT_NOT_FOUND' | 'VERIFICATION_FAILED' | 'UNKNOWN';

export interface VerifiedPaymentResult {
  bookingId: string;
  bookingStatus: string;
  paymentStatus: string;
}

/** `HMAC_SHA256(order_id + "|" + payment_id, key_secret)` — Razorpay Checkout's own documented signature for its success-handler callback. A different secret and a different input than the webhook's own signature (`lib/payments/webhook.ts`) — the two are not interchangeable. */
function verifyCheckoutSignature(orderId: string, paymentId: string, signature: string): boolean {
  const { RAZORPAY_KEY_SECRET } = getPaymentEnv();
  const expected = createHmac('sha256', RAZORPAY_KEY_SECRET)
    .update(`${orderId}|${paymentId}`, 'utf8')
    .digest('hex');
  const expectedBuffer = Buffer.from(expected, 'hex');
  const receivedBuffer = Buffer.from(signature, 'hex');
  if (expectedBuffer.length !== receivedBuffer.length) return false;
  return timingSafeEqual(expectedBuffer, receivedBuffer);
}

/**
 * The checkout-return fast path: verifies Checkout's own signature, then
 * independently re-fetches the payment from Razorpay's API (never trusts
 * the browser's mere claim that checkout succeeded), then records the
 * result through the exact same database function the webhook uses. If
 * the webhook already won the race, this becomes a safe no-op read of the
 * already-confirmed state — see `record_payment_result()`'s own header.
 */
export async function verifyAndRecordPayment(input: {
  razorpayOrderId: string;
  razorpayPaymentId: string;
  razorpaySignature: string;
}): Promise<
  { ok: true; result: VerifiedPaymentResult } | { ok: false; errorCode: VerifyPaymentErrorCode }
> {
  if (
    !verifyCheckoutSignature(
      input.razorpayOrderId,
      input.razorpayPaymentId,
      input.razorpaySignature,
    )
  ) {
    return { ok: false, errorCode: 'INVALID_SIGNATURE' };
  }

  let payment;
  try {
    payment = await fetchRazorpayPayment(input.razorpayPaymentId);
  } catch {
    return { ok: false, errorCode: 'PAYMENT_NOT_FOUND' };
  }

  if (payment.order_id !== input.razorpayOrderId) {
    return { ok: false, errorCode: 'VERIFICATION_FAILED' };
  }

  const mapped = mapRazorpayPaymentStatus(payment.status);
  if (!mapped || !isRecordablePaymentStatus(mapped)) {
    // `pending`/`authorized` — not resolved yet from Razorpay's own point
    // of view. Not an error: the caller shows "verification in progress",
    // and the webhook (or a later manual re-check) will resolve it.
    return { ok: false, errorCode: 'VERIFICATION_FAILED' };
  }

  return recordPaymentResult({
    provider: 'razorpay',
    providerOrderId: input.razorpayOrderId,
    providerPaymentId: payment.id,
    status: mapped,
    reportedAmount: fromProviderSubunits(payment.amount),
    reportedCurrency: payment.currency,
    failureReason: payment.error_description ?? null,
  });
}

interface RecordPaymentResultInput {
  provider: string;
  providerOrderId: string;
  providerPaymentId: string;
  status: 'succeeded' | 'failed';
  reportedAmount: number;
  reportedCurrency: string;
  failureReason: string | null;
}

/**
 * The one call both `verifyAndRecordPayment` (above) and the webhook route
 * make into `record_payment_result()` — kept as a single exported
 * function so there is exactly one place in the application layer that
 * calls it, matching that database function's own "exactly one place a
 * booking can become confirmed" guarantee.
 */
export async function recordPaymentResult(
  input: RecordPaymentResultInput,
): Promise<
  { ok: true; result: VerifiedPaymentResult } | { ok: false; errorCode: VerifyPaymentErrorCode }
> {
  const supabase = createAdminClient();

  const { data, error } = await supabase.rpc('record_payment_result', {
    p_provider: input.provider,
    p_provider_order_id: input.providerOrderId,
    p_provider_payment_id: input.providerPaymentId,
    p_status: input.status,
    p_reported_amount: input.reportedAmount,
    p_reported_currency: input.reportedCurrency,
    p_failure_reason: input.failureReason as unknown as string, // nullable at the SQL level; see lib/booking/repository.ts's own comment on this exact codegen gap
  });

  if (error || !data) {
    if (error?.message?.includes('ORDER_NOT_FOUND')) {
      return { ok: false, errorCode: 'PAYMENT_NOT_FOUND' };
    }
    if (error?.message?.includes('AMOUNT_MISMATCH')) {
      return { ok: false, errorCode: 'VERIFICATION_FAILED' };
    }
    return { ok: false, errorCode: 'UNKNOWN' };
  }

  const row = data as { booking_id: string; status: string };

  const { data: booking } = await supabase
    .from('bookings')
    .select('status')
    .eq('id', row.booking_id)
    .maybeSingle();

  return {
    ok: true,
    result: {
      bookingId: row.booking_id,
      bookingStatus: booking?.status ?? 'pending',
      paymentStatus: row.status,
    },
  };
}
