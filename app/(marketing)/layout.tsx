import type { ReactNode } from 'react';

import { AppShell, SiteFooter, SiteHeader } from '@/components/layout';
import { getTravellerSession } from '@/lib/traveller/auth';

/**
 * Public / marketing layout.
 *
 * Wraps every public page — homepage, trips, community, stories, about — in
 * the site header and footer.
 *
 * This boundary is what keeps optional modules from polluting the public
 * shell (docs/MODULAR_FEATURE_ARCHITECTURE.md §4). The future dashboard, admin
 * and creator areas get their own route groups and their own layouts, so
 * removing any of them does not touch this file, and nothing internal leaks
 * into public navigation.
 *
 * `isAuthenticated` was hardcoded false because auth did not exist yet
 * (Phase 4). It now resolves the real session server-side
 * (`getTravellerSession()` — the same helper `/dashboard`'s own layout
 * uses, via the session-aware client, never the service role) and passes
 * it to `SiteHeader` as `account` — Phase 4.8A's global account-access
 * requirement. A Server Component layout can call this directly; no
 * client-side fetch, no flash of the wrong state on first paint.
 */
export default async function MarketingLayout({ children }: { children: ReactNode }) {
  const session = await getTravellerSession();
  const account = session ? { displayName: session.displayName, email: session.email ?? '' } : null;

  return (
    <AppShell header={<SiteHeader account={account} />} footer={<SiteFooter />}>
      {children}
    </AppShell>
  );
}
