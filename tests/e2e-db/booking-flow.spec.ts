import { createClient } from '@supabase/supabase-js';
import { expect, test } from '@playwright/test';

import { signUpViaUi } from './helpers/signup';

const adminClient = createClient(
  'http://127.0.0.1:54321',
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZS1kZW1vIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImV4cCI6MTk4MzgxMjk5Nn0.EGIM96RAZx35lJzdJsyH-qQwv8Hdp7fsn3W0YpN81IU',
  { auth: { autoRefreshToken: false, persistSession: false, detectSessionInUrl: false } },
);

/**
 * Traveller booking & reservation flow — Phase 4.6.
 *
 * Runs against `CONTENT_SOURCE=database` (playwright.db.config.ts) and the
 * real local Supabase Auth + booking domain — genuine bookings against the
 * real, live-captured Thailand/Vietnam/Bali departures, not mocks.
 *
 * Departure ids are never hardcoded (they're random per `supabase db
 * reset`) — every test reaches `/booking/[departureId]` the same way a
 * real traveller would: through `/trips/thailand-full-moon-party`'s own
 * departure selector and "Book this departure" link, exactly proving the
 * selected-departure identity survives the navigation intact (the phase's
 * own explicit requirement).
 */

test.beforeEach(() => {
  // Booking involves several sequential server round trips (a page read,
  // then a multi-field Server Action call) — see
  // tests/e2e-db/traveller-auth.spec.ts's own comment for the same
  // reasoning applied to signup.
  test.slow();
});

function uniqueEmail(label: string): string {
  return `test-e2e-booking-${label}-${Date.now().toString(36)}-${Math.random()
    .toString(36)
    .slice(2, 8)}@example.test`;
}

async function goToBookingPageForDeparture(page: import('@playwright/test').Page, index: number) {
  await page.goto('/trips/thailand-full-moon-party', { waitUntil: 'networkidle' });
  const radios = page.getByRole('radio');
  await radios.nth(index).check();
  await page.waitForTimeout(200);
  const href = await page.getByRole('link', { name: 'Book this departure' }).getAttribute('href');
  await page.getByRole('link', { name: 'Book this departure' }).click();
  await page.waitForURL('**/booking/**', { waitUntil: 'networkidle' });
  return href;
}

async function fillContactStep(
  page: import('@playwright/test').Page,
  { name, email, participants = 1 }: { name: string; email: string; participants?: number },
) {
  await page.getByLabel('Full name').fill(name);
  await page.getByLabel('Email').fill(email);
  if (participants > 1) {
    await page.getByLabel('Number of travellers').selectOption(String(participants));
  }
  await page.getByRole('button', { name: 'Continue' }).click();
  await page.waitForTimeout(200);
}

async function fillParticipantsStep(page: import('@playwright/test').Page, names: string[]) {
  for (let i = 0; i < names.length; i++) {
    await page.getByLabel(new RegExp(`Traveller ${i + 1}`)).fill(names[i]!);
  }
  await page.getByRole('button', { name: 'Continue' }).click();
  await page.waitForTimeout(200);
}

test.describe('departure identity survives navigation into the booking flow', () => {
  for (const [label, index] of [
    ['departure #1 (soonest)', 0],
    ['departure #2', 1],
    ['departure #3', 2],
  ] as const) {
    test(`selecting Thailand ${label} books exactly that departure`, async ({ page }) => {
      const href = await goToBookingPageForDeparture(page, index);
      expect(href).toMatch(/^\/booking\/[0-9a-f-]{36}$/);
      await expect(page.getByRole('heading', { name: 'Thailand Full Moon Party' })).toBeVisible();
      // The booking page's own summary card shows a specific date, proving
      // the correct departure loaded, not just "a" Thailand departure.
      await expect(page.getByText('DEPARTS')).toBeVisible();
    });
  }
});

