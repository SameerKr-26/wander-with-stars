import { createClient } from '@supabase/supabase-js';
import { expect, test } from '@playwright/test';

const adminClient = createClient(
  'http://127.0.0.1:54321',
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZS1kZW1vIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImV4cCI6MTk4MzgxMjk5Nn0.EGIM96RAZx35lJzdJsyH-qQwv8Hdp7fsn3W0YpN81IU',
  { auth: { autoRefreshToken: false, persistSession: false, detectSessionInUrl: false } },
);

/**
 * Traveller dashboard & "My Trips" — Phase 4.8.
 *
 * Runs against `CONTENT_SOURCE=database` (playwright.db.config.ts) and the
 * real local Supabase stack — genuine bookings against the real,
 * live-captured Thailand departures, not mocks.
 *
 * No real Razorpay checkout exists in this environment (Phase 4.7's own
 * documented limitation), so "a confirmed, paid booking" is produced the
 * same way `tests/integration/payment-flow.test.ts` already proves is the
 * real confirmation path: calling `record_payment_result` directly via
 * the service-role client — the exact function the webhook and the
 * checkout-return path both call — rather than faking a `status:
 * 'confirmed'` row by hand. "Past" and "cancelled" bookings are produced
 * by creating a real pending booking against a real departure and then
 * adjusting its snapshot date / status directly via the service-role
 * client — a controlled test fixture, not fabricated trip/pricing data
 * (the departure, trip and price are all real, seeded content).
 */

test.beforeEach(() => {
  test.slow();
});

function uniqueEmail(label: string): string {
  return `test-e2e-dashboard-${label}-${Date.now().toString(36)}-${Math.random()
    .toString(36)
    .slice(2, 8)}@example.test`;
}

const PASSWORD = 'Test-Password-1234!';

async function getThailandDepartureId(): Promise<string> {
  const { data: trip } = await adminClient
    .from('trips')
    .select('id')
    .eq('slug', 'thailand-full-moon-party')
    .single();
  const { data: departure } = await adminClient
    .from('trip_departures')
    .select('id')
    .eq('trip_id', (trip as { id: string }).id)
    .order('departure_date')
    .limit(1)
    .single();
  return (departure as { id: string }).id;
}

async function createUserAndSignIn(
  page: import('@playwright/test').Page,
  label: string,
): Promise<{ userId: string; email: string }> {
  const email = uniqueEmail(label);
  const { data: created, error } = await adminClient.auth.admin.createUser({
    email,
    password: PASSWORD,
    email_confirm: true,
  });
  if (error || !created.user) throw new Error(`setup: ${error?.message}`);

  await page.goto('/login', { waitUntil: 'networkidle' });
  await page.getByLabel('Email').fill(email);
  await page.getByLabel('Password').fill(PASSWORD);
  await page.getByRole('button', { name: 'Sign in' }).click();
  await page.waitForURL('**/dashboard');

  return { userId: created.user.id, email };
}

async function createBooking(
  departureId: string,
  travellerId: string,
  participants: { full_name: string; is_lead: boolean }[] = [
    { full_name: 'E2E Dashboard Tester', is_lead: true },
  ],
) {
  const { data } = await adminClient.rpc('create_pending_booking', {
    p_trip_departure_id: departureId,
    p_traveller_id: travellerId,
    p_contact_name: 'E2E Dashboard Tester',
    p_contact_email: 'e2e-dashboard-tester@example.test',
    p_contact_phone: null,
    p_participants: participants,
    p_idempotency_key: crypto.randomUUID(),
  });
  return data as {
    id: string;
    reference: string;
    snapshot_price_amount: number;
    snapshot_price_currency: string;
  };
}

async function confirmBookingWithPayment(bookingId: string, amount: number, currency: string) {
  const orderId = `order_e2e_${crypto.randomUUID()}`;
  await adminClient.from('payments').insert({
    booking_id: bookingId,
    provider: 'razorpay',
    provider_reference: orderId,
    amount,
    currency,
  });
  await adminClient.rpc('record_payment_result', {
    p_provider: 'razorpay',
    p_provider_order_id: orderId,
    p_provider_payment_id: `pay_e2e_${crypto.randomUUID()}`,
    p_status: 'succeeded',
    p_reported_amount: amount,
    p_reported_currency: currency,
    p_failure_reason: null,
  });
}

async function cleanupBooking(bookingId: string) {
  await adminClient.from('bookings').delete().eq('id', bookingId);
}

