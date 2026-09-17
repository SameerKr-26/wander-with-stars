import { expect, test } from '@playwright/test';

/**
 * Phase 3.5C — real-browser mobile regression coverage.
 *
 * Both bugs this phase fixed were invisible to jsdom: the mobile nav button
 * genuinely toggled `menuOpen` in every existing unit test (React state
 * updated correctly), and the trip detail page genuinely rendered every
 * section in every existing unit test (the full DOM was always there) —
 * jsdom simply has no layout engine and every prior render happened
 * in-process rather than via real navigation, so a dev-server-level
 * cross-origin block (see next.config.ts's `allowedDevOrigins` comment)
 * could break real interaction on a real device while every jsdom
 * assertion kept passing. These tests exist to catch that class of bug —
 * a real browser, a real 390px viewport, real clicks and real focus.
 */

test.describe('mobile navigation', () => {
  test('starts collapsed, opens on tap, and shows every nav link', async ({ page }) => {
    await page.goto('/');
    const trigger = page.getByRole('button', { name: 'Menu' });

    await expect(trigger).toBeVisible();
    await expect(trigger).toHaveAttribute('aria-expanded', 'false');

    await trigger.click();

    const panel = page.locator('.wws-mobile-panel');
    await expect(panel).toBeVisible();
    const box = await panel.boundingBox();
    expect(box?.height ?? 0).toBeGreaterThan(0);

    for (const label of ['Home', 'Trips', 'Stories', 'Creators', 'About', 'Find My Trip']) {
      await expect(panel.getByRole('link', { name: label })).toBeVisible();
    }
  });

  test('Escape closes the menu and returns focus to the trigger', async ({ page }) => {
    await page.goto('/');
    const trigger = page.getByRole('button', { name: 'Menu' });

    await trigger.click();
    await expect(page.locator('.wws-mobile-panel')).toBeVisible();

    await page.keyboard.press('Escape');

    await expect(page.locator('.wws-mobile-panel')).toHaveCount(0);
    await expect(page.getByRole('button', { name: 'Menu' })).toBeFocused();
  });

  test('the visible Close control also closes the menu', async ({ page }) => {
    await page.goto('/');
    await page.getByRole('button', { name: 'Menu' }).click();

    await page.getByRole('button', { name: 'Close' }).click();

    await expect(page.locator('.wws-mobile-panel')).toHaveCount(0);
  });

  test('a tapped nav link actually navigates', async ({ page }) => {
    await page.goto('/');
    await page.getByRole('button', { name: 'Menu' }).click();
    await page.locator('.wws-mobile-panel').getByRole('link', { name: 'Trips' }).click();

    await expect(page).toHaveURL(/\/trips$/);
  });
});

test.describe('trip detail page — mobile viewport', () => {
  const SLUG = 'sample-northern-vietnam';

  test('renders the full page — hero, story and practical sections all visible', async ({
    page,
  }) => {
    await page.goto(`/trips/${SLUG}`);

    await expect(page.getByRole('heading', { level: 1 })).toBeVisible();
    await expect(page.getByText('Six nights across Hanoi')).toBeVisible();
    await expect(page.getByText('THE JOURNEY', { exact: false })).toBeVisible();
    await expect(page.getByText('YOUR HOST', { exact: false })).toBeVisible();
  });

  test('no horizontal overflow at 390px', async ({ page }) => {
    await page.goto(`/trips/${SLUG}`);
    // The hero's one-time "arrival" animation (trip-detail.css,
    // `.wws-arrival-media`) scales the image element itself from 1.05x
    // down to 1x over `--duration-hero` (950ms) — genuinely 5% wider than
    // final size while it plays, which briefly and correctly inflates
    // `document.documentElement.scrollWidth`. Waiting for the animation to
    // settle measures the page's real, resting layout — what a user
    // actually sees after the first second.
    await page.waitForTimeout(1_000);

    const { scrollWidth, clientWidth } = await page.evaluate(() => ({
      scrollWidth: document.documentElement.scrollWidth,
      clientWidth: document.documentElement.clientWidth,
    }));
    // 1px tolerance for sub-pixel rounding.
    expect(scrollWidth).toBeLessThanOrEqual(clientWidth + 1);
  });

  test('the honest booking state is visible without hovering', async ({ page }) => {
    await page.goto(`/trips/${SLUG}`);

    await expect(page.getByRole('button', { name: 'Booking opens soon' }).first()).toBeVisible();
  });

  test('the return-to-/trips link works', async ({ page }) => {
    await page.goto(`/trips/${SLUG}`);

    await page.getByRole('link', { name: '← All trips' }).click();
    await expect(page).toHaveURL(/\/trips$/);
  });
});

test.describe('homepage — mobile viewport', () => {
  test('renders visible content with no horizontal overflow', async ({ page }) => {
    await page.goto('/');

    await expect(page.getByRole('heading', { level: 1 })).toBeVisible();

    const { scrollWidth, clientWidth } = await page.evaluate(() => ({
      scrollWidth: document.documentElement.scrollWidth,
      clientWidth: document.documentElement.clientWidth,
    }));
    expect(scrollWidth).toBeLessThanOrEqual(clientWidth + 1);
  });
});
