/**
 * Amount conversion — Phase 4.7.
 *
 * Pure, no imports — Razorpay (and most gateways) require the amount in
 * the currency's smallest unit (paise for INR: `amount * 100`), while
 * every other amount in this codebase (`bookings.snapshot_price_amount`,
 * `payments.amount`) is stored as a decimal rupee value. This is the one
 * place that conversion happens, in one direction only — this project
 * introduces no currency conversion or exchange-rate logic (out of scope,
 * and every current booking is INR-priced regardless).
 */

/** Rupees (or any decimal-major-unit currency amount) to the provider's integer subunits. */
export function toProviderSubunits(amount: number): number {
  // Round, not truncate: floating-point decimal amounts (e.g. 499.99) can
  // land a hair under the exact integer after `* 100` — rounding is the
  // correct recovery, not silently truncating a paisa away.
  return Math.round(amount * 100);
}

/** The inverse — a provider's reported integer subunits back to the decimal amount this project stores/compares against. */
export function fromProviderSubunits(subunits: number): number {
  return Math.round(subunits) / 100;
}
