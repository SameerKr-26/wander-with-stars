import { describe, expect, it, vi } from 'vitest';

/**
 * `lib/dashboard/repository.ts`, tested with a mocked session-aware
 * Supabase client — mirrors `tests/unit/booking-repository.test.ts`'s own
 * approach. `tests/integration/traveller-dashboard.test.ts` covers the
 * same RLS-backed guarantees again, for real, against a reachable local
 * database.
 */

vi.mock('server-only', () => ({}));

const orderMock = vi.fn();
const maybeSingleMock = vi.fn();

vi.mock('@/lib/supabase/server', () => ({
  createClient: async () => ({
    from: () => ({
      select: () => ({
        eq: (_column: string, _value: string) => ({
          order: orderMock,
          maybeSingle: maybeSingleMock,
        }),
      }),
    }),
  }),
}));

const BASE_ROW = {
  id: 'booking-1',
  reference: 'WWS-ABCD1234',
  status: 'confirmed' as const,
  participant_count: 2,
  snapshot_trip_title: 'Thailand Full Moon Party',
  snapshot_trip_slug: 'thailand-full-moon-party',
  snapshot_destination: 'Phuket, Krabi & Koh Phangan',
  snapshot_departure_date: '2026-11-01',
  snapshot_return_date: '2026-11-07',
  snapshot_price_amount: 49999,
  snapshot_price_currency: 'INR',
  created_at: '2026-10-01T00:00:00Z',
  traveller_id: 'traveller-1',
  payments: [{ status: 'succeeded' as const, created_at: '2026-10-01T01:00:00Z' }],
};

describe('fetchTravellerBookingGroups', () => {
  it('maps rows to summaries and groups them, with the authoritative payment status', async () => {
    orderMock.mockResolvedValue({ data: [BASE_ROW], error: null });

    const { fetchTravellerBookingGroups } = await import('@/lib/dashboard/repository');
    const groups = await fetchTravellerBookingGroups('traveller-1');

    expect(groups.upcoming).toHaveLength(1);
    expect(groups.upcoming[0]).toMatchObject({
      id: 'booking-1',
      reference: 'WWS-ABCD1234',
      paymentStatus: 'succeeded',
      snapshotPriceAmount: 49999,
    });
  });

  it('excludes a row whose traveller_id does not match, even if the query somehow returned it', async () => {
    orderMock.mockResolvedValue({
      data: [BASE_ROW, { ...BASE_ROW, id: 'booking-2', traveller_id: 'someone-else' }],
      error: null,
    });

    const { fetchTravellerBookingGroups } = await import('@/lib/dashboard/repository');
    const groups = await fetchTravellerBookingGroups('traveller-1');

    const allIds = [...groups.upcoming, ...groups.past, ...groups.cancelled].map((b) => b.id);
    expect(allIds).toEqual(['booking-1']);
  });

  it('returns empty groups on a query error, never throws', async () => {
    orderMock.mockResolvedValue({ data: null, error: { message: 'boom' } });

    const { fetchTravellerBookingGroups } = await import('@/lib/dashboard/repository');
    const groups = await fetchTravellerBookingGroups('traveller-1');

    expect(groups).toEqual({ upcoming: [], past: [], cancelled: [] });
  });

  it('reports no payment yet when the booking has no payment rows', async () => {
    orderMock.mockResolvedValue({ data: [{ ...BASE_ROW, payments: [] }], error: null });

    const { fetchTravellerBookingGroups } = await import('@/lib/dashboard/repository');
    const groups = await fetchTravellerBookingGroups('traveller-1');

    expect(groups.upcoming[0]?.paymentStatus).toBeNull();
  });
});

describe('fetchTravellerBookingDetail', () => {
  it('returns full detail, including participants, for the owning traveller', async () => {
    maybeSingleMock.mockResolvedValue({
      data: {
        ...BASE_ROW,
        contact_name: 'Jane Traveller',
        contact_email: 'jane@example.test',
        contact_phone: null,
        booking_participants: [
          { id: 'p1', full_name: 'Jane Traveller', is_lead: true },
          { id: 'p2', full_name: 'John Traveller', is_lead: false },
        ],
      },
      error: null,
    });

    const { fetchTravellerBookingDetail } = await import('@/lib/dashboard/repository');
    const detail = await fetchTravellerBookingDetail('booking-1', 'traveller-1');

    expect(detail?.id).toBe('booking-1');
    expect(detail?.contactName).toBe('Jane Traveller');
    expect(detail?.participants).toHaveLength(2);
    expect(detail?.participants[0]).toEqual({ id: 'p1', fullName: 'Jane Traveller', isLead: true });
  });

  it('returns null when the row belongs to a different traveller — independent of RLS', async () => {
    maybeSingleMock.mockResolvedValue({
      data: {
        ...BASE_ROW,
        traveller_id: 'someone-else',
        contact_name: 'Jane Traveller',
        contact_email: 'jane@example.test',
        contact_phone: null,
        booking_participants: [],
      },
      error: null,
    });

    const { fetchTravellerBookingDetail } = await import('@/lib/dashboard/repository');
    const detail = await fetchTravellerBookingDetail('booking-1', 'traveller-1');

    expect(detail).toBeNull();
  });

  it('returns null when the booking does not exist', async () => {
    maybeSingleMock.mockResolvedValue({ data: null, error: null });

    const { fetchTravellerBookingDetail } = await import('@/lib/dashboard/repository');
    const detail = await fetchTravellerBookingDetail('nonexistent', 'traveller-1');

    expect(detail).toBeNull();
  });
});
