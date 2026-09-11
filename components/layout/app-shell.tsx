import type { ReactNode } from 'react';

import { cn } from '@/lib/utils';

import './layout.css';

/**
 * Shell pieces shared by every production layout.
 *
 * `AppShell` owns the page frame — landmarks, skip link, and the column that
 * keeps the footer at the bottom on short pages. Each route group composes it
 * with its own header and footer, so the public shell, the future dashboard
 * and the future admin area share structure without sharing chrome
 * (docs/MODULAR_FEATURE_ARCHITECTURE.md §4).
 */

/**
 * Skip link.
 *
 * Visually hidden until focused, so a keyboard user's first Tab offers a way
 * past the navigation rather than forcing them through every link on every
 * page. Targets the `<main>` rendered by AppShell.
 */
export function SkipLink({ targetId = 'main-content' }: { targetId?: string }) {
  return (
    <a
      href={`#${targetId}`}
      className="sr-only focus:not-sr-only focus:absolute focus:z-[100]"
      style={{
        top: 'var(--space-3)',
        left: 'var(--space-3)',
        background: 'var(--color-surface)',
        color: 'var(--color-text-brand-strong)',
        border: '1px solid var(--color-border-brand)',
        borderRadius: 'var(--radius-control)',
        padding: 'var(--space-3) var(--space-4)',
        fontSize: 'var(--text-sm)',
        fontWeight: 'var(--weight-label)',
      }}
    >
      Skip to content
    </a>
  );
}

export interface AppShellProps {
  header?: ReactNode;
  footer?: ReactNode;
  children: ReactNode;
  /** Id of the main landmark; the skip link points here. */
  mainId?: string;
  className?: string;
}

export function AppShell({
  header,
  footer,
  children,
  mainId = 'main-content',
  className,
}: AppShellProps) {
  return (
    <div className={cn('flex min-h-dvh flex-col', className)}>
      <SkipLink targetId={mainId} />
      {header}
      {/* tabIndex={-1} so the skip link can move focus here, not just scroll.
          Without it the target is scrolled to but focus stays behind. */}
      <main id={mainId} tabIndex={-1} className="flex-1 focus:outline-none">
        {children}
      </main>
      {footer}
    </div>
  );
}

export interface PageProps {
  children: ReactNode;
  /** Page width. `narrow` is reading width for prose-heavy pages. */
  width?: 'default' | 'narrow' | 'wide';
  /** Vertical rhythm inside the page. */
  spacing?: 'none' | 'tight' | 'default' | 'loose';
  className?: string;
}

const PAGE_WIDTH = {
  default: 'var(--container-max)',
  narrow: '68ch',
  wide: '100%',
} as const;

const PAGE_SPACING = {
  none: '0',
  tight: 'var(--space-8)',
  default: 'var(--space-12)',
  loose: 'var(--space-20)',
} as const;

/**
 * Standard page body.
 *
 * The side gutter is set once here, and vertical space uses `padding-block`
 * so it can never collapse the gutter — the most common way a layout ends up
 * flush against the edge of a phone screen.
 *
 * Full-bleed sections (a hero, an image band) opt out by rendering outside
 * this wrapper rather than by fighting its padding.
 */
export function Page({ children, width = 'default', spacing = 'default', className }: PageProps) {
  return (
    <div
      className={cn('mx-auto w-full', className)}
      style={{
        maxWidth: PAGE_WIDTH[width],
        paddingInline: 'var(--container-gutter)',
        paddingBlock: PAGE_SPACING[spacing],
      }}
    >
      {children}
    </div>
  );
}
