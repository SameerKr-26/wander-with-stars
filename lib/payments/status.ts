/**
 * Provider status mapping — Phase 4.7.
 *
 * Razorpay's own payment/order status vocabulary
 * (`created`/`attempted`/`paid` for orders; `created`/`authorized`/
 * `captured`/`failed`/`refunded` for payments) never appears anywhere else
 * in this codebase — every Razorpay-specific string is translated to this
 * project's own `PaymentStatus` (`lib/booking/schema.ts`,
 * `pending | succeeded | failed | refunded`) in exactly ONE place, here,
 * so a future second provider (or a Razorpay API version change) touches
 * one file, not every call site that happens to check a status string.
 */
import type { PaymentStatus } from '@/lib/booking/schema';

/**
 * Razorpay payment entity statuses this project actually needs to
 * distinguish. `authorized` (funds held, not yet captured) is treated as
 * still `pending` — this project auto-captures (see
 * `lib/payments/razorpay.ts`'s order-creation comment), so an
 * `authorized`-only payment reaching the webhook would mean capture
 * hasn't completed yet, not that it failed.
 */
export type RazorpayPaymentStatus = 'created' | 'authorized' | 'captured' | 'failed' | 'refunded';

const RAZORPAY_TO_INTERNAL: Record<RazorpayPaymentStatus, PaymentStatus> = {
  created: 'pending',
  authorized: 'pending',
  captured: 'succeeded',
  failed: 'failed',
  refunded: 'refunded',
};

export function mapRazorpayPaymentStatus(status: string): PaymentStatus | null {
  if (status in RAZORPAY_TO_INTERNAL) {
    return RAZORPAY_TO_INTERNAL[status as RazorpayPaymentStatus];
  }
  return null;
}

/**
 * `record_payment_result()` (the Postgres function every confirmation path
 * calls) only ever accepts `'succeeded' | 'failed'` — `pending` is a
 * no-op (nothing to record yet) and `refunded` is Phase 4.7's explicitly
 * deferred future state (see docs/ARCHITECTURE.md's "Refunds" section).
 * This narrows a mapped status to exactly what that function's contract
 * allows, so a caller can't accidentally pass it something it was never
 * designed to handle.
 */
export function isRecordablePaymentStatus(status: PaymentStatus): status is 'succeeded' | 'failed' {
  return status === 'succeeded' || status === 'failed';
}
