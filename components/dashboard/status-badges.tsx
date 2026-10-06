import type { BookingStatus } from '@/lib/booking/status';
import type { PaymentStatus } from '@/lib/booking/schema';
import { Badge } from '@/components/ui';

/**
 * Status → (label, tone) mappings — the one place either vocabulary is
 * translated into something a traveller reads, mirroring
 * `lib/payments/status.ts`'s own "translate in exactly one place" rule for
 * the Razorpay vocabulary. Booking status and payment status are rendered
 * by two separate components (never merged into one badge) because this
 * phase's own "payment status must come from the authoritative payment
 * record, never inferred from booking state" rule applies to how they're
 * read, not just how they're displayed — keeping them visually distinct
 * reinforces that they are two different facts.
 */

const BOOKING_STATUS_LABEL: Record<BookingStatus, string> = {
  pending: 'Pending',
  confirmed: 'Confirmed',
  cancelled: 'Cancelled',
  completed: 'Completed',
};

const BOOKING_STATUS_TONE: Record<BookingStatus, 'neutral' | 'brand' | 'accent'> = {
  pending: 'accent',
  confirmed: 'brand',
  cancelled: 'neutral',
  completed: 'neutral',
};

export function BookingStatusBadge({ status }: { status: BookingStatus }) {
  return <Badge tone={BOOKING_STATUS_TONE[status]}>{BOOKING_STATUS_LABEL[status]}</Badge>;
}

const PAYMENT_STATUS_LABEL: Record<PaymentStatus, string> = {
  pending: 'Payment pending',
  succeeded: 'Paid',
  failed: 'Payment failed',
  refunded: 'Refunded',
};

const PAYMENT_STATUS_TONE: Record<PaymentStatus, 'neutral' | 'brand' | 'accent'> = {
  pending: 'accent',
  succeeded: 'brand',
  failed: 'neutral',
  refunded: 'neutral',
};

export function PaymentStatusBadge({ status }: { status: PaymentStatus | null }) {
  if (!status) return <Badge tone="neutral">No payment yet</Badge>;
  return <Badge tone={PAYMENT_STATUS_TONE[status]}>{PAYMENT_STATUS_LABEL[status]}</Badge>;
}
