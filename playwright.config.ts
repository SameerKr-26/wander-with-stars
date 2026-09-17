import { defineConfig, devices } from '@playwright/test';

/**
 * Playwright — real-browser regression coverage for what jsdom cannot
 * verify: actual rendered visibility, a real viewport, and a genuine
 * click/keyboard/focus cycle (Phase 3.5C).
 *
 * This exists because jsdom's unit tests (tests/unit/**\/*.test.{ts,tsx},
 * vitest.config.mts) never caught either real-device bug this phase fixed:
 * jsdom has no layout engine, so it cannot fail on "the panel occupies zero
 * visible height" the way a real browser would, and every prior test
 * rendered the app directly rather than navigating a real page — so a
 * dev-server-level issue (see next.config.ts's `allowedDevOrigins` comment)
 * was invisible to the whole existing suite. This is a second, slower,
 * deliberately small layer on top of it, not a replacement.
 *
 * One project, one real mobile viewport (390×844, per the brief) — no
 * desktop/tablet projects added speculatively; add one only when a real
 * desktop-only regression needs this level of coverage.
 */
export default defineConfig({
  testDir: './tests/e2e',
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
  },
  projects: [
    {
      name: 'mobile',
      use: { ...devices['iPhone 13'], viewport: { width: 390, height: 844 } },
    },
  ],
});
