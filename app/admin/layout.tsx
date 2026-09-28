import type { Metadata } from 'next';
import type { ReactNode } from 'react';

/**
 * Admin area shell — Phase 4.3.
 *
 * Deliberately its own route group under `app/admin/`, sibling to
 * `app/(marketing)/`, not nested inside it — the root `app/layout.tsx` is
 * the only thing both share (html/body/font/globals.css), so nothing here
 * ever renders `SiteHeader`/`SiteFooter` or otherwise leaks into the public
 * marketing shell, and nothing in the public shell links here (Phase 4.3's
 * own "do not add admin navigation to the public navbar" rule).
 *
 * This layout wraps BOTH `/admin/login` and every page under
 * `(protected)/` — it stays auth-agnostic on purpose so the login page
 * itself doesn't inherit a redirect-if-unauthenticated check that would
 * loop. See `(protected)/layout.tsx` for the actual session gate.
 */
export const metadata: Metadata = {
  title: 'WWS Admin',
  robots: { index: false, follow: false },
};

export default function AdminLayout({ children }: { children: ReactNode }) {
  return (
    <div
      style={{
        minHeight: '100dvh',
        background: 'var(--color-surface-sunk)',
        color: 'var(--color-text-primary)',
        fontFamily: 'var(--font-manrope), sans-serif',
      }}
    >
      {children}
    </div>
  );
}
