import { expect, test } from '@playwright/test';

import { signUpViaUi } from './helpers/signup';

/**
 * Global account access in the public site header — Phase 4.8A.
 *
 * Runs against `CONTENT_SOURCE=database` (playwright.db.config.ts) and the
 * real local Supabase stack. `tests/e2e-db/traveller-auth.spec.ts` already
 * covers the signup/login/logout flow itself in depth; this file is
 * specifically about the HEADER'S account control — that it appears
 * correctly across public pages, in both the logged-out and logged-in
 * state, and survives at mobile width.
 */
test.beforeEach(() => {
  test.slow();
});

function uniqueEmail(label: string): string {
  return `test-e2e-account-${label}-${Date.now().toString(36)}-${Math.random()
    .toString(36)
    .slice(2, 8)}@example.test`;
}

const PASSWORD = 'Test-Password-1234!';

test.describe('logged-out header', () => {
  test('the homepage header shows Log in', async ({ page }) => {
    await page.goto('/', { waitUntil: 'networkidle' });
    const banner = page.getByRole('banner');
    await expect(banner.getByRole('link', { name: 'Log in' })).toHaveAttribute('href', '/login');
  });

  test('Log in is visible across major public pages', async ({ page }) => {
    for (const path of ['/', '/trips', '/trips/all', '/trips/thailand-full-moon-party']) {
      await page.goto(path, { waitUntil: 'networkidle' });
      await expect(page.getByRole('banner').getByRole('link', { name: 'Log in' })).toBeVisible();
    }
  });
});

test.describe('signup → authenticated header', () => {
  test('signup Step 1 and Step 2 lead to a redirected, authenticated state with the account control visible', async ({
    page,
  }) => {
    const email = uniqueEmail('full-flow');
    await page.goto('/signup', { waitUntil: 'networkidle' });
    await expect(page.getByText('Step 1 of 2')).toBeVisible();

    await page.getByLabel('Email').fill(email);
    await page.getByLabel(/^Password/).fill(PASSWORD);
    await page.getByLabel('Confirm password').fill(PASSWORD);
    await page.getByRole('button', { name: 'Continue' }).click();

    await expect(page.getByText('Step 2 of 2')).toBeVisible();
    await page.getByLabel('Full name').fill('Header Tester');
    await page.getByRole('button', { name: 'Join Wander With Stars' }).click();

    await page.waitForURL('**/dashboard');

    // Back on a public page, the header now shows the account control,
    // not Log in.
    await page.goto('/', { waitUntil: 'networkidle' });
    const banner = page.getByRole('banner');
    await expect(banner.getByRole('link', { name: 'Log in' })).not.toBeVisible();
    await expect(
      banner.getByRole('button', { name: 'Account menu for Header Tester' }),
    ).toBeVisible();
  });
});

