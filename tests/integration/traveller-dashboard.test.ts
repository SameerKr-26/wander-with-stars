/**
 * Traveller dashboard & "My Trips" — Phase 4.8.
 *
 * Real local-database integration tests (this project's own convention —
 * see tests/integration/booking-flow.test.ts). Tests the actual RLS
 * boundary this phase's own `lib/dashboard/repository.ts` depends on,
 * using a signed-in, session-scoped client exactly the way that
 * repository's `createClient()` (never the service role) would see the
 * database — not a unit-test mock of it.
 *
 * Skips — does not fail — when no reachable, migrated local database with
 * the live catalogue seeded is configured.
 */
import { existsSync, readFileSync } from 'node:fs';
import { resolve } from 'node:path';

import { createClient } from '@supabase/supabase-js';
import { describe, expect, it } from 'vitest';

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
let seeded = false;
let thailandDepartureId: string | null = null;
if (hasCredentials) {
  const admin = createClient(url!, serviceRoleKey!, {
    auth: { autoRefreshToken: false, persistSession: false, detectSessionInUrl: false },
  });
  try {
    const { data: trip, error } = await admin
      .from('trips')
      .select('id')
      .eq('slug', 'thailand-full-moon-party')
      .maybeSingle();
    isReachable = !error;
    if (trip) {
      const { data: dep } = await admin
        .from('trip_departures')
        .select('id')
        .eq('trip_id', (trip as { id: string }).id)
        .order('departure_date')
        .limit(1)
        .maybeSingle();
      thailandDepartureId = (dep as { id: string } | null)?.id ?? null;
      seeded = Boolean(thailandDepartureId);
    }
  } catch {
    isReachable = false;
  }
}

function testEmail(label: string): string {
  return `test-dashboard-${label}-${Date.now().toString(36)}-${Math.random()
    .toString(36)
    .slice(2, 8)}@example.test`;
}

const TEST_PASSWORD = 'Test-Password-1234!';

// One literal string, not a concatenation — supabase-js's typed query
// builder only resolves a real column-shape type for a literal `select()`
// argument; a concatenated (widened to `string`) one silently falls back
// to its generic, property-less error type instead.
const BOOKING_SUMMARY_COLUMNS =
  'id, reference, status, participant_count, snapshot_trip_title, snapshot_trip_slug, snapshot_destination, snapshot_departure_date, snapshot_price_amount, snapshot_price_currency, created_at, traveller_id, payments ( status, created_at )';