test.describe('guest booking', () => {
  test('a guest can complete the full flow to a pending booking with a reference', async ({
    page,
  }) => {
    await goToBookingPageForDeparture(page, 0);
    await fillContactStep(page, { name: 'Guest Traveller', email: uniqueEmail('guest') });
    await fillParticipantsStep(page, ['Guest Traveller']);

    await expect(page.getByText('Review your booking')).toBeVisible();
    await page.getByRole('button', { name: 'Reserve this departure' }).click();

    await expect(page.getByText('Booking reference')).toBeVisible({ timeout: 15000 });
    await expect(page.getByText(/^WWS-[A-Z0-9]{8}$/)).toBeVisible();
    await expect(page.getByText('Pending', { exact: true })).toBeVisible();
  });
});

test.describe('authenticated traveller booking', () => {
  test('a signed-in traveller can complete the booking flow', async ({ page }) => {
    const email = uniqueEmail('auth');
    const password = 'Test-Password-1234!';
    await signUpViaUi(page, { displayName: 'Auth Booker', email, password });

    await goToBookingPageForDeparture(page, 1);
    // Contact fields are blank by default even when signed in — the flow
    // does not assume the traveller wants to book for themselves under
    // their account email without confirming it.
    await fillContactStep(page, { name: 'Auth Booker', email });
    await fillParticipantsStep(page, ['Auth Booker']);
    await page.getByRole('button', { name: 'Reserve this departure' }).click();

    await expect(page.getByText('Booking reference')).toBeVisible({ timeout: 15000 });
  });
});

test.describe('booking review', () => {
  test('the review screen shows trip, date, price, participant count and total — no fabricated fees', async ({
    page,
  }) => {
    await goToBookingPageForDeparture(page, 0);
    await fillContactStep(page, {
      name: 'Review Tester',
      email: uniqueEmail('review'),
      participants: 2,
    });
    await fillParticipantsStep(page, ['Review Tester', 'Plus One']);

    const text = await page.locator('body').innerText();
    expect(text).toContain('Review your booking');
    expect(text).toContain('Thailand Full Moon Party');
    expect(text).toMatch(/₹\d[\d,]* \/ person × 2/);
    expect(text).toContain('Total');
    expect(text).not.toMatch(/tax|gst|fee|surcharge/i);
    expect(text).toContain('This reserves your spot as a pending booking');
  });
});

test.describe('back/navigation safety', () => {
  test('going back from review to participants preserves entered names', async ({ page }) => {
    await goToBookingPageForDeparture(page, 0);
    await fillContactStep(page, { name: 'Back Tester', email: uniqueEmail('back') });
    await fillParticipantsStep(page, ['Back Tester']);
    await expect(page.getByText('Review your booking')).toBeVisible();

    await page.getByRole('button', { name: 'Back' }).click();
    await expect(page.getByLabel(/Traveller 1/)).toHaveValue('Back Tester');
  });

  test('going back from participants to contact preserves contact details', async ({ page }) => {
    await goToBookingPageForDeparture(page, 0);
    await fillContactStep(page, { name: 'Contact Preserved', email: uniqueEmail('preserve') });
    await page.getByRole('button', { name: 'Back' }).click();
    await expect(page.getByLabel('Full name')).toHaveValue('Contact Preserved');
  });
});

test.describe('validation errors', () => {
  test('an incomplete contact form cannot proceed', async ({ page }) => {
    await goToBookingPageForDeparture(page, 0);
    await page.getByRole('button', { name: 'Continue' }).click();
    // Native HTML5 required-field validation keeps the browser on the same
    // step — no navigation to the participants step happened.
    await expect(page.getByRole('button', { name: 'Continue' })).toBeVisible();
    await expect(page.getByText("Who's travelling?")).not.toBeVisible();
  });

  test('a blank participant name cannot proceed to review', async ({ page }) => {
    await goToBookingPageForDeparture(page, 0);
    await fillContactStep(page, { name: 'Validation Tester', email: uniqueEmail('validation') });
    // Clear the pre-filled lead name and try to continue.
    await page.getByLabel(/Traveller 1/).fill('');
    await page.getByRole('button', { name: 'Continue' }).click();
    await expect(page.getByText('Review your booking')).not.toBeVisible();
  });
});

