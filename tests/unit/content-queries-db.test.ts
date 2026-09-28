import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import type { TripDetailRow, TripRow } from '@/lib/content/db/schema';

/**
 * `lib/content/queries.ts`'s database branch, tested with a mocked
 * `lib/content/db/repository` — no live Supabase connection needed, and no
 * `server-only` import ever executes, since `vi.mock` replaces the whole
 * module before it would be loaded. This is what actually exercises "a
 * published trip resolves by slug", "an unpublished/missing trip does not",
 * and "a database failure surfaces as an error state" without depending on
 * a reachable database — `tests/integration/trip-content-schema.test.ts`
 * covers the same guarantees again, for real, against RLS, when one is
 * reachable.
 */

const HOST = {
  id: 'host-1',
  name: 'Test Host',
  tagline: null,
  avatar_kind: null,
  avatar_src: null,
  avatar_alt: null,
  avatar_poster: null,
};

function makeDeparture() {
  return {
    id: 'departure-1',
    departure_date: '2099-06-01',
    price_amount: 50000,
    price_currency: 'INR',
    capacity: 20,
    seats_reserved: 5,
    seats_confirmed: 5,
    status: 'booking_open' as const,
    guides: null,
    trip_accommodation: [],
    trip_transport: [],
    trip_meeting_points: null,
  };
}

function makeTripRow(overrides: Partial<TripRow> = {}): TripRow {
  return {
    id: 'trip-1',
    slug: 'published-trip',
    title: 'Published Trip',
    destination: 'Testland',
    country: 'Testland',
    duration_nights: 5,
    tagline: null,
    overview: 'A trip used only in tests.',
    style_scores: {},
    hosts: HOST,
    trip_media: [],
    trip_departures: [makeDeparture()],
    ...overrides,
  };
}

function makeTripDetailRow(overrides: Partial<TripDetailRow> = {}): TripDetailRow {
  return {
    ...makeTripRow(),
    overview: 'A trip used only in tests.',
    itinerary_days: [{ day_number: 1, title: 'Day one', summary: 'Arrival' }],
    trip_inclusions: [],
    trip_exclusions: [],
    trip_important_notes: [],
    trip_extras: [],
    trip_faqs: [],
    trip_policy_sections: [],
    ...overrides,
  };
}

const fetchTripPreviewRows = vi.fn();
const fetchTripDetailRowBySlug = vi.fn();

vi.mock('@/lib/content/db/repository', () => ({
  fetchTripPreviewRows: (...args: unknown[]) => fetchTripPreviewRows(...args),
  fetchTripDetailRowBySlug: (...args: unknown[]) => fetchTripDetailRowBySlug(...args),
}));

beforeEach(() => {
  vi.resetModules();
  fetchTripPreviewRows.mockReset();
  fetchTripDetailRowBySlug.mockReset();
  process.env.CONTENT_SOURCE = 'database';
});

afterEach(() => {
  delete process.env.CONTENT_SOURCE;
});

async function loadQueries() {
  return import('@/lib/content/queries');
}

describe('getUpcomingTrips (database source)', () => {
  it('resolves published trips with a presentable departure', async () => {
    fetchTripPreviewRows.mockResolvedValue([makeTripRow()]);
    const { getUpcomingTrips } = await loadQueries();
    const state = await getUpcomingTrips();
    expect(state.status).toBe('ready');
    if (state.status === 'ready') {
      expect(state.data).toHaveLength(1);
      expect(state.data[0]?.slug).toBe('published-trip');
    }
  });

  it('excludes a trip whose only departure is not presentable (e.g. draft)', async () => {
    fetchTripPreviewRows.mockResolvedValue([
      makeTripRow({ trip_departures: [{ ...makeDeparture(), status: 'draft' }] }),
    ]);
    const { getUpcomingTrips } = await loadQueries();
    const state = await getUpcomingTrips();
    expect(state.status).toBe('empty');
  });

  it('resolves to empty when no trips are visible at all', async () => {
    fetchTripPreviewRows.mockResolvedValue([]);
    const { getUpcomingTrips } = await loadQueries();
    const state = await getUpcomingTrips();
    expect(state.status).toBe('empty');
  });

  it('resolves to an error state, without leaking the underlying error, on a database failure', async () => {
    fetchTripPreviewRows.mockRejectedValue(new Error('relation "trips" does not exist'));
    const { getUpcomingTrips } = await loadQueries();
    const state = await getUpcomingTrips();
    expect(state.status).toBe('error');
    if (state.status === 'error') {
      expect(state.message).not.toContain('relation');
      expect(state.message).not.toContain('trips" does not exist');
    }
  });
});

describe('getTripBySlug (database source)', () => {
  it('resolves a published trip with a presentable departure', async () => {
    fetchTripDetailRowBySlug.mockResolvedValue(makeTripDetailRow());
    const { getTripBySlug } = await loadQueries();
    const state = await getTripBySlug('published-trip');
    expect(state.status).toBe('ready');
    if (state.status === 'ready') {
      expect(state.data.overview).toBe('A trip used only in tests.');
      expect(state.data.itineraryPreview).toEqual([
        { day: 1, title: 'Day one', summary: 'Arrival' },
      ]);
    }
  });

  it('resolves to empty for a slug the repository could not find (missing or RLS-hidden)', async () => {
    fetchTripDetailRowBySlug.mockResolvedValue(null);
    const { getTripBySlug } = await loadQueries();
    const state = await getTripBySlug('does-not-exist');
    expect(state.status).toBe('empty');
  });

  it('resolves to empty for a published trip with no presentable departure yet', async () => {
    fetchTripDetailRowBySlug.mockResolvedValue(
      makeTripDetailRow({ trip_departures: [{ ...makeDeparture(), status: 'published' }] }),
    );
    const { getTripBySlug } = await loadQueries();
    const state = await getTripBySlug('published-trip');
    expect(state.status).toBe('empty');
  });

  it('resolves to an error state on a database failure', async () => {
    fetchTripDetailRowBySlug.mockRejectedValue(new Error('connection refused'));
    const { getTripBySlug } = await loadQueries();
    const state = await getTripBySlug('published-trip');
    expect(state.status).toBe('error');
  });
});
