/**
 * Booking & order domain — Phase 4.4.
 *
 * Real local-database integration tests, not mocks (this project's own
 * convention — see tests/integration/trip-content-schema.test.ts). No
 * `lib/booking/repository.ts` exists to call (deliberately — no
 * booking-creation flow exists yet this phase), so every write here goes
 * directly through a service-role client, exactly the path a future
 * booking Server Action would use after its own authorization check.
 *
 * Skips — does not fail — when no reachable, migrated database is
 * configured (`NEXT_PUBLIC_SUPABASE_URL` / `NEXT_PUBLIC_SUPABASE_ANON_KEY`
 * / `SUPABASE_SERVICE_ROLE_KEY`, or `.env.local`).
 */
import { existsSync, readFileSync } from 'node:fs';
import { resolve } from 'node:path';

import { createClient } from '@supabase/supabase-js';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';

function loadDotEnvLocal(): void {
  const path = resolve(process.cwd(), '.env.local');
  if (!existsSync(path)) return;

  for (const line of readFileSync(path, 'utf8').split('\n')) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#')) continue;
    const eq = trimmed.indexOf('=');
    if (eq === -1) continue;
    const key = trimmed.slice(0, eq).trim();
    let value = trimmed.slice(eq + 1).trim();
    if (
      (value.startsWith('"') && value.endsWith('"')) ||
      (value.startsWith("'") && value.endsWith("'"))
    ) {
      value = value.slice(1, -1);
    }
    if (process.env[key] === undefined) process.env[key] = value;
  }
}

loadDotEnvLocal();

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
const hasCredentials = Boolean(url && anonKey && serviceRoleKey);

let isReachable = false;
if (hasCredentials) {
  const admin = createClient(url!, serviceRoleKey!, {
    auth: { autoRefreshToken: false, persistSession: false, detectSessionInUrl: false },
  });
  try {
    const { error } = await admin.from('bookings').select('id').limit(1);
    isReachable = !error;
  } catch {
    isReachable = false;
  }
}

interface DepartureRow {
  id: string;
  capacity: number;
  seats_reserved: number;
  seats_confirmed: number;
}

interface BookingRow {
  id: string;
  reference: string;
  status: string;
  participant_count: number;
  snapshot_trip_title: string;
  snapshot_departure_date: string;
  snapshot_price_amount: string | number;
  snapshot_price_currency: string;
}

