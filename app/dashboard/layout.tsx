import Link from 'next/link';
import { redirect } from 'next/navigation';
import type { ReactNode } from 'react';

import { SignOutButton } from '@/components/account/sign-out-button';
import { AppShell, Page } from '@/components/layout';
import { Text } from '@/components/ui';
import { createTravellerProfileAction } from '@/app/(account)/actions';
import { getTravellerSession } from '@/lib/traveller/auth';
import { createClient } from '@/lib/supabase/server';

/**
 * Session gate for every `/dashboard/*` page — the traveller equivalent of
 * `app/admin/(protected)/layout.tsx`. A UX convenience alongside
 * `lib/supabase/middleware.ts`'s own session-refresh pass (which does not
 * redirect `/dashboard`, only `/admin` — see that file's own matcher
 * comment for why this layout, not middleware, is where that boundary
 * belongs for traveller routes). The actual authorization boundary for any
 * future traveller data read/write is still each RLS policy
 * (`traveller_profiles`'s own-row policies today) plus, where a Server
 * Action exists, re-resolving the session there too
 * (`app/dashboard/actions.ts`) — never inferred from having reached a page
 * that redirected correctly.
 *
 * Defensive profile creation: `getTravellerSession` returns `null` for a
 * signed-in user with no profile row yet (a genuinely possible state — a
 * profile-creation call that failed after signup, or any future auth
 * method that doesn't go through `app/(account)/actions.ts`). Rather than
 * bounce that user back to login (confusing: they ARE signed in), this
 * creates the missing profile from their own auth email as a fallback
 * display name and re-resolves the session once, idempotently.
 */
export default async function DashboardLayout({ children }: { children: ReactNode }) {
  let session = await getTravellerSession();

  if (!session) {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) redirect('/login');

    await createTravellerProfileAction(user.email ?? 'Traveller');
    session = await getTravellerSession();
    if (!session) redirect('/login');
  }

  return (
    <AppShell>
      <header
        className="flex items-center justify-between"
        style={{
          padding: 'var(--space-4) var(--space-6)',
          borderBottom: '1px solid var(--color-border-subtle)',
          background: 'var(--color-surface)',
        }}
      >
        <nav className="flex items-center" style={{ gap: 'var(--space-5)' }}>
          <Link href="/dashboard" style={{ color: 'var(--color-text-brand)' }}>
            <Text style={{ fontWeight: 'var(--weight-heading)' }}>Wander With Stars</Text>
          </Link>
          <Link href="/dashboard/profile" style={{ color: 'var(--color-text-primary)' }}>
            Profile
          </Link>
        </nav>
        <div className="flex items-center" style={{ gap: 'var(--space-4)' }}>
          <Text variant="small" tone="secondary">
            {session.displayName}
          </Text>
          <SignOutButton />
        </div>
      </header>
      <Page spacing="default">{children}</Page>
    </AppShell>
  );
}
