import type { Page } from '@playwright/test';

/**
 * Drives the real two-step signup UI (Phase 4.8A) end to end, landing on
 * `/dashboard`. Shared by every E2E spec that needs a freshly-created,
 * signed-in traveller — before this phase, each spec duplicated this
 * inline as a single-step flow; now that it's two real steps, one place
 * to update beats keeping four copies in sync by hand.
 *
 * Step 1 (account) is skipped automatically by the real app if a session
 * already exists (`components/account/signup-form.tsx`'s own mount-time
 * check) — this helper only ever starts from `/signup` while logged out,
 * so it always sees Step 1 first.
 */
export async function signUpViaUi(
  page: Page,
  { displayName, email, password }: { displayName: string; email: string; password: string },
): Promise<void> {
  await page.goto('/signup', { waitUntil: 'networkidle' });

  // Every required Field renders an accessible name like "Email
  // (required)" — plain substring matching (no `exact`) still works for
  // it, but "Password" would also substring-match "Confirm password", so
  // that one needs an anchored regex instead.
  await page.getByLabel('Email').fill(email);
  await page.getByLabel(/^Password/).fill(password);
  await page.getByLabel('Confirm password').fill(password);
  await page.getByRole('button', { name: 'Continue' }).click();

  await page.getByLabel('Full name').fill(displayName);
  await page.getByRole('button', { name: 'Join Wander With Stars' }).click();

  await page.waitForURL('**/dashboard');
}
