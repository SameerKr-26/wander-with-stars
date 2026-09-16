import { describe, expect, it } from 'vitest';

import {
  EMPTY_FILTERS,
  filterTrips,
  getAvailableMonths,
  hasActiveFilters,
  matchesBudget,
  matchesDuration,
} from '@/lib/content/filters';
import type { TripPreview } from '@/lib/content/types';

/**
 * Trip discovery filtering — pure functions, independent of any component.
 *
 * Trips are defined locally rather than imported from fixtures.ts, so these
 * tests describe filtering behaviour rather than whichever fixture trips
 * happen to exist, and stay correct as fixture data changes.
 */

function trip(overrides: Partial<TripPreview>): TripPreview {
  return {
    id: 'id',
    slug: 'slug',
    title: 'Title',
    destination: 'Destination',
    country: 'Country',
    departureDate: '2026-06-01',
    durationNights: 5,
    price: { amount: 50000, currency: 'INR' },
    availability: { status: 'open' },
    host: { name: 'Host' },
    heroMedia: { kind: 'placeholder' },
    styleScores: {},
    ...overrides,
  };
}

const vietnam = trip({
  id: 'v',
  slug: 'vietnam',
  title: 'Northern Vietnam',
  destination: 'Hanoi',
  country: 'Vietnam',
  departureDate: '2026-11-14',
  durationNights: 6,
  price: { amount: 68000, currency: 'INR' },
  styleScores: { adventure: 70, social: 85 },
});

const bali = trip({
  id: 'b',
  slug: 'bali',
  title: 'Bali Escape',
  destination: 'Ubud',
  country: 'Indonesia',
  departureDate: '2026-12-05',
  durationNights: 3,
  price: { amount: 40000, currency: 'INR' },
  styleScores: { relaxation: 75 },
});

const georgia = trip({
  id: 'g',
  slug: 'georgia',
  title: 'Georgia Adventure',
  destination: 'Tbilisi',
  country: 'Georgia',
  departureDate: '2027-01-18',
  durationNights: 9,
  price: { amount: 90000, currency: 'INR' },
  styleScores: { adventure: 90 },
});

const ALL = [vietnam, bali, georgia];

describe('EMPTY_FILTERS and hasActiveFilters', () => {
  it('starts with no active filters', () => {
    expect(hasActiveFilters(EMPTY_FILTERS)).toBe(false);
  });

  it('treats a whitespace-only query as inactive', () => {
    expect(hasActiveFilters({ ...EMPTY_FILTERS, query: '   ' })).toBe(false);
  });

  it('is active when any single field is set', () => {
    expect(hasActiveFilters({ ...EMPTY_FILTERS, query: 'bali' })).toBe(true);
    expect(hasActiveFilters({ ...EMPTY_FILTERS, styles: ['adventure'] })).toBe(true);
    expect(hasActiveFilters({ ...EMPTY_FILTERS, month: '2026-11' })).toBe(true);
    expect(hasActiveFilters({ ...EMPTY_FILTERS, duration: 'short' })).toBe(true);
    expect(hasActiveFilters({ ...EMPTY_FILTERS, budget: 'budget' })).toBe(true);
  });
});

describe('filterTrips — search', () => {
  it('returns everything when the query is empty', () => {
    expect(filterTrips(ALL, EMPTY_FILTERS)).toHaveLength(3);
  });

  it('matches by title, case-insensitively', () => {
    const result = filterTrips(ALL, { ...EMPTY_FILTERS, query: 'BALI' });
    expect(result).toEqual([bali]);
  });

  it('matches by destination', () => {
    const result = filterTrips(ALL, { ...EMPTY_FILTERS, query: 'tbilisi' });
    expect(result).toEqual([georgia]);
  });

  it('matches by country', () => {
    const result = filterTrips(ALL, { ...EMPTY_FILTERS, query: 'indonesia' });
    expect(result).toEqual([bali]);
  });

  it('returns nothing for a query matching no trip — never a fallback result', () => {
    expect(filterTrips(ALL, { ...EMPTY_FILTERS, query: 'antarctica' })).toEqual([]);
  });
});

