import type { ReactNode } from 'react';

import { AppShell, SiteFooter, SiteHeader } from '@/components/layout';

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
 * `isAuthenticated` is hardcoded false because auth does not exist yet
 * (Phase 4). It is threaded through as a prop rather than read here so that,
 * when sessions arrive, the change is one line in this layout — navigation
 * already knows how to respond to it.
 */
export default function MarketingLayout({ children }: { children: ReactNode }) {
  return (
    <AppShell header={<SiteHeader isAuthenticated={false} />} footer={<SiteFooter />}>
      {children}
    </AppShell>
  );
}
