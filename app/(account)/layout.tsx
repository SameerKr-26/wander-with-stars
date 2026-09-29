import Link from 'next/link';
import type { ReactNode } from 'react';

import { AppShell, Page } from '@/components/layout';
import { Text } from '@/components/ui';

/**
 * Auth pages layout — login, signup, forgot-password, reset-password.
 *
 * Deliberately NOT wrapped in the marketing `SiteHeader`/`SiteFooter`
 * (`app/(marketing)/layout.tsx`): these are functional, single-purpose
 * pages (CONTROL world, docs/DESIGN_SYSTEM.md's "JOURNEY vs CONTROL"
 * distinction — see docs/ARCHITECTURE.md's "Traveller authentication"
 * section), not part of the cinematic public browsing experience, and the
 * phase brief is explicit: no public-navigation account UI beyond what is
 * architecturally natural. A small text link back to the homepage is the
 * only navigation this shell offers.
 */
export default function AccountLayout({ children }: { children: ReactNode }) {
  return (
    <AppShell>
      <Page width="narrow" spacing="loose">
        <div className="flex flex-col" style={{ gap: 'var(--space-8)', maxWidth: '360px' }}>
          <Link href="/" style={{ color: 'var(--color-text-brand)' }}>
            <Text style={{ fontWeight: 'var(--weight-heading)' }}>Wander With Stars</Text>
          </Link>
          {children}
        </div>
      </Page>
    </AppShell>
  );
}
