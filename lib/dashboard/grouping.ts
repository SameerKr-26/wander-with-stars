/**
 * Pure booking-grouping/classification logic — Phase 4.8.
 *
 * Kept separate from `lib/dashboard/repository.ts` (which does the actual
 * database reads) so the "which group does this booking belong in" and
 * "which payment row is the authoritative one" decisions can be unit
 * tested directly, with no Supabase client to mock — the same split
 * `lib/booking/status.ts` already established for booking-lifecycle rules.
 */
import type { BookingStatus } from '@/lib/booking/status';
import type { PaymentStatus } from '@/lib/booking/schema';

export type BookingGroup = 'upcoming' | 'past' | 'cancelled';

/**
 * `cancelled` always wins regardless of date — a cancelled booking for a
 * future departure is still cancelled, not upcoming. `completed` is always
 * `past` by definition (the departure already happened — Phase 4.4's own
 * status model only reaches `completed` after the fact). Everything else
 * is classified purely by date: today counts as upcoming (a traveller
 * travelling today still wants to see it as their current trip, not
 * filed away as history the moment the date rolls over).
 */
export function classifyBooking(
  status: BookingStatus,
  snapshotDepartureDateIso: string,
  now: Date = new Date(),
): BookingGroup {
  if (status === 'cancelled') return 'cancelled';
  if (status === 'completed') return 'past';

  const departureDate = new Date(`${snapshotDepartureDateIso}T00:00:00Z`);
  const today = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()));
  return departureDate < today ? 'past' : 'upcoming';
}

export interface GroupableBooking {
  snapshotDepartureDate: string;
  status: BookingStatus;
}

export interface GroupedBookings<T extends GroupableBooking> {
  upcoming: T[];
  past: T[];
  cancelled: T[];
}

/**
 * Upcoming sorts soonest-first (the next trip leads); past and cancelled
 * sort most-recent-first (the most recently relevant history leads) —
 * each the natural reading order for that group, not one shared sort
 * applied to every bucket.
 */
export function groupBookings<T extends GroupableBooking>(
  bookings: readonly T[],
  now: Date = new Date(),
): GroupedBookings<T> {
  const groups: GroupedBookings<T> = { upcoming: [], past: [], cancelled: [] };

  for (const booking of bookings) {
    groups[classifyBooking(booking.status, booking.snapshotDepartureDate, now)].push(booking);
  }

  const byDate = (a: T, b: T) =>
    new Date(a.snapshotDepartureDate).getTime() - new Date(b.snapshotDepartureDate).getTime();

  groups.upcoming.sort(byDate);
  groups.past.sort((a, b) => byDate(b, a));
  groups.cancelled.sort((a, b) => byDate(b, a));

  return groups;
}

export interface PaymentForSelection {
  status: PaymentStatus;
  createdAt: string;
}

/**
 * The "authoritative payment record" this phase's brief requires,
 * distilled from a booking's own (possibly multi-row, after retries)
 * payment history: a `succeeded` row always wins — once one exists, the
 * booking is confirmed and no further attempt can legitimately follow it
 * (`createPaymentOrder` refuses to create a new order for a non-pending
 * booking) — otherwise the most recently created attempt reflects the
 * booking's current real state (still pending, or its most recent
 * failure). `null` means no payment attempt has ever been made yet.
 */
export function pickAuthoritativePayment<T extends PaymentForSelection>(
  payments: readonly T[],
): T | null {
  if (payments.length === 0) return null;

  const succeeded = payments.find((p) => p.status === 'succeeded');
  if (succeeded) return succeeded;

  return payments.reduce((latest, candidate) =>
    new Date(candidate.createdAt).getTime() > new Date(latest.createdAt).getTime()
      ? candidate
      : latest,
  );
}
