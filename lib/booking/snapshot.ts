/**
 * Commercial snapshot mapping — Phase 4.4.
 *
 * Pure function from "the trip and departure being booked, right now" to
 * exactly the fields `bookings.snapshot_*` (see the Phase 4.4 migration's
 * own header) persists forever, independent of `lib/content/db`'s row
 * shapes so this module's contract stays explicit rather than silently
 * widening whenever that schema gains a column. A future booking-creation
 * flow calls this once, at the moment of booking, and writes the result
 * alongside the new row — never re-derives it later from current trip
 * content, which is exactly the mutation this snapshot exists to be immune
 * to (see the migration's "content immutability boundary" comment).
 */
export interface SnapshotSourceTrip {
  title: string;
  slug: string;
  destination: string;
}

export interface SnapshotSourceDeparture {
  departureDate: string;
  returnDate?: string | null;
  priceAmount: number;
  priceCurrency: string;
}

export interface BookingCommercialSnapshot {
  snapshotTripTitle: string;
  snapshotTripSlug: string;
  snapshotDestination: string;
  snapshotDepartureDate: string;
  snapshotReturnDate: string | null;
  snapshotPriceAmount: number;
  snapshotPriceCurrency: string;
}

export function buildBookingSnapshot(
  trip: SnapshotSourceTrip,
  departure: SnapshotSourceDeparture,
): BookingCommercialSnapshot {
  return {
    snapshotTripTitle: trip.title,
    snapshotTripSlug: trip.slug,
    snapshotDestination: trip.destination,
    snapshotDepartureDate: departure.departureDate,
    snapshotReturnDate: departure.returnDate ?? null,
    snapshotPriceAmount: departure.priceAmount,
    snapshotPriceCurrency: departure.priceCurrency,
  };
}
