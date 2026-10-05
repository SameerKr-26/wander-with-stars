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
      // The well-known local Supabase demo service-role JWT (same on every
      // developer's machine, not secret — see docs/source-material/wws-live/README.md's
      // established precedent for this exact key). Explicitly overrides
      // .env.local's own SUPABASE_SERVICE_ROLE_KEY (which points at the
      // real/shared remote project) so lib/supabase/admin.ts authenticates
      // against the LOCAL stack this config's other overrides target —
      // without this, Phase 4.6/4.7's service-role writes (booking and
      // payment creation) would attempt to authenticate against the wrong
      // project entirely.
      SUPABASE_SERVICE_ROLE_KEY:
        'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZS1kZW1vIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImV4cCI6MTk4MzgxMjk5Nn0.EGIM96RAZx35lJzdJsyH-qQwv8Hdp7fsn3W0YpN81IU',
      // Phase 4.7: test-only Razorpay credentials. KEY_ID/KEY_SECRET are
      // deliberately invalid-but-well-formed — no test in tests/e2e-db/
      // exercises a real Razorpay API call (no live sandbox credentials
      // exist in this environment; see docs/ARCHITECTURE.md's Phase 4.7
      // section for the full, honest limitation). WEBHOOK_SECRET is real
      // and load-bearing: tests/e2e-db/webhook.spec.ts signs its own test
      // payloads with this exact value to exercise the webhook route's
      // signature verification for real.
      RAZORPAY_KEY_ID: 'rzp_test_e2e_placeholder',
      RAZORPAY_KEY_SECRET: 'e2e_placeholder_secret',
      RAZORPAY_WEBHOOK_SECRET: 'test-webhook-secret-for-e2e',
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
