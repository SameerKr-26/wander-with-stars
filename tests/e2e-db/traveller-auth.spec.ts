import { expect, test } from '@playwright/test';

import { signUpViaUi } from './helpers/signup';

/**
 * Traveller authentication — Phase 4.5, signup flow updated Phase 4.8A
 * (now two real steps — see `./helpers/signup.ts`).
 *
 * Runs against `CONTENT_SOURCE=database` (playwright.db.config.ts) and the
 * real local Supabase Auth instance — a genuine signup/login/logout cycle,
 * not a mock. Each test creates its own uniquely-emailed account
 * (`test-e2e-*@example.test`) rather than sharing state across tests, so
 * they can run in any order/in parallel without colliding.
 */

// A real signup here is genuinely slower than most e2e assertions: browser
// client signUp -> cookie-setting round trip -> a Server Action
// (createTravellerProfileAction) -> a database write, all before the
// client-side router.push/refresh even starts. Several tests below chain
// two or three of these. `test.slow()` triples the default timeout
// (Playwright's own mechanism for exactly this kind of legitimately-slower
// flow) rather than masking a real bug — the flow's correctness was
// verified independently via a manual script before this suite was
// written.
test.beforeEach(() => {
  test.slow();
});

function uniqueEmail(label: string): string {
  return `test-e2e-${label}-${Date.now().toString(36)}-${Math.random()
    .toString(36)
    .slice(2, 8)}@example.test`;
}

const PASSWORD = 'Test-Password-1234!';

test.describe('signup → dashboard → logout', () => {
  test('a new traveller can sign up, land on the dashboard, and see their profile', async ({
    page,
  }) => {
    const email = uniqueEmail('signup');
    await signUpViaUi(page, { displayName: 'E2E Traveller', email, password: PASSWORD });

    await expect(page.getByRole('heading', { name: /Welcome back, E2E Traveller/ })).toBeVisible();
  });

  test('editing the profile updates the displayed name', async ({ page }) => {
    const email = uniqueEmail('edit');
    await signUpViaUi(page, { displayName: 'Original Name', email, password: PASSWORD });

    await page.getByRole('link', { name: 'Profile', exact: true }).click();
    await page.waitForURL('**/dashboard/profile');
    await page.getByLabel('Full name').fill('Renamed Traveller');
    await page.getByRole('button', { name: 'Save changes' }).click();

    await page.waitForTimeout(500);
    await page.goto('/dashboard', { waitUntil: 'networkidle' });
    await expect(
      page.getByRole('heading', { name: /Welcome back, Renamed Traveller/ }),
    ).toBeVisible();
  });

  test('signing out ends the session and returns to login', async ({ page }) => {
    const email = uniqueEmail('logout');
    await signUpViaUi(page, { displayName: 'Logout Tester', email, password: PASSWORD });

    await page.getByRole('button', { name: 'Sign out' }).click();
    await page.waitForURL('**/login');
    await expect(page.getByRole('heading', { name: 'Sign in' })).toBeVisible();
  });
});

test.describe('sign-in and session persistence', () => {
  test('an existing account can sign in and the session survives navigation', async ({ page }) => {
    const email = uniqueEmail('persist');
    await signUpViaUi(page, { displayName: 'Persist Tester', email, password: PASSWORD });
    await page.getByRole('button', { name: 'Sign out' }).click();
    await page.waitForURL('**/login');

    await page.getByLabel('Email').fill(email);
    await page.getByLabel('Password').fill(PASSWORD);
    await page.getByRole('button', { name: 'Sign in' }).click();
    await page.waitForURL('**/dashboard');

    // Session persists across a fresh navigation, not just client router state.
    await page.goto('/dashboard/profile', { waitUntil: 'networkidle' });
    await expect(page.getByRole('heading', { name: 'Your profile' })).toBeVisible();
    await page.reload();
    await expect(page.getByRole('heading', { name: 'Your profile' })).toBeVisible();
  });

  test('invalid credentials show a generic error, never which field was wrong', async ({
    page,
  }) => {
    await page.goto('/login', { waitUntil: 'networkidle' });
    await page.getByLabel('Email').fill('nonexistent@example.test');
    await page.getByLabel('Password').fill('WrongPassword!');
    await page.getByRole('button', { name: 'Sign in' }).click();
    await expect(page.getByText('Invalid email or password.')).toBeVisible();
  });
});

test.describe('protected routes', () => {
  test('an unauthenticated visitor is redirected away from /dashboard', async ({ page }) => {
    await page.goto('/dashboard', { waitUntil: 'networkidle' });
    await page.waitForURL('**/login');
  });

  test('an unauthenticated visitor is redirected away from /dashboard/profile', async ({
    page,
  }) => {
    await page.goto('/dashboard/profile', { waitUntil: 'networkidle' });
    await page.waitForURL('**/login');
  });

  test('a signed-in traveller visiting /login is redirected to /dashboard', async ({ page }) => {
    const email = uniqueEmail('already-in');
    await signUpViaUi(page, { displayName: 'Already Signed In', email, password: PASSWORD });

    await page.goto('/login', { waitUntil: 'networkidle' });
    await page.waitForURL('**/dashboard');
  });
});

test.describe('mobile viewport (390×844)', () => {
  test.use({ viewport: { width: 390, height: 844 } });

  async function overflowOf(page: import('@playwright/test').Page): Promise<number> {
    return page.evaluate(
      () => document.documentElement.scrollWidth - document.documentElement.clientWidth,
    );
  }

  test('signup (both steps), dashboard and profile pages have no horizontal overflow', async ({
    page,
  }) => {
    const email = uniqueEmail('mobile');
    await page.goto('/signup', { waitUntil: 'networkidle' });
    expect(await overflowOf(page)).toBeLessThanOrEqual(10);

    await page.getByLabel('Email').fill(email);
    await page.getByLabel(/^Password/).fill(PASSWORD);
    await page.getByLabel('Confirm password').fill(PASSWORD);
    await page.getByRole('button', { name: 'Continue' }).click();

    // Step 2 (profile onboarding) — its own, separate screen.
    await expect(page.getByLabel('Full name')).toBeVisible();
    expect(await overflowOf(page)).toBeLessThanOrEqual(10);

    await page.getByLabel('Full name').fill('Mobile Tester');
    await page.getByRole('button', { name: 'Join Wander With Stars' }).click();
    await page.waitForURL('**/dashboard');

    expect(await overflowOf(page)).toBeLessThanOrEqual(10);

    await page.goto('/dashboard/profile', { waitUntil: 'networkidle' });
    expect(await overflowOf(page)).toBeLessThanOrEqual(10);
  });

  test('the sign-in form is keyboard accessible', async ({ page }) => {
    await page.goto('/login', { waitUntil: 'networkidle' });
    await page.getByLabel('Email').focus();
    await page.keyboard.type('keyboard@example.test');
    await page.keyboard.press('Tab');
    await page.keyboard.type('somepassword');
    await expect(page.getByLabel('Password')).toHaveValue('somepassword');
  });
});