async function cleanupUser(userId: string) {
  await adminClient.auth.admin.deleteUser(userId);
}

test.describe('unauthenticated access', () => {
  test('visiting /dashboard while logged out redirects to /login', async ({ page }) => {
    await page.goto('/dashboard', { waitUntil: 'networkidle' });
    await page.waitForURL('**/login');
  });

  test('visiting a booking detail page while logged out redirects to /login', async ({ page }) => {
    await page.goto('/dashboard/bookings/00000000-0000-4000-8000-000000000000', {
      waitUntil: 'networkidle',
    });
    await page.waitForURL('**/login');
  });
});

test.describe('empty dashboard', () => {
  test('a traveller with no bookings sees the empty state and an Explore Trips CTA', async ({
    page,
  }) => {
    const { userId } = await createUserAndSignIn(page, 'empty');
    try {
      await expect(page.getByText('Your next adventure starts here.')).toBeVisible();
      const cta = page.getByRole('link', { name: 'Explore Trips' });
      await expect(cta).toBeVisible();
      await cta.click();
      await page.waitForURL('**/trips');
    } finally {
      await cleanupUser(userId);
    }
  });
});

test.describe('a single pending booking', () => {
  test('shows the trip, reference, pending status and no payment yet', async ({ page }) => {
    const departureId = await getThailandDepartureId();
    const { userId } = await createUserAndSignIn(page, 'pending');
    const booking = await createBooking(departureId, userId);
    try {
      await page.goto('/dashboard', { waitUntil: 'networkidle' });
      await expect(page.getByText('Thailand Full Moon Party')).toBeVisible();
      await expect(page.getByText(booking.reference)).toBeVisible();
      await expect(page.getByText('Pending', { exact: true })).toBeVisible();
      await expect(page.getByText('No payment yet')).toBeVisible();
    } finally {
      await cleanupBooking(booking.id);
      await cleanupUser(userId);
    }
  });
});

test.describe('a confirmed, paid booking', () => {
  test('shows Confirmed status and Paid payment status, from the authoritative payment record', async ({
    page,
  }) => {
    const departureId = await getThailandDepartureId();
    const { userId } = await createUserAndSignIn(page, 'confirmed');
    const booking = await createBooking(departureId, userId);
    await confirmBookingWithPayment(
      booking.id,
      booking.snapshot_price_amount,
      booking.snapshot_price_currency,
    );
    try {
      await page.goto('/dashboard', { waitUntil: 'networkidle' });
      await expect(page.getByText('Confirmed', { exact: true })).toBeVisible();
      await expect(page.getByText('Paid', { exact: true })).toBeVisible();
    } finally {
      await cleanupBooking(booking.id);
      await cleanupUser(userId);
    }
  });
});

test.describe('booking detail page', () => {
  test('opening a booking from the dashboard shows its full detail', async ({ page }) => {
    const departureId = await getThailandDepartureId();
    const { userId } = await createUserAndSignIn(page, 'detail');
    const booking = await createBooking(departureId, userId, [
      { full_name: 'Lead Traveller', is_lead: true },
      { full_name: 'Second Traveller', is_lead: false },
    ]);
    try {
      await page.goto('/dashboard', { waitUntil: 'networkidle' });
      // This traveller's only booking renders as the dashboard's hero
      // "upcoming trip" panel (components/dashboard/upcoming-trip-panel.tsx),
      // not as a row in the "Upcoming" list below it — its own link is
      // "View booking details", not a per-row "View booking {reference}"
      // CardAction (that only exists for bookings NOT chosen as the hero).
      await page.getByRole('link', { name: 'View booking details' }).click();
      await page.waitForURL('**/dashboard/bookings/**');

      await expect(page.getByText(booking.reference, { exact: true })).toBeVisible();
      await expect(page.getByRole('heading', { name: 'Thailand Full Moon Party' })).toBeVisible();
      await expect(page.getByText('Lead Traveller', { exact: true })).toBeVisible();
      await expect(page.getByText('Second Traveller', { exact: true })).toBeVisible();
      await expect(page.getByText('Lead traveller', { exact: true })).toBeVisible();
      await expect(page.getByText('e2e-dashboard-tester@example.test')).toBeVisible();
      await expect(
        page.getByRole('link', { name: 'View the current trip page →' }),
      ).toHaveAttribute('href', '/trips/thailand-full-moon-party');
    } finally {
      await cleanupBooking(booking.id);
      await cleanupUser(userId);
    }
  });

  test("a traveller cannot open another traveller's booking detail page by guessing its ID", async ({
    page,
  }) => {
    const departureId = await getThailandDepartureId();
    const victim = await createUserAndSignIn(page, 'victim');
    const victimBooking = await createBooking(departureId, victim.userId);

    // Sign out of the victim's session (opened above) and sign in as a
    // completely different traveller, then try the victim's own booking
    // URL directly — never via a link this traveller was ever shown.
    await page.getByRole('button', { name: 'Sign out' }).click();
    await page.waitForURL('**/login');
    const attacker = await createUserAndSignIn(page, 'attacker');
    try {
      await page.goto(`/dashboard/bookings/${victimBooking.id}`, { waitUntil: 'networkidle' });
      await expect(page.getByText('404')).toBeVisible();
    } finally {
      await cleanupBooking(victimBooking.id);
      await cleanupUser(victim.userId);
      await cleanupUser(attacker.userId);
    }
  });
});

