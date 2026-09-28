/**
 * Booking lifecycle — Phase 4.4.
 *
 * Mirrors
 * `supabase/migrations/20260928190958_create_booking_domain_tables.sql`'s
 * `booking_status_transition_is_valid` SQL function exactly, for the same
 * reason `lib/admin/transitions.ts` exists alongside its own DB triggers:
 * no application write-layer exists yet this phase (no checkout, no
 * booking Server Actions), so the database trigger is the only real
 * enforcement today. This module is the future application layer's
 * reference for the same rules, and is unit-tested here so the two can't
 * silently drift without a test noticing.
 *
 * Deliberately four states, not the richer draft/pending-payment/
 * confirmed/partially-paid/balance-due/completed model docs/DATABASE.md
 * originally sketched for the full future booking system (Phase 6) — see
 * that migration's own header for the reconciliation. `payments.status`
 * (separate, `lib/booking/schema.ts`) is where payment-specific nuance
 * (succeeded/failed/refunded) lives instead; a booking's own status never
 * conflates "is this paid" with "does this reservation still stand."
 */
export const BOOKING_STATUSES = ['pending', 'confirmed', 'cancelled', 'completed'] as const;
export type BookingStatus = (typeof BOOKING_STATUSES)[number];

/**
 * pending -> confirmed    a future payment-success handler
 * pending -> cancelled    traveller or operator, before payment
 * confirmed -> cancelled  operator, after payment (refund is a separate,
 *                         future concern — see `payments.status`)
 * confirmed -> completed  a future scheduled job, once the departure date
 *                         has passed
 *
 * No transition out of `cancelled` or `completed` — both are terminal.
 */
const TRANSITIONS: Record<BookingStatus, readonly BookingStatus[]> = {
  pending: ['confirmed', 'cancelled'],
  confirmed: ['cancelled', 'completed'],
  cancelled: [],
  completed: [],
};

export function canTransitionBookingStatus(from: BookingStatus, to: BookingStatus): boolean {
  return TRANSITIONS[from].includes(to);
}

export function allowedNextBookingStatuses(from: BookingStatus): readonly BookingStatus[] {
  return TRANSITIONS[from];
}
