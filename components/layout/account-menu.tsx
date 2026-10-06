'use client';

import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { useCallback, useEffect, useId, useRef, useState } from 'react';

import { Avatar, LinkButton, Text } from '@/components/ui';
import { createClient } from '@/lib/supabase/client';

/**
 * AccountMenu — global header account access (Phase 4.8A).
 *
 * The one place the header decides between "Log in / Sign up" and a
 * signed-in traveller's account control — driven entirely by the
 * `account` prop the server-rendered layout resolves
 * (`app/(marketing)/layout.tsx`'s own `getTravellerSession()` call), never
 * by a client-side fetch. Deliberately bypasses the `PRIMARY_NAV`/
 * `lib/navigation/site-navigation.ts` configuration system: that system
 * gates on `IMPLEMENTED_ROUTES`/feature flags built for content
 * navigation, and this phase's brief wants account access visible
 * unconditionally now — not behind a flag default that was still off.
 */

export interface AccountMenuAccount {
  displayName: string;
  email: string;
}

export function AccountMenu({ account }: { account: AccountMenuAccount | null }) {
  if (!account) return <LoggedOutControl />;
  return <LoggedInControl account={account} />;
}

/**
 * Logged-out state: "Log in" stays visible at every viewport width (the
 * brief's own requirement); "Sign up" is hidden on mobile here only
 * because `SiteHeader`'s mobile panel already renders its own full-width
 * "Sign up" button when logged out (see that file) — the same
 * `hidden md:inline-flex` pattern the existing primary-action CTA already
 * uses, not a second, competing visual language.
 */
function LoggedOutControl() {
  return (
    <div className="flex items-center" style={{ gap: 'var(--space-3)' }}>
      <Link
        href="/login"
        className="wws-nav-link"
        style={{
          color: 'var(--color-text-primary)',
          fontSize: 'var(--text-sm)',
          fontWeight: 'var(--weight-label)',
        }}
      >
        Log in
      </Link>
      <LinkButton href="/signup" size="sm" className="hidden md:inline-flex">
        Sign up
      </LinkButton>
    </div>
  );
}

function LoggedInControl({ account }: { account: AccountMenuAccount }) {
  const pathname = usePathname();
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [menuPathname, setMenuPathname] = useState(pathname);
  const menuId = useId();
  const containerRef = useRef<HTMLDivElement>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);

  const close = useCallback((options: { returnFocus?: boolean } = {}) => {
    setOpen(false);
    if (options.returnFocus) triggerRef.current?.focus();
  }, []);

  /* Close on navigation — this component, like SiteHeader's own mobile
     panel, persists across client-side route changes (it lives in a
     layout, not a page), so an open dropdown would otherwise survive a
     "My Trips"/"Profile" click into the next page. Derived during render,
     the same pattern SiteHeader already uses, for the same reason: it is
     React's documented way to reset state from a changing prop without an
     extra render pass. */
  if (pathname !== menuPathname) {
    setMenuPathname(pathname);
    setOpen(false);
  }

  useEffect(() => {
    if (!open) return;

    function onKeyDown(event: KeyboardEvent) {
      if (event.key === 'Escape') close({ returnFocus: true });
    }
    function onPointerDown(event: PointerEvent) {
      if (!containerRef.current?.contains(event.target as Node)) close();
    }

    document.addEventListener('keydown', onKeyDown);
    document.addEventListener('pointerdown', onPointerDown);
    return () => {
      document.removeEventListener('keydown', onKeyDown);
      document.removeEventListener('pointerdown', onPointerDown);
    };
  }, [open, close]);

  async function handleLogout() {
    // Mirrors components/account/sign-out-button.tsx's own sign-out logic
    // exactly — that component already duplicates app/admin's own
    // equivalent for the same reason: four lines is cheaper to keep in
    // sync by inspection than to extract for a single shared call site.
    const supabase = createClient();
    await supabase.auth.signOut();
    router.push('/login');
    router.refresh();
  }

  return (
    <div ref={containerRef} className="wws-account-menu" style={{ position: 'relative' }}>
      <button
        ref={triggerRef}
        type="button"
        aria-haspopup="menu"
        aria-expanded={open}
        aria-controls={menuId}
        // Overrides subtree-derived naming entirely (per the accessible-name
        // algorithm, aria-label always wins over content) — Avatar's own
        // internal sr-only name span would otherwise also contribute to
        // this button's computed name, duplicating it.
        aria-label={`Account menu for ${account.displayName}`}
        onClick={() => setOpen((o) => !o)}
        className="wws-account-trigger"
        style={{
          display: 'inline-flex',
          padding: 0,
          border: 'none',
          background: 'transparent',
          borderRadius: 'var(--radius-pill)',
          cursor: 'pointer',
        }}
      >
        <Avatar name={account.displayName} size="sm" aria-hidden="true" />
      </button>

      {open ? (
        <div
          id={menuId}
          role="menu"
          aria-label="Account"
          className="wws-account-panel"
          style={{
            position: 'absolute',
            right: 0,
            top: 'calc(100% + var(--space-2))',
            width: '240px',
            maxWidth: 'calc(100vw - var(--container-gutter) * 2)',
            background: 'var(--color-surface)',
            border: '1px solid var(--color-border-subtle)',
            borderRadius: 'var(--radius-panel)',
            boxShadow: 'var(--shadow-md)',
            padding: 'var(--space-3)',
            zIndex: 60,
          }}
        >
          <div style={{ padding: 'var(--space-2) var(--space-3)' }}>
            <Text style={{ fontWeight: 'var(--weight-subheading)' }}>{account.displayName}</Text>
            <Text variant="small" tone="muted">
              {account.email}
            </Text>
          </div>
          <hr
            style={{
              border: 'none',
              borderTop: '1px solid var(--color-border-subtle)',
              margin: 'var(--space-2) 0',
            }}
          />
          <MenuLink href="/dashboard" onNavigate={() => close()}>
            My Trips
          </MenuLink>
          <MenuLink href="/dashboard/profile" onNavigate={() => close()}>
            Profile
          </MenuLink>
          <button
            type="button"
            role="menuitem"
            onClick={handleLogout}
            className="wws-account-menu-item"
            style={{
              display: 'block',
              width: '100%',
              textAlign: 'left',
              padding: 'var(--space-2) var(--space-3)',
              borderRadius: 'var(--radius-control)',
              border: 'none',
              background: 'transparent',
              color: 'var(--color-text-primary)',
              fontSize: 'var(--text-sm)',
              fontWeight: 'var(--weight-label)',
              cursor: 'pointer',
            }}
          >
            Log out
          </button>
        </div>
      ) : null}
    </div>
  );
}

function MenuLink({
  href,
  onNavigate,
  children,
}: {
  href: string;
  onNavigate: () => void;
  children: string;
}) {
  return (
    <Link
      href={href}
      role="menuitem"
      onClick={onNavigate}
      className="wws-account-menu-item"
      style={{
        display: 'block',
        padding: 'var(--space-2) var(--space-3)',
        borderRadius: 'var(--radius-control)',
        color: 'var(--color-text-primary)',
        fontSize: 'var(--text-sm)',
        fontWeight: 'var(--weight-label)',
      }}
    >
      {children}
    </Link>
  );
}
