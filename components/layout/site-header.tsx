'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useCallback, useEffect, useId, useRef, useState } from 'react';

import { Button } from '@/components/ui';
import {
  isActive,
  visibleItems,
  type NavContext,
  type NavItem,
  PRIMARY_NAV,
} from '@/lib/navigation/site-navigation';
import { cn } from '@/lib/utils';

/**
 * Site header — structure and behaviour, not the finished navigation design.
 *
 * The cinematic treatment described in docs/WWS_VISUAL_IDENTITY.md §15 is a
 * later pass. What exists here is the architecture that pass will need:
 *
 *   data-scrolled    top-of-page vs scrolled        (states 1 and 2)
 *   data-compact     compressed                     (state 3)
 *   data-menu-open   mobile menu open               (state 5)
 *
 * All three are applied in components/layout/layout.css from tokens, so the
 * visual refinement is a stylesheet and token change rather than a rewrite of
 * this component.
 *
 * Navigation content comes from lib/navigation/site-navigation.ts. Nothing is
 * hardcoded here, so disabling a feature module removes its entries with no
 * edit to this file and no reserved gap
 * (docs/MODULAR_FEATURE_ARCHITECTURE.md §3, §10).
 */

export interface SiteHeaderProps extends NavContext {
  /**
   * Already-resolved navigation items. Defaults to the configured primary
   * navigation, filtered for this context.
   *
   * A seam rather than a feature: it lets the header be exercised against a
   * known set of items without mocking the configuration module, and lets a
   * future route group supply its own navigation without a second header.
   */
  items?: readonly NavItem[];
  /** Compress the header once scrolled. Off by default so a tall hero can opt out. */
  compactOnScroll?: boolean;
  /** Scroll distance before the header switches to its scrolled state. */
  scrollThreshold?: number;
}

