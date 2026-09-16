/**
 * Trip discovery filtering — pure functions, no React, no fixtures import.
 *
 * This is the seam Phase 3.4 asks for explicitly: filtering runs client-side
 * against an already-fetched trip list today, but every function here takes
 * plain data in and returns plain data out. Replacing the client-side filter
 * with a Supabase query later means rewriting the *caller*, not these
 * functions or the components that use them — the filter *shape*
 * (TripFilters) becomes query parameters, unchanged.
 *
 * Every predicate here is honest: a filter with no matches returns an empty
 * array rather than a fallback trip, and nothing here invents data to make a
 * category look populated.
 */

import type { BudgetBucket, DurationBucket, TripFilters, TripPreview } from './types';

export const EMPTY_FILTERS: TripFilters = {
  query: '',
  styles: [],
  month: null,
  duration: null,
  budget: null,
};

export function hasActiveFilters(filters: TripFilters): boolean {
  return (
    filters.query.trim() !== '' ||
    filters.styles.length > 0 ||
    filters.month !== null ||
    filters.duration !== null ||
    filters.budget !== null
  );
}

/** Duration buckets in nights. Standard, sensible ranges — not fitted to fixture data. */
const DURATION_RANGES: Record<DurationBucket, { min: number; max: number }> = {
  short: { min: 0, max: 4 },
  medium: { min: 5, max: 7 },
  long: { min: 8, max: Infinity },
};

export function matchesDuration(nights: number, bucket: DurationBucket): boolean {
  const range = DURATION_RANGES[bucket];
  return nights >= range.min && nights <= range.max;
}

/** Budget buckets in the trip's own currency — see BudgetBucket's doc comment on the INR assumption. */
const BUDGET_RANGES: Record<BudgetBucket, { min: number; max: number }> = {
  budget: { min: 0, max: 50_000 },
  mid: { min: 50_000, max: 75_000 },
  premium: { min: 75_000, max: Infinity },
};

export function matchesBudget(amount: number, bucket: BudgetBucket): boolean {
  const range = BUDGET_RANGES[bucket];
  return amount >= range.min && amount <= range.max;
}

/**
 * Departure months actually present in the given trips, as filter options.
 *
 * Generated from real data rather than a fixed calendar range, so the "When"
 * control never offers a month with zero possible matches, and needs no
 * change as departures come and go.
 */
export function getAvailableMonths(trips: TripPreview[]): { value: string; label: string }[] {
  const seen = new Map<string, string>();

  for (const trip of trips) {
    const date = new Date(trip.departureDate);
    const value = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
    if (!seen.has(value)) {
      const label = new Intl.DateTimeFormat('en-IN', { month: 'long', year: 'numeric' }).format(
        date,
      );
      seen.set(value, label);
    }
  }

  return [...seen.entries()]
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([value, label]) => ({ value, label }));
}

function matchesQuery(trip: TripPreview, query: string): boolean {
  const needle = query.trim().toLowerCase();
  if (needle === '') return true;

  return (
    trip.title.toLowerCase().includes(needle) ||
    trip.destination.toLowerCase().includes(needle) ||
    trip.country.toLowerCase().includes(needle)
  );
}

function matchesStyles(trip: TripPreview, styles: TripFilters['styles']): boolean {
  if (styles.length === 0) return true;
  return styles.some((style) => (trip.styleScores[style] ?? 0) > 0);
}

function matchesMonth(trip: TripPreview, month: string | null): boolean {
  if (month === null) return true;
  const date = new Date(trip.departureDate);
  const value = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
  return value === month;
}

/**
 * Applies every active filter to a trip list. Order doesn't matter — each
 * predicate is independent (AND-combined), so adding a filter narrows the
 * result set rather than replacing it.
 */
export function filterTrips(trips: TripPreview[], filters: TripFilters): TripPreview[] {
  return trips.filter(
    (trip) =>
      matchesQuery(trip, filters.query) &&
      matchesStyles(trip, filters.styles) &&
      matchesMonth(trip, filters.month) &&
      (filters.duration === null || matchesDuration(trip.durationNights, filters.duration)) &&
      (filters.budget === null || matchesBudget(trip.price.amount, filters.budget)),
  );
}