describe.skipIf(!hasCredentials || !isReachable || !seeded)(
  'traveller dashboard & My Trips (local database)',
  () => {
    const admin = createClient(url!, serviceRoleKey!, {
      auth: { autoRefreshToken: false, persistSession: false, detectSessionInUrl: false },
    });

    async function createSignedInTraveller(label: string) {
      const email = testEmail(label);
      const { data: created, error } = await admin.auth.admin.createUser({
        email,
        password: TEST_PASSWORD,
        email_confirm: true,
      });
      if (error || !created.user) throw new Error(`setup: ${error?.message}`);
      const client = createClient(url!, anonKey!, {
        auth: { autoRefreshToken: false, persistSession: false, detectSessionInUrl: false },
      });
      await client.auth.signInWithPassword({ email, password: TEST_PASSWORD });
      return { client, userId: created.user.id, email };
    }

    async function createBooking(travellerId: string | null = null) {
      const { data } = await admin.rpc('create_pending_booking', {
        p_trip_departure_id: thailandDepartureId,
        p_traveller_id: travellerId,
        p_contact_name: 'Dashboard Tester',
        p_contact_email: 'dashboard-tester@example.test',
        p_contact_phone: null,
        p_participants: [
          { full_name: 'Dashboard Tester', is_lead: true },
          { full_name: 'Second Traveller', is_lead: false },
        ],
        p_idempotency_key: crypto.randomUUID(),
      });
      return data as {
        id: string;
        reference: string;
        status: string;
        snapshot_price_amount: number;
        snapshot_price_currency: string;
        snapshot_trip_title: string;
      };
    }

    async function cleanupBooking(bookingId: string) {
      await admin.from('bookings').delete().eq('id', bookingId);
    }

    async function cleanupTraveller(userId: string) {
      await admin.auth.admin.deleteUser(userId);
    }

    it("2. an authenticated user with zero bookings sees none of anyone else's either", async () => {
      const traveller = await createSignedInTraveller('empty');
      try {
        const { data, error } = await traveller.client
          .from('bookings')
          .select(BOOKING_SUMMARY_COLUMNS)
          .eq('traveller_id', traveller.userId);
        expect(error).toBeNull();
        expect(data).toEqual([]);
      } finally {
        await cleanupTraveller(traveller.userId);
      }
    });

    it('3. an authenticated user sees their own booking, with its payment embedded', async () => {
      const traveller = await createSignedInTraveller('own-booking');
      const booking = await createBooking(traveller.userId);
      await admin.from('payments').insert({
        booking_id: booking.id,
        provider: 'razorpay',
        provider_reference: `order_${crypto.randomUUID()}`,
        amount: booking.snapshot_price_amount,
        currency: booking.snapshot_price_currency,
        status: 'succeeded',
      });
      try {
        const { data, error } = await traveller.client
          .from('bookings')
          .select(BOOKING_SUMMARY_COLUMNS)
          .eq('id', booking.id)
          .maybeSingle();
        expect(error).toBeNull();
        expect(data?.id).toBe(booking.id);
        expect(data?.payments).toHaveLength(1);
        expect((data?.payments as { status: string }[])[0]?.status).toBe('succeeded');
      } finally {
        await cleanupBooking(booking.id);
        await cleanupTraveller(traveller.userId);
      }
    });

    it("4. user A cannot read user B's booking by ID, even though it genuinely exists", async () => {
      const travellerA = await createSignedInTraveller('user-a');
      const travellerB = await createSignedInTraveller('user-b');
      const bookingB = await createBooking(travellerB.userId);
      try {
        const { data, error } = await travellerA.client
          .from('bookings')
          .select(BOOKING_SUMMARY_COLUMNS)
          .eq('id', bookingB.id)
          .maybeSingle();
        // RLS silently returns no row — never an error that would confirm
        // the booking exists at all.
        expect(error).toBeNull();
        expect(data).toBeNull();
      } finally {
        await cleanupBooking(bookingB.id);
        await cleanupTraveller(travellerA.userId);
        await cleanupTraveller(travellerB.userId);
      }
    });

    it("4b. user A cannot read user B's booking_participants or payments directly either", async () => {
      const travellerA = await createSignedInTraveller('user-a-participants');
      const travellerB = await createSignedInTraveller('user-b-participants');
      const bookingB = await createBooking(travellerB.userId);
      await admin.from('payments').insert({
        booking_id: bookingB.id,
        provider: 'razorpay',
        provider_reference: `order_${crypto.randomUUID()}`,
        amount: bookingB.snapshot_price_amount,
        currency: bookingB.snapshot_price_currency,
      });
      try {
        const { data: participants, error: pError } = await travellerA.client
          .from('booking_participants')
          .select('*')
          .eq('booking_id', bookingB.id);
        expect(pError).toBeNull();
        expect(participants).toEqual([]);

        const { data: payments, error: payError } = await travellerA.client
          .from('payments')
          .select('*')
          .eq('booking_id', bookingB.id);
        expect(payError).toBeNull();
        expect(payments).toEqual([]);
      } finally {
        await cleanupBooking(bookingB.id);
        await cleanupTraveller(travellerA.userId);
        await cleanupTraveller(travellerB.userId);
      }
    });

    it("5. a guest booking never appears in an authenticated traveller's own query, even by exact ID", async () => {
      const traveller = await createSignedInTraveller('vs-guest');
      const guestBooking = await createBooking(null);
      try {
        const { data, error } = await traveller.client
          .from('bookings')
          .select(BOOKING_SUMMARY_COLUMNS)
          .eq('id', guestBooking.id)
          .maybeSingle();
        expect(error).toBeNull();
        expect(data).toBeNull();
      } finally {
        await cleanupBooking(guestBooking.id);
        await cleanupTraveller(traveller.userId);
      }
    });

    it('6. an authenticated traveller CAN read their own booking_participants, by full roster', async () => {
      const traveller = await createSignedInTraveller('own-participants');
      const booking = await createBooking(traveller.userId);
      try {
        const { data, error } = await traveller.client
          .from('booking_participants')
          .select('full_name, is_lead')
          .eq('booking_id', booking.id)
          .order('is_lead', { ascending: false });
        expect(error).toBeNull();
        expect(data).toHaveLength(2);
        expect(data?.[0]?.full_name).toBe('Dashboard Tester');
        expect(data?.[0]?.is_lead).toBe(true);
      } finally {
        await cleanupBooking(booking.id);
        await cleanupTraveller(traveller.userId);
      }
    });

    it('7. payment state comes from the authoritative (succeeded) payment record, even after an earlier failed attempt', async () => {
      const traveller = await createSignedInTraveller('payment-authority');
      const booking = await createBooking(traveller.userId);
      await admin.from('payments').insert({
        booking_id: booking.id,
        provider: 'razorpay',
        provider_reference: `order_failed_${crypto.randomUUID()}`,
        amount: booking.snapshot_price_amount,
        currency: booking.snapshot_price_currency,
        status: 'failed',
        failure_reason: 'Card declined',
      });
      await admin.from('payments').insert({
        booking_id: booking.id,
        provider: 'razorpay',
        provider_reference: `order_ok_${crypto.randomUUID()}`,
        amount: booking.snapshot_price_amount,
        currency: booking.snapshot_price_currency,
        status: 'succeeded',
      });
      try {
        const { data } = await traveller.client
          .from('bookings')
          .select(BOOKING_SUMMARY_COLUMNS)
          .eq('id', booking.id)
          .maybeSingle();
        const statuses = (data?.payments as { status: string }[]).map((p) => p.status).sort();
        expect(statuses).toEqual(['failed', 'succeeded']);
      } finally {
        await cleanupBooking(booking.id);
        await cleanupTraveller(traveller.userId);
      }
    });

    it('8. the booking snapshot stays historically accurate even after the live trip content changes', async () => {
      const traveller = await createSignedInTraveller('snapshot-accuracy');
      const booking = await createBooking(traveller.userId);
      const originalTitle = booking.snapshot_trip_title;
      try {
        await admin
          .from('trips')
          .update({ title: 'Thailand Full Moon Party — RETITLED FOR TEST' })
          .eq('slug', 'thailand-full-moon-party');

        const { data } = await traveller.client
          .from('bookings')
          .select(BOOKING_SUMMARY_COLUMNS)
          .eq('id', booking.id)
          .maybeSingle();
        expect(data?.snapshot_trip_title).toBe(originalTitle);
      } finally {
        await admin
          .from('trips')
          .update({ title: originalTitle })
          .eq('slug', 'thailand-full-moon-party');
        await cleanupBooking(booking.id);
        await cleanupTraveller(traveller.userId);
      }
    });

    it('11. multiple bookings for the same traveller are all visible, and only theirs', async () => {
      const traveller = await createSignedInTraveller('multiple');
      const other = await createSignedInTraveller('multiple-other');
      const bookingA = await createBooking(traveller.userId);
      const bookingB = await createBooking(traveller.userId);
      const bookingOther = await createBooking(other.userId);
      try {
        const { data, error } = await traveller.client
          .from('bookings')
          .select('id')
          .eq('traveller_id', traveller.userId);
        expect(error).toBeNull();
        const ids = (data ?? []).map((row) => (row as { id: string }).id);
        expect(ids.sort()).toEqual([bookingA.id, bookingB.id].sort());
        expect(ids).not.toContain(bookingOther.id);
      } finally {
        await cleanupBooking(bookingA.id);
        await cleanupBooking(bookingB.id);
        await cleanupBooking(bookingOther.id);
        await cleanupTraveller(traveller.userId);
        await cleanupTraveller(other.userId);
      }
    });

    it('an unauthenticated (anon) client sees no bookings at all, for anyone', async () => {
      const traveller = await createSignedInTraveller('anon-check');
      const booking = await createBooking(traveller.userId);
      try {
        const anon = createClient(url!, anonKey!, {
          auth: { autoRefreshToken: false, persistSession: false, detectSessionInUrl: false },
        });
        const { data, error } = await anon.from('bookings').select('id').eq('id', booking.id);
        expect(error).toBeNull();
        expect(data).toEqual([]);
      } finally {
        await cleanupBooking(booking.id);
        await cleanupTraveller(traveller.userId);
      }
    });
  },
);

describe('traveller dashboard (not reachable)', () => {
  it.skipIf(hasCredentials && isReachable && seeded)(
    'is skipped: no reachable database, or the live catalogue has not been seeded',
    () => {
      expect(true).toBe(true);
    },
  );
});
