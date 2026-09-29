import { describe, expect, it } from 'vitest';

import { getDepartureOptions } from '@/lib/content/departures';
import type { TripDetail } from '@/lib/content/types';

const BASE: TripDetail = {
  id: 'trip-1',
  slug: 'test-trip',
  title: 'Test Trip',
  destination: 'Testland',
  country: 'Testland',
  departureDate: '2026-06-01',
  durationNights: 5,
  price: { amount: 10000, currency: 'INR' },
  availability: { status: 'open' },
  heroMedia: { kind: 'placeholder' },
  styleScores: {},
  overview: 'Overview.',
  inclusions: [],
  exclusions: [],
  gallery: [],
  itineraryPreview: [],
};

describe('getDepartureOptions', () => {
  it('derives exactly one option from the top-level fields when no departures array exists (fixtures mode)', () => {
    const options = getDepartureOptions(BASE);
    expect(options).toEqual([
      {
        id: 'trip-1',
        departureDate: '2026-06-01',
        price: { amount: 10000, currency: 'INR' },
        availability: { status: 'open' },
      },
    ]);
  });

  it('returns the real departures array untouched when one exists (database mode, multi-departure)', () => {
    const withDepartures: TripDetail = {
      ...BASE,
      departures: [
        {
          id: 'dep-a',
          departureDate: '2026-06-01',
          price: { amount: 10000, currency: 'INR' },
          availability: { status: 'open' },
        },
        {
          id: 'dep-b',
          departureDate: '2026-07-01',
          price: { amount: 12000, currency: 'INR' },
          availability: { status: 'open' },
        },
      ],
    };
    expect(getDepartureOptions(withDepartures)).toBe(withDepartures.departures);
    expect(getDepartureOptions(withDepartures)).toHaveLength(2);
  });
});
