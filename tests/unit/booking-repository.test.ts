import { describe, expect, it, vi } from 'vitest';

/**
 * `lib/booking/repository.ts`, tested with mocked Supabase clients — no
 * live database needed, and `server-only` never actually executes, since
 * `vi.mock` replaces `lib/supabase/admin.ts`/`server.ts` before either
 * would be imported for real. Mirrors the same mocking approach
 * `tests/unit/content-queries-db.test.ts` already established for
 * `lib/content/queries.ts`'s database branch.
 * `tests/integration/booking-flow.test.ts` covers the same guarantees
 * again, for real, against a reachable local database.
 */

vi.mock('server-only', () => ({}));

const rpc = vi.fn();
vi.mock('@/lib/supabase/admin', () => ({
  createAdminClient: () => ({ rpc }),
}));

const maybeSingle = vi.fn();
vi.mock('@/lib/supabase/server', () => ({
  createClient: async () => ({
    from: () => ({
      select: () => ({
        eq: () => ({ maybeSingle }),
      }),
    }),
  }),
}));

describe('fetchBookableDepartureSummary', () => {
  it('maps a found, priced departure to a display summary', async () => {
    maybeSingle.mockResolvedValue({
      data: {
        departure_date: '2026-10-25',
        return_date: '2026-10-31',
        price_amount: 49999,
        price_currency: 'INR',
        status: 'booking_open',
        capacity: 20,
        seats_reserved: 5,
        trips: {
          id: 'trip-1',
          title: 'Thailand Full Moon Party',
          slug: 'thailand-full-moon-party',
          destination: 'Phuket, Krabi & Koh Phangan',
          duration_nights: 6,
        },
      },
      error: null,
    });

    const { fetchBookableDepartureSummary } = await import('@/lib/booking/repository');
    const summary = await fetchBookableDepartureSummary('dep-1');

    expect(summary).toEqual({
      tripId: 'trip-1',
      tripTitle: 'Thailand Full Moon Party',
      tripSlug: 'thailand-full-moon-party',
      destination: 'Phuket, Krabi & Koh Phangan',
      durationNights: 6,
      departureDate: '2026-10-25',
      returnDate: '2026-10-31',
      priceAmount: 49999,
      priceCurrency: 'INR',
      status: 'booking_open',
      seatsLeft: 15,
    });
  });

  it('returns null for a departure that does not exist', async () => {
    maybeSingle.mockResolvedValue({ data: null, error: null });
    const { fetchBookableDepartureSummary } = await import('@/lib/booking/repository');
    expect(await fetchBookableDepartureSummary('missing')).toBeNull();
  });

  it('returns null for a departure whose trip is RLS-hidden (no nested trips row)', async () => {
    maybeSingle.mockResolvedValue({
      data: {
        departure_date: '2026-10-25',
        return_date: null,
        price_amount: 49999,
        price_currency: 'INR',
        status: 'booking_open',
        capacity: null,
        seats_reserved: 0,
        trips: null,
      },
      error: null,
    });
    const { fetchBookableDepartureSummary } = await import('@/lib/booking/repository');
    expect(await fetchBookableDepartureSummary('hidden')).toBeNull();
  });

  it('returns null on a query error, without throwing', async () => {
    maybeSingle.mockResolvedValue({ data: null, error: { message: 'connection refused' } });
    const { fetchBookableDepartureSummary } = await import('@/lib/booking/repository');
    await expect(fetchBookableDepartureSummary('dep-1')).resolves.toBeNull();
  });

  it('reports null seatsLeft when capacity is unlimited (null)', async () => {
    maybeSingle.mockResolvedValue({
      data: {
        departure_date: '2026-10-25',
        return_date: null,
        price_amount: 49999,
        price_currency: 'INR',
        status: 'booking_open',
        capacity: null,
        seats_reserved: 5,
        trips: {
          id: 'trip-1',
          title: 'T',
          slug: 't',
          destination: 'D',
          duration_nights: 3,
        },
      },
      error: null,
    });
    const { fetchBookableDepartureSummary } = await import('@/lib/booking/repository');
    const summary = await fetchBookableDepartureSummary('dep-1');
    expect(summary?.seatsLeft).toBeNull();
  });
});

describe('createPendingBooking', () => {
  const baseInput = {
    tripDepartureId: '11111111-1111-4111-8111-111111111111',
    idempotencyKey: '22222222-2222-4222-8222-222222222222',
    contactName: 'A Traveller',
    contactEmail: 'traveller@example.com',
    contactPhone: undefined,
    participants: [{ fullName: 'A Traveller', isLead: true }],
    travellerId: null,
  };

  it('maps a successful RPC result to a safe booking result', async () => {
    rpc.mockResolvedValue({
      data: {
        reference: 'WWS-ABCDEFGH',
        status: 'pending',
        participant_count: 1,
        snapshot_trip_title: 'Thailand Full Moon Party',
        snapshot_destination: 'Phuket, Krabi & Koh Phangan',
        snapshot_departure_date: '2026-10-25',
        snapshot_return_date: '2026-10-31',
        snapshot_price_amount: 49999,
        snapshot_price_currency: 'INR',
        expires_at: '2026-09-29T18:00:00Z',
        created_at: '2026-09-29T17:30:00Z',
      },
      error: null,
    });

    const { createPendingBooking } = await import('@/lib/booking/repository');
    const result = await createPendingBooking(baseInput);

    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.booking.reference).toBe('WWS-ABCDEFGH');
      expect(result.booking.status).toBe('pending');
      expect(result.booking.participantCount).toBe(1);
    }
  });

  it('maps a known BOOKING_ERROR code to a typed error, never the raw message', async () => {
    rpc.mockResolvedValue({
      data: null,
      error: { message: 'BOOKING_ERROR: DEPARTURE_NOT_BOOKABLE' },
    });
    const { createPendingBooking } = await import('@/lib/booking/repository');
    const result = await createPendingBooking(baseInput);
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.errorCode).toBe('DEPARTURE_NOT_BOOKABLE');
  });

  it('maps the capacity-trigger message to INSUFFICIENT_CAPACITY', async () => {
    rpc.mockResolvedValue({
      data: null,
      error: { message: 'Not enough capacity on departure xyz for 2 seat(s)' },
    });
    const { createPendingBooking } = await import('@/lib/booking/repository');
    const result = await createPendingBooking(baseInput);
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.errorCode).toBe('INSUFFICIENT_CAPACITY');
  });

  it('collapses an unrecognized error to UNKNOWN, never leaking the raw message', async () => {
    rpc.mockResolvedValue({
      data: null,
      error: { message: 'relation "bookings" violates some internal constraint xyz123' },
    });
    const { createPendingBooking } = await import('@/lib/booking/repository');
    const result = await createPendingBooking(baseInput);
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.errorCode).toBe('UNKNOWN');
  });
});