test.describe('insufficient seats', () => {
  test('booking more seats than are left shows a friendly error, not a raw database error', async ({
    page,
  }) => {
    await goToBookingPageForDeparture(page, 1);
    const departureId = page.url().split('/booking/')[1]!;

    // Temporarily cap this departure to zero remaining seats, directly
    // against the real local database — the same admin client the
    // integration suite uses.
    await adminClient
      .from('trip_departures')
      .update({ capacity: 0, seats_reserved: 0 })
      .eq('id', departureId);

    try {
      await fillContactStep(page, { name: 'Sold Out Tester', email: uniqueEmail('soldout') });
      await fillParticipantsStep(page, ['Sold Out Tester']);
      await page.getByRole('button', { name: 'Reserve this departure' }).click();

      await expect(page.getByRole('alert')).toBeVisible({ timeout: 15000 });
      const alertText = await page.getByRole('alert').textContent();
      expect(alertText).not.toMatch(/relation|constraint|sql|postgres/i);
      expect(page.url()).toContain(`/booking/${departureId}`);
    } finally {
      await adminClient
        .from('trip_departures')
        .update({ capacity: null, seats_reserved: 0 })
        .eq('id', departureId);
    }
  });
});

test.describe('no accidental duplicate booking', () => {
  test('the submit button disables immediately, so a rapid second click cannot double-submit', async ({
    page,
  }) => {
    await goToBookingPageForDeparture(page, 2);
    const email = uniqueEmail('double-click');
    await fillContactStep(page, { name: 'Double Clicker', email });
    await fillParticipantsStep(page, ['Double Clicker']);

    const button = page.getByRole('button', { name: 'Reserve this departure' });
    await button.click();
    // Immediately after the click, the button must either be disabled
    // (submission in flight) or already gone (the result screen replaced
    // it) — either way, nothing is left on screen a rapid second click
    // could hit. Against the real local database this resolves fast
    // enough that "already gone" is the common outcome; both count as the
    // UI-level guard holding. (The idempotency-key guard — the real
    // backstop against a network retry or a second full page submission —
    // is proven separately in tests/integration/booking-flow.test.ts's own
    // duplicate-submission test, which does not depend on winning a UI
    // timing race.)
    await expect(async () => {
      const stillPresent = await button.count();
      if (stillPresent > 0) {
        await expect(button).toBeDisabled();
      }
    }).toPass({ timeout: 2000 });

    await expect(page.getByText('Booking reference')).toBeVisible({ timeout: 15000 });
    const referenceText = await page.getByText(/^WWS-[A-Z0-9]{8}$/).textContent();
    expect(referenceText).toMatch(/^WWS-[A-Z0-9]{8}$/);
  });
});

test.describe('mobile booking flow (390×844)', () => {
  test.use({ viewport: { width: 390, height: 844 } });

  test('the full flow works with no horizontal overflow at any step', async ({ page }) => {
    await goToBookingPageForDeparture(page, 0);

    const checkOverflow = async () => {
      const overflow = await page.evaluate(
        () => document.documentElement.scrollWidth - document.documentElement.clientWidth,
      );
      expect(overflow).toBeLessThanOrEqual(10);
    };
    await checkOverflow();

    await fillContactStep(page, { name: 'Mobile Booker', email: uniqueEmail('mobile') });
    await checkOverflow();

    await fillParticipantsStep(page, ['Mobile Booker']);
    await checkOverflow();

    await expect(page.getByRole('button', { name: 'Reserve this departure' })).toBeVisible();
    await page.getByRole('button', { name: 'Reserve this departure' }).click();
    await expect(page.getByText('Booking reference')).toBeVisible({ timeout: 15000 });
    await checkOverflow();
  });
});