describe.skipIf(!hasCredentials || !isReachable)('booking domain', () => {
  const admin = createClient(url!, serviceRoleKey!, {
    auth: { autoRefreshToken: false, persistSession: false, detectSessionInUrl: false },
  });
  const anon = createClient(url!, anonKey!, {
    auth: { autoRefreshToken: false, persistSession: false, detectSessionInUrl: false },
  });

  const runId = Date.now().toString(36);
  const tripSlug = `test-booking-domain-${runId}`;
  let tripId: string;
  let departureId: string;

  function bookingInput(overrides: Partial<Record<string, unknown>> = {}) {
    return {
      trip_departure_id: departureId,
      contact_name: 'Smoke Test Traveller',
      contact_email: `traveller-${runId}@example.test`,
      participant_count: 1,
      snapshot_trip_title: 'Test Booking Domain Trip',
      snapshot_trip_slug: tripSlug,
      snapshot_destination: 'Testland',
      snapshot_departure_date: '2099-06-01',
      snapshot_price_amount: 1000,
      snapshot_price_currency: 'INR',
      ...overrides,
    };
  }

  beforeAll(async () => {
    const { data: trip, error: tripError } = await admin
      .from('trips')
      .insert({
        slug: tripSlug,
        title: 'Test Booking Domain Trip',
        destination: 'Testland',
        country: 'Testland',
        duration_nights: 3,
        overview: 'Created only to exercise the Phase 4.4 booking domain.',
        content_status: 'published',
        published_at: new Date().toISOString(),
      })
      .select('id')
      .single();
    if (tripError || !trip) throw new Error(`setup trip: ${tripError?.message}`);
    tripId = (trip as { id: string }).id;

    const { data: departure, error: departureError } = await admin
      .from('trip_departures')
      .insert({
        trip_id: tripId,
        departure_date: '2099-06-01',
        price_amount: 1000,
        price_currency: 'INR',
        // Generous on purpose: most tests below share this one departure
        // and are not themselves testing capacity limits — a low number
        // here just risks exhausting it if an earlier test's assertion
        // throws before its own cleanup runs. Capacity-limit behavior gets
        // its own dedicated, tightly-capacitated departure further down
        // ("prevents overbooking under concurrent requests").
        capacity: 100,
        status: 'booking_open',
      })
      .select('id')
      .single();
    if (departureError || !departure)
      throw new Error(`setup departure: ${departureError?.message}`);
    departureId = (departure as { id: string }).id;
  });

  afterAll(async () => {
    if (tripId) await admin.from('trips').delete().eq('id', tripId);
  });

  it('creates a booking, always starting pending, with a generated unique reference', async () => {
    const { data, error } = await admin
      .from('bookings')
      .insert(bookingInput())
      .select('id, reference, status')
      .single();
    expect(error).toBeNull();
    const row = data as BookingRow;
    expect(row.status).toBe('pending');
    expect(row.reference).toMatch(/^WWS-[A-Z0-9]{8}$/);

    await admin.from('bookings').delete().eq('id', row.id);
  });

  it('rejects an explicit non-pending status on insert', async () => {
    const { error } = await admin.from('bookings').insert(bookingInput({ status: 'confirmed' }));
    expect(error).not.toBeNull();
  });

  it('two bookings never collide on the generated reference', async () => {
    const { data: a } = await admin
      .from('bookings')
      .insert(bookingInput())
      .select('reference')
      .single();
    const { data: b } = await admin
      .from('bookings')
      .insert(bookingInput())
      .select('reference')
      .single();
    expect((a as { reference: string }).reference).not.toBe((b as { reference: string }).reference);

    await admin
      .from('bookings')
      .delete()
      .eq('reference', (a as { reference: string }).reference);
    await admin
      .from('bookings')
      .delete()
      .eq('reference', (b as { reference: string }).reference);
  });

  it('persists the commercial snapshot exactly as submitted', async () => {
    const { data, error } = await admin
      .from('bookings')
      .insert(
        bookingInput({
          snapshot_trip_title: 'A Very Specific Snapshot Title',
          snapshot_price_amount: 12345.67,
        }),
      )
      .select('snapshot_trip_title, snapshot_price_amount, snapshot_price_currency')
      .single();
    expect(error).toBeNull();
    const row = data as BookingRow;
    expect(row.snapshot_trip_title).toBe('A Very Specific Snapshot Title');
    expect(Number(row.snapshot_price_amount)).toBe(12345.67);
    expect(row.snapshot_price_currency).toBe('INR');

    await admin
      .from('bookings')
      .delete()
      .eq('snapshot_trip_title', 'A Very Specific Snapshot Title');
  });

  it('rejects a non-positive snapshot price and a malformed currency', async () => {
    const badPrice = await admin
      .from('bookings')
      .insert(bookingInput({ snapshot_price_amount: 0 }));
    expect(badPrice.error).not.toBeNull();

    const badCurrency = await admin
      .from('bookings')
      .insert(bookingInput({ snapshot_price_currency: 'inr' }));
    expect(badCurrency.error).not.toBeNull();
  });

  it('rejects an invalid booking status value entirely', async () => {
    const { error } = await admin
      .from('bookings')
      .insert(bookingInput({ status: 'not_a_real_status' }));
    expect(error).not.toBeNull();
  });

  it('stores participants separately, supporting a group booking', async () => {
    const { data: booking } = await admin
      .from('bookings')
      .insert(bookingInput({ participant_count: 2 }))
      .select('id')
      .single();
    const bookingId = (booking as { id: string }).id;

    const { error } = await admin.from('booking_participants').insert([
      { booking_id: bookingId, full_name: 'Lead Traveller', is_lead: true },
      // `is_lead` set explicitly on every row, not omitted here: PostgREST
      // builds one INSERT statement across a whole array, so a key present
      // on one object but absent on another becomes an explicit `null` for
      // the rows missing it — not "fall back to the column default" — and
      // `is_lead` is `not null`.
      { booking_id: bookingId, full_name: 'Second Traveller', is_lead: false },
    ]);
    expect(error).toBeNull();

    const { data: participants } = await admin
      .from('booking_participants')
      .select('full_name, is_lead')
      .eq('booking_id', bookingId);
    expect(participants).toHaveLength(2);

    await admin.from('bookings').delete().eq('id', bookingId);
  });

  it('rejects a second participant marked as lead on the same booking', async () => {
    const { data: booking } = await admin
      .from('bookings')
      .insert(bookingInput())
      .select('id')
      .single();
    const bookingId = (booking as { id: string }).id;

    await admin
      .from('booking_participants')
      .insert({ booking_id: bookingId, full_name: 'Lead One', is_lead: true });
    const { error } = await admin
      .from('booking_participants')
      .insert({ booking_id: bookingId, full_name: 'Lead Two', is_lead: true });
    expect(error).not.toBeNull();

    await admin.from('bookings').delete().eq('id', bookingId);
  });

  it('links a payment to a booking, keeping amount/currency/status constrained', async () => {
    const { data: booking } = await admin
      .from('bookings')
      .insert(bookingInput())
      .select('id')
      .single();
    const bookingId = (booking as { id: string }).id;

    const { error } = await admin.from('payments').insert({
      booking_id: bookingId,
      provider: 'test-provider',
      provider_reference: `ref-${runId}-1`,
      amount: 1000,
      currency: 'INR',
    });
    expect(error).toBeNull();

    const badAmount = await admin.from('payments').insert({
      booking_id: bookingId,
      provider: 'test-provider',
      amount: -5,
      currency: 'INR',
    });
    expect(badAmount.error).not.toBeNull();

    await admin.from('payments').delete().eq('booking_id', bookingId);
    await admin.from('bookings').delete().eq('id', bookingId);
  });

  it('rejects a duplicate provider+reference pair (webhook idempotency)', async () => {
    const { data: booking } = await admin
      .from('bookings')
      .insert(bookingInput())
      .select('id')
      .single();
    const bookingId = (booking as { id: string }).id;
    const ref = `dup-ref-${runId}`;

    const first = await admin.from('payments').insert({
      booking_id: bookingId,
      provider: 'test-provider',
      provider_reference: ref,
      amount: 1000,
      currency: 'INR',
    });
    expect(first.error).toBeNull();

    const second = await admin.from('payments').insert({
      booking_id: bookingId,
      provider: 'test-provider',
      provider_reference: ref,
      amount: 1000,
      currency: 'INR',
    });
    expect(second.error).not.toBeNull();

    await admin.from('payments').delete().eq('booking_id', bookingId);
    await admin.from('bookings').delete().eq('id', bookingId);
  });

  it('allows two different providers to independently use the same reference string', async () => {
    const { data: booking } = await admin
      .from('bookings')
      .insert(bookingInput())
      .select('id')
      .single();
    const bookingId = (booking as { id: string }).id;
    const ref = `shared-ref-${runId}`;

    const razorpay = await admin.from('payments').insert({
      booking_id: bookingId,
      provider: 'razorpay',
      provider_reference: ref,
      amount: 1000,
      currency: 'INR',
    });
    expect(razorpay.error).toBeNull();

    const stripe = await admin.from('payments').insert({
      booking_id: bookingId,
      provider: 'stripe',
      provider_reference: ref,
      amount: 1000,
      currency: 'INR',
    });
    expect(stripe.error).toBeNull();

    await admin.from('payments').delete().eq('booking_id', bookingId);
    await admin.from('bookings').delete().eq('id', bookingId);
  });

  it('rejects every direct anonymous access to bookings, participants and payments', async () => {
    const { data: booking } = await admin
      .from('bookings')
      .insert(bookingInput())
      .select('id')
      .single();
    const bookingId = (booking as { id: string }).id;

    const readBookings = await anon.from('bookings').select('id').eq('id', bookingId);
    expect(readBookings.data).toHaveLength(0);

    const writeAttempt = await anon.from('bookings').insert(bookingInput());
    expect(writeAttempt.error).not.toBeNull();

    const readPayments = await anon.from('payments').select('id').eq('booking_id', bookingId);
    expect(readPayments.data).toHaveLength(0);

    const readParticipants = await anon
      .from('booking_participants')
      .select('id')
      .eq('booking_id', bookingId);
    expect(readParticipants.data).toHaveLength(0);

    await admin.from('bookings').delete().eq('id', bookingId);
  });

  it('applies the full booking status lifecycle and moves seats accordingly', async () => {
    const { data: booking } = await admin
      .from('bookings')
      .insert(bookingInput({ participant_count: 2 }))
      .select('id, trip_departure_id')
      .single();
    const bookingId = (booking as { id: string; trip_departure_id: string }).id;

    let departure = (
      await admin
        .from('trip_departures')
        .select('capacity, seats_reserved, seats_confirmed')
        .eq('id', departureId)
        .single()
    ).data as DepartureRow;
    expect(departure.seats_reserved).toBeGreaterThanOrEqual(2);

    const invalidJump = await admin
      .from('bookings')
      .update({ status: 'completed' })
      .eq('id', bookingId);
    expect(invalidJump.error).not.toBeNull();

    const confirm = await admin
      .from('bookings')
      .update({ status: 'confirmed' })
      .eq('id', bookingId);
    expect(confirm.error).toBeNull();

    departure = (
      await admin
        .from('trip_departures')
        .select('capacity, seats_reserved, seats_confirmed')
        .eq('id', departureId)
        .single()
    ).data as DepartureRow;
    expect(departure.seats_confirmed).toBeGreaterThanOrEqual(2);

    const cancel = await admin.from('bookings').update({ status: 'cancelled' }).eq('id', bookingId);
    expect(cancel.error).toBeNull();

    const afterCancel = await admin.from('bookings').select('status').eq('id', bookingId).single();
    expect((afterCancel.data as { status: string }).status).toBe('cancelled');

    await admin.from('bookings').delete().eq('id', bookingId);
  });

  it('prevents overbooking under concurrent requests for the last seats', async () => {
    const { data: tightDeparture } = await admin
      .from('trip_departures')
      .insert({
        trip_id: tripId,
        departure_date: '2099-07-01',
        price_amount: 1000,
        price_currency: 'INR',
        capacity: 2,
        status: 'booking_open',
      })
      .select('id')
      .single();
    const tightDepartureId = (tightDeparture as { id: string }).id;

    // Five concurrent single-seat booking attempts against a 2-seat
    // departure — the atomic `bookings_reserve_seats` UPDATE (see the
    // migration) must let exactly 2 succeed and reject the other 3,
    // regardless of arrival order.
    const attempts = await Promise.allSettled(
      Array.from({ length: 5 }, () =>
        admin
          .from('bookings')
          .insert(
            bookingInput({
              trip_departure_id: tightDepartureId,
              participant_count: 1,
            }),
          )
          .select('id')
          .single()
          .then(({ data, error }) => {
            if (error) throw error;
            return data as { id: string };
          }),
      ),
    );

    const succeeded = attempts.filter((r) => r.status === 'fulfilled');
    const failed = attempts.filter((r) => r.status === 'rejected');
    expect(succeeded).toHaveLength(2);
    expect(failed).toHaveLength(3);

    const { data: finalDeparture } = await admin
      .from('trip_departures')
      .select('capacity, seats_reserved')
      .eq('id', tightDepartureId)
      .single();
    const row = finalDeparture as DepartureRow;
    expect(row.seats_reserved).toBe(row.capacity);
    expect(row.seats_reserved).toBeLessThanOrEqual(row.capacity);

    for (const result of succeeded) {
      if (result.status === 'fulfilled') {
        await admin.from('bookings').delete().eq('id', result.value.id);
      }
    }
    await admin.from('trip_departures').delete().eq('id', tightDepartureId);
  });

  it('keeps the booking and its snapshot intact even after the underlying trip content changes', async () => {
    const { data: booking } = await admin
      .from('bookings')
      .insert(bookingInput({ snapshot_trip_title: 'Original Title At Booking Time' }))
      .select('id')
      .single();
    const bookingId = (booking as { id: string }).id;

    await admin.from('trips').update({ title: 'Retitled After Booking' }).eq('id', tripId);

    const { data: afterEdit } = await admin
      .from('bookings')
      .select('snapshot_trip_title')
      .eq('id', bookingId)
      .single();
    expect((afterEdit as { snapshot_trip_title: string }).snapshot_trip_title).toBe(
      'Original Title At Booking Time',
    );

    // Restore the trip's title for any later test/cleanup in this file.
    await admin.from('trips').update({ title: 'Test Booking Domain Trip' }).eq('id', tripId);
    await admin.from('bookings').delete().eq('id', bookingId);
  });
});

describe.skipIf(hasCredentials && isReachable)('booking domain (unreachable)', () => {
  it('is skipped: no reachable, migrated Supabase database is configured', () => {
    expect(true).toBe(true);
  });
});
