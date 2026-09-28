import { defineConfig, devices } from '@playwright/test';

/**
 * Playwright — database-backed catalogue verification (Phase 4.4B).
 *
 * A deliberately separate config/testDir from playwright.config.ts /
 * tests/e2e/, which stays exactly as it was: fixtures-mode content
 * (`sample-northern-vietnam` etc.), unaffected by this file. This config's
 * own webServer sets `CONTENT_SOURCE=database` and points at the local
 * Supabase stack (`npx supabase start` must already be running with the
 * live catalogue seeded and published — see
 * docs/source-material/wws-live/README.md) rather than assuming an
 * already-running dev server is in the right mode.
 *
 * Run with: npx playwright test --config=playwright.db.config.ts
 */
export default defineConfig({
  testDir: './tests/e2e-db',
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 1 : 0,
  reporter: 'list',
  use: {
    baseURL: 'http://localhost:3000',
    trace: 'on-first-retry',
  },
  webServer: {
    command: 'npm run dev',
    url: 'http://localhost:3000',
    reuseExistingServer: true,
    timeout: 60_000,
    env: {
      CONTENT_SOURCE: 'database',
      NEXT_PUBLIC_SUPABASE_URL: 'http://127.0.0.1:54321',
      NEXT_PUBLIC_SUPABASE_ANON_KEY:
        'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZS1kZW1vIiwicm9sZSI6ImFub24iLCJleHAiOjE5ODM4MTI5OTZ9.CRXP1A7WOeoJeXxjNni43kdQwgnWNReilDMblYTn_I0',
    },
  },
  projects: [
    {
      name: 'desktop',
      use: { viewport: { width: 1280, height: 800 } },
    },
    {
      name: 'mobile',
      use: { ...devices['iPhone 13'], viewport: { width: 390, height: 844 } },
    },
  ],
});