describe('filterTrips — style', () => {
  it('matches trips with a positive score for the selected style', () => {
    const result = filterTrips(ALL, { ...EMPTY_FILTERS, styles: ['adventure'] });
    expect(result.map((t) => t.id).sort()).toEqual(['g', 'v']);
  });

  it('an empty styles array means "all styles", not "no styles"', () => {
    expect(filterTrips(ALL, { ...EMPTY_FILTERS, styles: [] })).toHaveLength(3);
  });

  it('a style with zero matches returns an empty result, not an invented one', () => {
    // Nothing in this fixture set scores 'party' or 'nature'.
    expect(filterTrips(ALL, { ...EMPTY_FILTERS, styles: ['party'] })).toEqual([]);
    expect(filterTrips(ALL, { ...EMPTY_FILTERS, styles: ['nature'] })).toEqual([]);
  });

  it('multiple selected styles are OR-combined', () => {
    const result = filterTrips(ALL, { ...EMPTY_FILTERS, styles: ['relaxation', 'adventure'] });
    expect(result).toHaveLength(3);
  });
});

describe('matchesDuration', () => {
  it('buckets short, medium and long correctly', () => {
    expect(matchesDuration(3, 'short')).toBe(true);
    expect(matchesDuration(3, 'medium')).toBe(false);
    expect(matchesDuration(6, 'medium')).toBe(true);
    expect(matchesDuration(9, 'long')).toBe(true);
    expect(matchesDuration(9, 'medium')).toBe(false);
  });

  it('is applied by filterTrips', () => {
    const result = filterTrips(ALL, { ...EMPTY_FILTERS, duration: 'short' });
    expect(result).toEqual([bali]);
  });
});

describe('matchesBudget', () => {
  it('buckets budget, mid and premium correctly', () => {
    expect(matchesBudget(40000, 'budget')).toBe(true);
    expect(matchesBudget(68000, 'mid')).toBe(true);
    expect(matchesBudget(90000, 'premium')).toBe(true);
    expect(matchesBudget(90000, 'budget')).toBe(false);
  });

  it('is applied by filterTrips', () => {
    const result = filterTrips(ALL, { ...EMPTY_FILTERS, budget: 'premium' });
    expect(result).toEqual([georgia]);
  });
});

describe('filterTrips — month', () => {
  it('matches trips departing in the given month', () => {
    const result = filterTrips(ALL, { ...EMPTY_FILTERS, month: '2026-11' });
    expect(result).toEqual([vietnam]);
  });

  it('a month with no departures returns an empty result', () => {
    expect(filterTrips(ALL, { ...EMPTY_FILTERS, month: '2030-01' })).toEqual([]);
  });
});

describe('filterTrips — combined filters', () => {
  it('AND-combines every active dimension', () => {
    // Only Georgia is both 'adventure' and 'premium' budget.
    const result = filterTrips(ALL, {
      ...EMPTY_FILTERS,
      styles: ['adventure'],
      budget: 'premium',
    });
    expect(result).toEqual([georgia]);
  });

  it('narrows to nothing when combined filters have no common match', () => {
    // Vietnam is 'adventure' but not 'short' duration.
    const result = filterTrips(ALL, {
      ...EMPTY_FILTERS,
      styles: ['adventure'],
      duration: 'short',
    });
    expect(result).toEqual([]);
  });

  it('clearing back to EMPTY_FILTERS restores every trip', () => {
    const narrowed = filterTrips(ALL, { ...EMPTY_FILTERS, query: 'bali' });
    expect(narrowed).toHaveLength(1);
    expect(filterTrips(ALL, EMPTY_FILTERS)).toHaveLength(3);
  });
});

describe('getAvailableMonths', () => {
  it('derives one option per distinct departure month, in order', () => {
    const months = getAvailableMonths(ALL);
    expect(months.map((m) => m.value)).toEqual(['2026-11', '2026-12', '2027-01']);
  });

  it('never offers a month with zero possible matches', () => {
    const months = getAvailableMonths(ALL);
    for (const month of months) {
      expect(filterTrips(ALL, { ...EMPTY_FILTERS, month: month.value }).length).toBeGreaterThan(0);
    }
  });

  it('produces a human-readable label', () => {
    const months = getAvailableMonths(ALL);
    expect(months[0]?.label).toBe('November 2026');
  });

  it('returns nothing for an empty trip list', () => {
    expect(getAvailableMonths([])).toEqual([]);
  });
});