test.describe('multiple bookings, grouped', () => {
  test('groups bookings into Upcoming, Past and Cancelled correctly', async ({ page }) => {
    const departureId = await getThailandDepartureId();
    const { userId } = await createUserAndSignIn(page, 'grouped');

    const upcoming = await createBooking(departureId, userId);
    const past = await createBooking(departureId, userId);
    const cancelled = await createBooking(departureId, userId);

    // A controlled test fixture: back-dating this one booking's own
    // snapshot to simulate a trip that already happened, so the real
    // classification logic (lib/dashboard/grouping.ts, already unit
    // tested in isolation) has a genuine past booking to sort, without
    // waiting for real time to pass or inventing a fake trip/departure.
    await adminClient
      .from('bookings')
      .update({ snapshot_departure_date: '2020-01-01' })
      .eq('id', past.id);
    await adminClient.from('bookings').update({ status: 'cancelled' }).eq('id', cancelled.id);

    try {
      await page.goto('/dashboard', { waitUntil: 'networkidle' });

      await expect(page.getByRole('heading', { name: 'Past' })).toBeVisible();
      await expect(page.getByRole('heading', { name: 'Cancelled' })).toBeVisible();
      // `upcoming` is this traveller's only upcoming trip, so it renders as
      // the hero panel (a single, exact match); `past`/`cancelled` render
      // as list rows, each with BOTH a visible reference and a same-text
      // sr-only CardAction label ("View booking {reference}") — exact:true
      // is what disambiguates the visible text from that substring match.
      await expect(page.getByText(upcoming.reference, { exact: true })).toBeVisible();
      await expect(page.getByText(past.reference, { exact: true })).toBeVisible();
      await expect(page.getByText(cancelled.reference, { exact: true })).toBeVisible();
    } finally {
      await cleanupBooking(upcoming.id);
      await cleanupBooking(past.id);
      await cleanupBooking(cancelled.id);
      await cleanupUser(userId);
    }
  });
});

test.describe('profile and logout from the dashboard', () => {
  test('the dashboard links to profile and signs out correctly', async ({ page }) => {
    const { userId } = await createUserAndSignIn(page, 'profile-logout');
    try {
      await page.getByRole('link', { name: 'Profile', exact: true }).click();
      await page.waitForURL('**/dashboard/profile');
      await expect(page.getByRole('heading', { name: 'Your profile' })).toBeVisible();

      await page.getByRole('button', { name: 'Sign out' }).click();
      await page.waitForURL('**/login');
    } finally {
      await cleanupUser(userId);
    }
  });
});

test.describe('mobile viewport (390×844)', () => {
  test.use({ viewport: { width: 390, height: 844 } });

  test('the dashboard and a booking detail page have no horizontal overflow', async ({ page }) => {
    const departureId = await getThailandDepartureId();
    const { userId } = await createUserAndSignIn(page, 'mobile');
    const booking = await createBooking(departureId, userId);
    try {
      await page.goto('/dashboard', { waitUntil: 'networkidle' });
      let overflow = await page.evaluate(
        () => document.documentElement.scrollWidth - document.documentElement.clientWidth,
      );
      expect(overflow).toBeLessThanOrEqual(10);

      await page.goto(`/dashboard/bookings/${booking.id}`, { waitUntil: 'networkidle' });
      overflow = await page.evaluate(
        () => document.documentElement.scrollWidth - document.documentElement.clientWidth,
      );
      expect(overflow).toBeLessThanOrEqual(10);
    } finally {
      await cleanupBooking(booking.id);
      await cleanupUser(userId);
    }
  });
});
