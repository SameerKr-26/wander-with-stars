/**
 * Pure formatting for trip content.
 *
 * Kept separate from both the data layer (queries.ts) and presentation
 * (components) so trip-card formatting logic has exactly one place to live
 * and can be unit-tested without rendering React.
 */

import type { AvailabilityStatus, TripPrice } from './types';

export function formatTripDate(iso: string): string {
  const date = new Date(iso);
  return new Intl.DateTimeFormat('en-IN', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  }).format(date);
}

export function formatPrice(price: TripPrice): string {
  return new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: price.currency,
    maximumFractionDigits: 0,
  }).format(price.amount);
}

export function formatDuration(nights: number): string {
  const days = nights + 1;
  return `${days}D/${nights}N`;
}

/**
 * Availability copy. Truthful only — docs/UX_INTERACTION_GUIDE.md §9: real
 * spot counts when known, no invented urgency otherwise.
 */
export function formatAvailability(status: AvailabilityStatus, spotsLeft?: number): string {
  if (status === 'sold-out') return 'Sold out';
  if (status === 'waitlisted') return 'Waitlist open';
  if (status === 'almost-full') {
    return spotsLeft !== undefined ? `Almost full · ${spotsLeft} spots left` : 'Almost full';
  }
  return spotsLeft !== undefined ? `${spotsLeft} spots left` : 'Open';
}

/** Top N style signals by score, for the card's secondary "atmosphere" line. */
export function topStyleSignals(
  scores: Partial<Record<string, number>>,
  count = 2,
): { signal: string; score: number }[] {
  return Object.entries(scores)
    .filter((entry): entry is [string, number] => typeof entry[1] === 'number')
    .sort((a, b) => b[1] - a[1])
    .slice(0, count)
    .map(([signal, score]) => ({ signal, score }));
}
