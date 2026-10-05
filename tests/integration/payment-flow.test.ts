/**
 * Payment integration & booking confirmation — Phase 4.7.
 *
 * Real local-database integration tests (this project's own convention —
 * see tests/integration/booking-flow.test.ts). Exercises
 * `record_payment_result()` and the `payments` table directly against a
 * reachable local database — the actual Razorpay Orders/Payments REST
 * calls (`lib/payments/razorpay.ts`) are NOT exercised here (no real
 * sandbox credentials exist in this environment — see this phase's final
 * report for the honest, explicit limitation); this suite instead proves
 * the trusted, server-side CONFIRMATION logic — the part this phase's own
 * "Critical principle" cares about most — end to end, for real.
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
  return `test-payment-${label}-${Date.now().toString(36)}-${Math.random()
    .toString(36)
    .slice(2, 8)}@example.test`;
}

const TEST_PASSWORD = 'Test-Password-1234!';

describe.skipIf(!hasCredentials || !isReachable || !seeded)(
  'payment integration & booking confirmation (local database)',
  () => {
    const admin = createClient(url!, serviceRoleKey!, {
      auth: { autoRefreshToken: false, persistSession: false, detectSessionInUrl: false },
    });

    async function createBooking(travellerId: string | null = null) {
      const { data } = await admin.rpc('create_pending_booking', {
        p_trip_departure_id: thailandDepartureId,
        p_traveller_id: travellerId,
        p_contact_name: 'Payment Tester',
        p_contact_email: 'payment-tester@example.test',
        p_contact_phone: null,
        p_participants: [{ full_name: 'Payment Tester', is_lead: true }],
        p_idempotency_key: crypto.randomUUID(),
      });
      return data as {
        id: string;
        reference: string;
        status: string;
        snapshot_price_amount: number;
        snapshot_price_currency: string;
      };
    }

    async function insertPendingPayment(bookingId: string, orderId: string, amount?: number) {
      const booking = await admin
        .from('bookings')
        .select('snapshot_price_amount, snapshot_price_currency')
        .eq('id', bookingId)
        .single();
      const { data } = await admin
        .from('payments')
        .insert({
          booking_id: bookingId,
          provider: 'razorpay',
          provider_reference: orderId,
          amount: amount ?? booking.data!.snapshot_price_amount,
          currency: booking.data!.snapshot_price_currency,
        })
        .select()
        .single();
      return data as { id: string; amount: number; currency: string };
    }

    async function cleanup(bookingId: string) {
      await admin.from('bookings').delete().eq('id', bookingId);
    }

    it('1. & 2. a pending payment can be created, correctly linked to its booking', async () => {
      const booking = await createBooking();
      try {
        const payment = await insertPendingPayment(booking.id, `order_${crypto.randomUUID()}`);
        expect(payment).toBeTruthy();
        const { data: linked } = await admin
          .from('payments')
          .select('booking_id')
          .eq('id', payment.id)
          .single();
        expect(linked?.booking_id).toBe(booking.id);
      } finally {
        await cleanup(booking.id);
      }
    });

    it('3. provider-order (provider, provider_reference) is unique', async () => {
      const booking = await createBooking();
      try {
        const orderId = `order_${crypto.randomUUID()}`;
        await insertPendingPayment(booking.id, orderId);
        const { error } = await admin.from('payments').insert({
          booking_id: booking.id,
          provider: 'razorpay',
          provider_reference: orderId,
          amount: booking.snapshot_price_amount,
          currency: booking.snapshot_price_currency,
        });
        expect(error).not.toBeNull();
      } finally {
        await cleanup(booking.id);
      }
    });

    it('4. provider-payment (provider, provider_payment_id) is unique', async () => {
      const bookingA = await createBooking();
      const bookingB = await createBooking();
      try {
        const orderA = `order_${crypto.randomUUID()}`;
        const orderB = `order_${crypto.randomUUID()}`;
        await insertPendingPayment(bookingA.id, orderA);
        await insertPendingPayment(bookingB.id, orderB);
        const paymentId = `pay_${crypto.randomUUID()}`;

        await admin.rpc('record_payment_result', {
          p_provider: 'razorpay',
          p_provider_order_id: orderA,
          p_provider_payment_id: paymentId,
          p_status: 'succeeded',
          p_reported_amount: bookingA.snapshot_price_amount,
          p_reported_currency: bookingA.snapshot_price_currency,
          p_failure_reason: null,
        });

        // Directly attempting to reuse the same provider_payment_id on a
        // different row violates the unique index.
        const { error } = await admin
          .from('payments')
          .update({ provider_payment_id: paymentId })
          .eq('provider', 'razorpay')
          .eq('provider_reference', orderB);
        expect(error).not.toBeNull();
      } finally {
        await cleanup(bookingA.id);
        await cleanup(bookingB.id);
      }
    });

    it('5. & 6. amount and currency are persisted exactly as derived from the booking', async () => {
      const booking = await createBooking();
      try {
        const payment = await insertPendingPayment(booking.id, `order_${crypto.randomUUID()}`);
        expect(Number(payment.amount)).toBe(booking.snapshot_price_amount);
        expect(payment.currency).toBe(booking.snapshot_price_currency);
      } finally {
        await cleanup(booking.id);
      }
    });

    it('7. & 13. & 14. & 17. a successful payment confirms the booking, transitions payment status, and confirms seats', async () => {
      const booking = await createBooking();
      try {
        const orderId = `order_${crypto.randomUUID()}`;
        await insertPendingPayment(booking.id, orderId);

        const { data: depBefore } = await admin
          .from('bookings')
          .select('trip_departure_id')
          .eq('id', booking.id)
          .single();
        const { data: seatsBefore } = await admin
          .from('trip_departures')
          .select('seats_confirmed')
          .eq('id', depBefore!.trip_departure_id)
          .single();

        const { data: result } = await admin.rpc('record_payment_result', {
          p_provider: 'razorpay',
          p_provider_order_id: orderId,
          p_provider_payment_id: `pay_${crypto.randomUUID()}`,
          p_status: 'succeeded',
          p_reported_amount: booking.snapshot_price_amount,
          p_reported_currency: booking.snapshot_price_currency,
          p_failure_reason: null,
        });
        expect(result?.status).toBe('succeeded');

        const { data: bookingAfter } = await admin
          .from('bookings')
          .select('status')
          .eq('id', booking.id)
          .single();
        expect(bookingAfter?.status).toBe('confirmed');

        const { data: seatsAfter } = await admin
          .from('trip_departures')
          .select('seats_confirmed')
          .eq('id', depBefore!.trip_departure_id)
          .single();
        expect(seatsAfter?.seats_confirmed).toBe((seatsBefore?.seats_confirmed ?? 0) + 1);
      } finally {
        await cleanup(booking.id);
      }
    });

    it('8. a failed payment does NOT confirm the booking, and records a failure reason', async () => {
      const booking = await createBooking();
      try {
        const orderId = `order_${crypto.randomUUID()}`;
        await insertPendingPayment(booking.id, orderId);

        await admin.rpc('record_payment_result', {
          p_provider: 'razorpay',
          p_provider_order_id: orderId,
          p_provider_payment_id: `pay_${crypto.randomUUID()}`,
          p_status: 'failed',
          p_reported_amount: booking.snapshot_price_amount,
          p_reported_currency: booking.snapshot_price_currency,
          p_failure_reason: 'Card declined',
        });

        const { data: bookingAfter } = await admin
          .from('bookings')
          .select('status')
          .eq('id', booking.id)
          .single();
        expect(bookingAfter?.status).toBe('pending');

        const { data: paymentAfter } = await admin
          .from('payments')
          .select('status, failure_reason')
          .eq('provider_reference', orderId)
          .single();
        expect(paymentAfter?.status).toBe('failed');
        expect(paymentAfter?.failure_reason).toBe('Card declined');
      } finally {
        await cleanup(booking.id);
      }
    });

    it('9. & 12. a duplicate payment event is a safe no-op — never double-confirms, never re-applies', async () => {
      const booking = await createBooking();
      try {
        const orderId = `order_${crypto.randomUUID()}`;
        await insertPendingPayment(booking.id, orderId);
        const paymentId = `pay_${crypto.randomUUID()}`;

        const first = await admin.rpc('record_payment_result', {
          p_provider: 'razorpay',
          p_provider_order_id: orderId,
          p_provider_payment_id: paymentId,
          p_status: 'succeeded',
          p_reported_amount: booking.snapshot_price_amount,
          p_reported_currency: booking.snapshot_price_currency,
          p_failure_reason: null,
        });

        const { data: depBefore } = await admin
          .from('bookings')
          .select('trip_departure_id')
          .eq('id', booking.id)
          .single();
        const { data: seatsAfterFirst } = await admin
          .from('trip_departures')
          .select('seats_confirmed')
          .eq('id', depBefore!.trip_departure_id)
          .single();

        const second = await admin.rpc('record_payment_result', {
          p_provider: 'razorpay',
          p_provider_order_id: orderId,
          p_provider_payment_id: paymentId,
          p_status: 'succeeded',
          p_reported_amount: booking.snapshot_price_amount,
          p_reported_currency: booking.snapshot_price_currency,
          p_failure_reason: null,
        });

        expect(second.data?.id).toBe(first.data?.id);
        expect(second.data?.status).toBe('succeeded');

        const { data: seatsAfterSecond } = await admin
          .from('trip_departures')
          .select('seats_confirmed')
          .eq('id', depBefore!.trip_departure_id)
          .single();
        expect(seatsAfterSecond?.seats_confirmed).toBe(seatsAfterFirst?.seats_confirmed);
      } finally {
        await cleanup(booking.id);
      }
    });

    it('10. an invalid (mismatched) reported amount is rejected — the booking is never confirmed', async () => {
      const booking = await createBooking();
      try {
        const orderId = `order_${crypto.randomUUID()}`;
        await insertPendingPayment(booking.id, orderId);

        const { error } = await admin.rpc('record_payment_result', {
          p_provider: 'razorpay',
          p_provider_order_id: orderId,
          p_provider_payment_id: `pay_${crypto.randomUUID()}`,
          p_status: 'succeeded',
          p_reported_amount: 1,
          p_reported_currency: booking.snapshot_price_currency,
          p_failure_reason: null,
        });
        expect(error?.message).toContain('AMOUNT_MISMATCH');

        const { data: bookingAfter } = await admin
          .from('bookings')
          .select('status')
          .eq('id', booking.id)
          .single();
        expect(bookingAfter?.status).toBe('pending');
      } finally {
        await cleanup(booking.id);
      }
    });

    it('11. a payment result for an unknown order (wrong/nonexistent booking reference) is rejected cleanly', async () => {
      const { data, error } = await admin.rpc('record_payment_result', {
        p_provider: 'razorpay',
        p_provider_order_id: `order_${crypto.randomUUID()}`, // never inserted
        p_provider_payment_id: `pay_${crypto.randomUUID()}`,
        p_status: 'succeeded',
        p_reported_amount: 49999,
        p_reported_currency: 'INR',
        p_failure_reason: null,
      });
      expect(data).toBeNull();
      expect(error?.message).toContain('ORDER_NOT_FOUND');
    });

    it('15. & 16. a payment succeeding after the booking has already expired/cancelled does NOT re-confirm it, but IS still recorded as succeeded', async () => {
      const booking = await createBooking();
      try {
        const orderId = `order_${crypto.randomUUID()}`;
        await insertPendingPayment(booking.id, orderId);

        // Simulate the booking having expired and been released already.
        await admin.from('bookings').update({ status: 'cancelled' }).eq('id', booking.id);

        const { data: result } = await admin.rpc('record_payment_result', {
          p_provider: 'razorpay',
          p_provider_order_id: orderId,
          p_provider_payment_id: `pay_${crypto.randomUUID()}`,
          p_status: 'succeeded',
          p_reported_amount: booking.snapshot_price_amount,
          p_reported_currency: booking.snapshot_price_currency,
          p_failure_reason: null,
        });
        // The payment itself is genuinely recorded as succeeded — the
        // money moved; this table must not hide that historical fact.
        expect(result?.status).toBe('succeeded');

        // But the booking is NOT silently reconfirmed once it has already
        // left `pending` — see supabase/migrations/20260929182853_*.sql's
        // own header for the full reasoning.
        const { data: bookingAfter } = await admin
          .from('bookings')
          .select('status')
          .eq('id', booking.id)
          .single();
        expect(bookingAfter?.status).toBe('cancelled');
      } finally {
        await cleanup(booking.id);
      }
    });

    it('18. a guest booking (traveller_id null) can be paid and confirmed exactly like an authenticated one', async () => {
      const booking = await createBooking(null);
      try {
        const orderId = `order_${crypto.randomUUID()}`;
        await insertPendingPayment(booking.id, orderId);
        await admin.rpc('record_payment_result', {
          p_provider: 'razorpay',
          p_provider_order_id: orderId,
          p_provider_payment_id: `pay_${crypto.randomUUID()}`,
          p_status: 'succeeded',
          p_reported_amount: booking.snapshot_price_amount,
          p_reported_currency: booking.snapshot_price_currency,
          p_failure_reason: null,
        });
        const { data } = await admin
          .from('bookings')
          .select('status, traveller_id')
          .eq('id', booking.id)
          .single();
        expect(data?.status).toBe('confirmed');
        expect(data?.traveller_id).toBeNull();
      } finally {
        await cleanup(booking.id);
      }
    });

    it('19. an authenticated booking can be paid and confirmed, with traveller_id preserved throughout', async () => {
      const email = testEmail('auth-pay');
      const { data: created } = await admin.auth.admin.createUser({
        email,
        password: TEST_PASSWORD,
        email_confirm: true,
      });
      const userId = created.user!.id;
      const booking = await createBooking(userId);
      try {
        const orderId = `order_${crypto.randomUUID()}`;
        await insertPendingPayment(booking.id, orderId);
        await admin.rpc('record_payment_result', {
          p_provider: 'razorpay',
          p_provider_order_id: orderId,
          p_provider_payment_id: `pay_${crypto.randomUUID()}`,
          p_status: 'succeeded',
          p_reported_amount: booking.snapshot_price_amount,
          p_reported_currency: booking.snapshot_price_currency,
          p_failure_reason: null,
        });
        const { data } = await admin
          .from('bookings')
          .select('status, traveller_id')
          .eq('id', booking.id)
          .single();
        expect(data?.status).toBe('confirmed');
        expect(data?.traveller_id).toBe(userId);
      } finally {
        await cleanup(booking.id);
        await admin.auth.admin.deleteUser(userId);
      }
    });

    it('20. payment history integrity: the payment row for a confirmed booking retains its provider identifiers and captured_at', async () => {
      const booking = await createBooking();
      try {
        const orderId = `order_${crypto.randomUUID()}`;
        await insertPendingPayment(booking.id, orderId);
        const paymentId = `pay_${crypto.randomUUID()}`;
        await admin.rpc('record_payment_result', {
          p_provider: 'razorpay',
          p_provider_order_id: orderId,
          p_provider_payment_id: paymentId,
          p_status: 'succeeded',
          p_reported_amount: booking.snapshot_price_amount,
          p_reported_currency: booking.snapshot_price_currency,
          p_failure_reason: null,
        });

        const { data } = await admin
          .from('payments')
          .select('provider_reference, provider_payment_id, status, captured_at')
          .eq('provider_reference', orderId)
          .single();
        expect(data?.provider_reference).toBe(orderId);
        expect(data?.provider_payment_id).toBe(paymentId);
        expect(data?.status).toBe('succeeded');
        expect(data?.captured_at).not.toBeNull();
      } finally {
        await cleanup(booking.id);
      }
    });

    it('deleting a booking with a payment row cascades cleanly (the Phase 4.7 FK fix)', async () => {
      const booking = await createBooking();
      const orderId = `order_${crypto.randomUUID()}`;
      await insertPendingPayment(booking.id, orderId);
      const { error } = await admin.from('bookings').delete().eq('id', booking.id);
      expect(error).toBeNull();
      const { data: paymentAfter } = await admin
        .from('payments')
        .select('id')
        .eq('provider_reference', orderId)
        .maybeSingle();
      expect(paymentAfter).toBeNull();
    });
  },
);

describe.skipIf(hasCredentials && isReachable && seeded)('payment flow (not reachable)', () => {
  it('is skipped: no reachable database, or the live catalogue has not been seeded', () => {
    expect(true).toBe(true);
  });
});