export function SiteHeader({
  isAuthenticated = false,
  items: providedItems,
  compactOnScroll = true,
  scrollThreshold = 24,
}: SiteHeaderProps) {
  const pathname = usePathname();
  const [scrolled, setScrolled] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const [menuPathname, setMenuPathname] = useState(pathname);
  const menuId = useId();
  const triggerRef = useRef<HTMLButtonElement>(null);

  const items = providedItems ?? visibleItems(PRIMARY_NAV, { isAuthenticated });
  const primaryAction = items.find((item) => item.emphasis === 'primary');
  const links = items.filter((item) => item.emphasis !== 'primary');

  /* Early in the build most destinations do not exist yet, so navigation can
     legitimately be empty. Render nothing rather than an empty landmark or a
     menu button that opens onto nothing — §10 of the modular architecture
     doc: no reserved gaps for features that are not there. */
  const hasNav = links.length > 0;
  const hasMobileMenu = hasNav || primaryAction !== undefined;

  /* Scroll state. Reads are passive and coalesced into an animation frame, so
     a fast scroll cannot queue up layout work on the main thread. */
  useEffect(() => {
    let frame = 0;

    const update = () => {
      frame = 0;
      setScrolled(window.scrollY > scrollThreshold);
    };

    const onScroll = () => {
      if (frame === 0) frame = window.requestAnimationFrame(update);
    };

    update();
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => {
      window.removeEventListener('scroll', onScroll);
      if (frame !== 0) window.cancelAnimationFrame(frame);
    };
  }, [scrollThreshold]);

  const closeMenu = useCallback((options: { returnFocus?: boolean } = {}) => {
    setMenuOpen(false);
    if (options.returnFocus) triggerRef.current?.focus();
  }, []);

  /* Escape closes the menu and returns focus to the trigger, so a keyboard
     user is not dropped at the top of the document. */
  useEffect(() => {
    if (!menuOpen) return;

    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') closeMenu({ returnFocus: true });
    };

    document.addEventListener('keydown', onKeyDown);
    return () => document.removeEventListener('keydown', onKeyDown);
  }, [menuOpen, closeMenu]);

  /* Close on navigation. Adjusted during render rather than in an effect —
     React's documented pattern for deriving state from a changing prop, and it
     avoids the extra render pass an effect would cause.
     A navigation is a disclosure, not a modal: no focus trap, and the page
     behind it stays reachable. */
  if (pathname !== menuPathname) {
    setMenuPathname(pathname);
    setMenuOpen(false);
  }

  return (
    <header
      className="wws-header"
      data-scrolled={scrolled}
      data-compact={compactOnScroll && scrolled}
      data-menu-open={menuOpen}
    >
      <div
        className="mx-auto flex w-full items-center justify-between gap-4"
        style={{
          maxWidth: 'var(--container-max)',
          paddingInline: 'var(--container-gutter)',
          minHeight: 'inherit',
          paddingBlock: 'var(--space-3)',
        }}
      >
        {/* Wordmark as text. The brand asset is pending replacement and must
            not be depended on (public/brand/README.md). */}
        <Link
          href="/"
          className="text-text-primary shrink-0"
          style={{
            fontFamily: 'var(--font-display)',
            fontSize: 'var(--text-base)',
            fontWeight: 'var(--weight-display)',
            letterSpacing: 'var(--tracking-heading)',
          }}
        >
          Wander With Stars
        </Link>

        {/* Desktop navigation. `md:` up — the mobile menu covers below that. */}
        {hasNav ? (
          <nav aria-label="Primary" className="hidden md:block">
            <ul className="flex items-center" style={{ gap: 'var(--space-6)' }}>
              {links.map((item) => (
                <li key={item.label}>
                  <NavLink item={item} pathname={pathname} />
                </li>
              ))}
            </ul>
          </nav>
        ) : null}

        <div className="flex items-center" style={{ gap: 'var(--space-3)' }}>
          {primaryAction ? (
            <Button
              size="sm"
              className="hidden md:inline-flex"
              onClick={() => {
                window.location.href = primaryAction.href;
              }}
            >
              {primaryAction.label}
            </Button>
          ) : null}

          {hasMobileMenu ? (
            <button
              ref={triggerRef}
              type="button"
              className="wws-button wws-button--flat text-text-primary md:hidden"
              /* Both halves of the disclosure contract: what it controls, and
               whether it is currently open. */
              aria-expanded={menuOpen}
              aria-controls={menuId}
              onClick={() => setMenuOpen((open) => !open)}
              style={{
                padding: 'var(--space-2)',
                borderRadius: 'var(--radius-control)',
                fontSize: 'var(--text-sm)',
                fontWeight: 'var(--weight-label)',
              }}
            >
              {menuOpen ? 'Close' : 'Menu'}
            </button>
          ) : null}
        </div>
      </div>

      {/* Mobile panel. Rendered only when open — an always-present hidden menu
          is a common source of stray tab stops. */}
      {menuOpen ? (
        <div
          id={menuId}
          className="wws-mobile-panel border-border-subtle border-t md:hidden"
          style={{ background: 'var(--color-surface)' }}
        >
          <nav
            aria-label="Primary"
            className="mx-auto w-full"
            style={{ maxWidth: 'var(--container-max)' }}
          >
            <ul
              className="flex flex-col"
              style={{
                paddingInline: 'var(--container-gutter)',
                paddingBlock: 'var(--space-4)',
                gap: 'var(--space-1)',
              }}
            >
              {links.map((item) => (
                <li key={item.label}>
                  <NavLink item={item} pathname={pathname} block />
                </li>
              ))}
              {primaryAction ? (
                <li style={{ marginTop: 'var(--space-3)' }}>
                  <Button fullWidth onClick={() => (window.location.href = primaryAction.href)}>
                    {primaryAction.label}
                  </Button>
                </li>
              ) : null}
            </ul>
          </nav>
        </div>
      ) : null}
    </header>
  );
}

function NavLink({
  item,
  pathname,
  block = false,
}: {
  item: NavItem;
  pathname: string;
  block?: boolean;
}) {
  const active = isActive(item, pathname);

  return (
    <Link
      href={item.href}
      /* aria-current is the accessible signal; the underline in layout.css is
         the visual one. Neither relies on colour. */
      aria-current={active ? 'page' : undefined}
      className={cn('wws-nav-link inline-block', block && 'w-full')}
      style={{
        color: active ? 'var(--color-text-brand-strong)' : 'var(--color-text-primary)',
        fontSize: 'var(--text-sm)',
        fontWeight: 'var(--weight-label)',
        paddingBlock: block ? 'var(--space-3)' : undefined,
        borderRadius: 'var(--radius-control)',
      }}
    >
      {item.label}
    </Link>
  );
}
