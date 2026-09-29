/**
 * Pure formatting helpers for the booking flow — Phase 4.6.
 *
 * Separate from `lib/content/format.ts` because these operate on the
 * booking domain's own field names (`priceAmount`/`priceCurrency` as two
 * flat fields, matching `BookableDepartureSummary`/`SafeBookingResult`),
 * not `TripPrice`'s `{ amount, currency }` shape — a thin, deliberate
 * boundary rather than importing content-domain types into the booking
 * domain for one formatting call.
 */
export function formatBookingDate(iso: string): string {
  return new Intl.DateTimeFormat('en-IN', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  }).format(new Date(iso));
}

export function formatBookingPrice(amount: number, currency: string): string {
  return new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency,
    maximumFractionDigits: 0,
  }).format(amount);
}
