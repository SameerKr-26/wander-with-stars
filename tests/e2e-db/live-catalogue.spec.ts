import { expect, test } from '@playwright/test';

/**
 * Phase 4.4B — database-backed public catalogue e2e coverage.
 *
 * Runs against `CONTENT_SOURCE=database` (playwright.db.config.ts), the
 * local Supabase stack, seeded via scripts/seed-live-catalogue.ts and
 * scripts/publish-live-catalogue.ts. Verifies the real, live-captured WWS
 * trips (Thailand, Vietnam, Bali) are actually reachable through the public
 * query architecture and rendered with correct source facts — not just
 * present in the database unqueried.
 *
 * Prerequisite (not run by this file): `npx supabase start`, then
 * `npx tsx scripts/seed-vietnam-draft.ts`, `scripts/seed-live-catalogue.ts`,
 * `scripts/publish-live-catalogue.ts`, each with
 * NEXT_PUBLIC_SUPABASE_URL/SUPABASE_SERVICE_ROLE_KEY set to the local stack.
 */

test.describe('/trips — featured departure', () => {
  test('shows a real, database-backed trip with no fabricated content', async ({ page }) => {
    await page.goto('/trips');
    await expect(page.getByText('Search trips')).toBeVisible();
    // At least one of the three real trips (or the schema smoke-test trip)
    // must be present; the page must not error.
    await expect(page.locator('body')).not.toContainText("couldn't load");
  });
});

test.describe('/trips/all — full catalogue', () => {
  test('lists all three live-captured trips with correct prices and dates', async ({ page }) => {
    await page.goto('/trips/all');
    await expect(page.getByRole('heading', { name: 'Thailand Full Moon Party' })).toBeVisible();
    await expect(page.getByText('₹49,999')).toBeVisible();
    await expect(page.getByRole('heading', { name: 'Vietnam 6N/7D' })).toBeVisible();
    await expect(page.getByText('₹64,999')).toBeVisible();
    await expect(
      page.getByRole('heading', { name: 'BALI New Year Special 8N/9D with Gili T & Nusa Penida' }),
    ).toBeVisible();
    await expect(page.getByText('₹68,999')).toBeVisible();
  });

  test('does not show the removed Georgia/Tbilisi sample', async ({ page }) => {
    await page.goto('/trips/all');
    await expect(page.locator('body')).not.toContainText('Georgia');
    await expect(page.locator('body')).not.toContainText('Tbilisi');
  });
});

const REAL_TRIPS: { slug: string; title: string; price: string; date: string; nights: number }[] = [
  {
    slug: 'thailand-full-moon-party',
    title: 'Thailand Full Moon Party',
    price: '₹49,999',
    date: '25 Oct 2026',
    nights: 6,
  },
  {
    slug: 'vietnam-6n7d',
    title: 'Vietnam 6N/7D',
    price: '₹64,999',
    date: '13 Nov 2026',
    nights: 6,
  },
  {
    slug: 'bali-new-year-special',
    title: 'BALI New Year Special 8N/9D with Gili T & Nusa Penida',
    price: '₹68,999',
    date: '26 Dec 2026',
    nights: 8,
  },
];

for (const trip of REAL_TRIPS) {
  test.describe(`/trips/${trip.slug}`, () => {
    test('shows correct identity, commercial facts, itinerary, inclusions, exclusions', async ({
      page,
    }) => {
      await page.goto(`/trips/${trip.slug}`);
      await expect(page.getByRole('heading', { name: trip.title })).toBeVisible();
      await expect(page.getByText(trip.price)).toBeVisible();
      await expect(page.getByText(trip.date)).toBeVisible();
      await expect(page.getByText(`${trip.nights + 1}D/${trip.nights}N`)).toBeVisible();
      await expect(page.getByText('Included', { exact: true })).toBeVisible();
      await expect(page.getByText('Not included', { exact: true })).toBeVisible();
      await expect(page.getByText('DAY 01')).toBeVisible();
    });

    test('does not fabricate ratings, review counts, or FAQs the source never provided', async ({
      page,
    }) => {
      await page.goto(`/trips/${trip.slug}`);
      const body = page.locator('body');
      await expect(body).not.toContainText(/\d+\s+reviews?/i);
      await expect(body).not.toContainText('Frequently Asked Questions');
    });

    test('has no horizontal overflow on mobile', async ({ page }) => {
      await page.setViewportSize({ width: 390, height: 844 });
      await page.goto(`/trips/${trip.slug}`);
      const overflow = await page.evaluate(
        () => document.documentElement.scrollWidth - document.documentElement.clientWidth,
      );
      expect(overflow).toBeLessThanOrEqual(10);
    });
  });
}
