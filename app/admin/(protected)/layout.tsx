import Link from 'next/link';
import { redirect } from 'next/navigation';
import type { ReactNode } from 'react';

import { getAdminSession } from '@/lib/admin/auth';

import { AdminSignOutButton } from '../_components/admin-sign-out-button';

/**
 * Session gate for every real admin page — a UX convenience alongside
 * `lib/supabase/middleware.ts`'s own `/admin` redirect, NOT the security
 * boundary itself. The actual boundary is `lib/admin/authorize.ts`'s
 * `requireAdminRole`, called again by every Server Action independently
 * (docs/SECURITY.md §4: authorization must be enforced server-side,
 * re-checked at the point of action, not inferred from having reached a
 * page that happened to redirect correctly).
 */
export default async function ProtectedAdminLayout({ children }: { children: ReactNode }) {
  const session = await getAdminSession();
  if (!session) redirect('/admin/login');

  return (
    <div>
      <header
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          padding: 'var(--space-4) var(--space-6)',
          borderBottom: '1px solid var(--color-border)',
          background: 'var(--color-surface)',
        }}
      >
        <nav style={{ display: 'flex', gap: 'var(--space-5)', alignItems: 'center' }}>
          <strong>WWS Admin</strong>
          <Link href="/admin/trips" style={{ color: 'var(--color-text-brand)' }}>
            Trips
          </Link>
        </nav>
        <div style={{ display: 'flex', gap: 'var(--space-4)', alignItems: 'center' }}>
          <span style={{ fontSize: 'var(--text-sm)', color: 'var(--color-text-muted)' }}>
            {session.email} · {session.role}
          </span>
          <AdminSignOutButton />
        </div>
      </header>
      <main style={{ padding: 'var(--space-6)' }}>{children}</main>
    </div>
  );
}