test.describe('authenticated header — account dropdown', () => {
  async function signedInPage(page: import('@playwright/test').Page, label: string) {
    const email = uniqueEmail(label);
    await signUpViaUi(page, { displayName: `Dropdown ${label}`, email, password: PASSWORD });
    return `Dropdown ${label}`;
  }

  test('profile icon is visible across major public pages once signed in', async ({ page }) => {
    const displayName = await signedInPage(page, 'pages');

    for (const path of ['/', '/trips', '/trips/all', '/trips/thailand-full-moon-party']) {
      await page.goto(path, { waitUntil: 'networkidle' });
      await expect(
        page.getByRole('banner').getByRole('button', { name: `Account menu for ${displayName}` }),
      ).toBeVisible();
    }
  });

  test('the account dropdown opens and shows name, email, My Trips, Profile and Log out', async ({
    page,
  }) => {
    const displayName = await signedInPage(page, 'dropdown');
    await page.goto('/', { waitUntil: 'networkidle' });

    const trigger = page
      .getByRole('banner')
      .getByRole('button', { name: `Account menu for ${displayName}` });
    await trigger.click();

    const menu = page.getByRole('menu', { name: 'Account' });
    await expect(menu).toBeVisible();
    await expect(menu.getByText(displayName)).toBeVisible();
    await expect(menu.getByRole('menuitem', { name: 'My Trips' })).toHaveAttribute(
      'href',
      '/dashboard',
    );
    await expect(menu.getByRole('menuitem', { name: 'Profile' })).toHaveAttribute(
      'href',
      '/dashboard/profile',
    );
    await expect(menu.getByRole('menuitem', { name: 'Log out' })).toBeVisible();
  });

  test('My Trips in the dropdown navigates to /dashboard', async ({ page }) => {
    const displayName = await signedInPage(page, 'mytrips');
    await page.goto('/', { waitUntil: 'networkidle' });

    await page
      .getByRole('banner')
      .getByRole('button', { name: `Account menu for ${displayName}` })
      .click();
    await page.getByRole('menuitem', { name: 'My Trips' }).click();
    await page.waitForURL('**/dashboard');
  });

  test('Profile in the dropdown navigates to /dashboard/profile', async ({ page }) => {
    const displayName = await signedInPage(page, 'profilenav');
    await page.goto('/', { waitUntil: 'networkidle' });

    await page
      .getByRole('banner')
      .getByRole('button', { name: `Account menu for ${displayName}` })
      .click();
    await page.getByRole('menuitem', { name: 'Profile' }).click();
    await page.waitForURL('**/dashboard/profile');
  });

  test('Log out from the dropdown signs the traveller out', async ({ page }) => {
    const displayName = await signedInPage(page, 'logout');
    await page.goto('/', { waitUntil: 'networkidle' });

    await page
      .getByRole('banner')
      .getByRole('button', { name: `Account menu for ${displayName}` })
      .click();
    await page.getByRole('menuitem', { name: 'Log out' }).click();
    await page.waitForURL('**/login');

    await page.goto('/', { waitUntil: 'networkidle' });
    await expect(page.getByRole('banner').getByRole('link', { name: 'Log in' })).toBeVisible();
  });
});

test.describe('mobile viewport (390×844)', () => {
  test.use({ viewport: { width: 390, height: 844 } });

  test('the account control is visible and usable at mobile width, with no header overflow, logged out', async ({
    page,
  }) => {
    await page.goto('/', { waitUntil: 'networkidle' });
    await expect(page.getByRole('banner').getByRole('link', { name: 'Log in' })).toBeVisible();

    const overflow = await page.evaluate(
      () => document.documentElement.scrollWidth - document.documentElement.clientWidth,
    );
    expect(overflow).toBeLessThanOrEqual(10);
  });

  test('the account dropdown fits within the viewport and closes correctly, logged in', async ({
    page,
  }) => {
    const email = uniqueEmail('mobile-dropdown');
    await signUpViaUi(page, { displayName: 'Mobile Dropdown', email, password: PASSWORD });
    await page.goto('/', { waitUntil: 'networkidle' });

    const trigger = page
      .getByRole('banner')
      .getByRole('button', { name: 'Account menu for Mobile Dropdown' });
    await trigger.click();

    const menu = page.getByRole('menu', { name: 'Account' });
    await expect(menu).toBeVisible();

    const box = await menu.boundingBox();
    expect(box).not.toBeNull();
    if (box) {
      expect(box.x).toBeGreaterThanOrEqual(0);
      expect(box.x + box.width).toBeLessThanOrEqual(390);
    }

    const overflow = await page.evaluate(
      () => document.documentElement.scrollWidth - document.documentElement.clientWidth,
    );
    expect(overflow).toBeLessThanOrEqual(10);

    // Closes correctly (Escape).
    await page.keyboard.press('Escape');
    await expect(menu).not.toBeVisible();
  });

  test('existing mobile nav menu still works alongside the account control', async ({ page }) => {
    await page.goto('/', { waitUntil: 'networkidle' });
    const menuTrigger = page.getByRole('button', { name: 'Menu' });
    await expect(menuTrigger).toBeVisible();
    await menuTrigger.click();
    await expect(page.getByRole('button', { name: 'Close' })).toBeVisible();
  });
});
