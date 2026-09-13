import Link from 'next/link';
import type { ComponentPropsWithoutRef, ReactNode } from 'react';

import { cn } from '@/lib/utils';

/**
 * LinkButton — a real navigation link styled as a Button.
 *
 * A separate component rather than an `as="a"` prop on Button: navigation and
 * action are different intents (docs/UX_INTERACTION_GUIDE.md distinguishes
 * them throughout), and a link needs no click handler, no loading state and no
 * `type="button"` — folding both into one component would mean every consumer
 * reasoning about which subset of props actually applies.
 *
 * No `'use client'`: `next/link` renders fine inside a Server Component, so a
 * page that only needs navigation CTAs — like the homepage sections built
 * against this — ships no client JS for them. `destructive` is deliberately
 * excluded: a destructive action is something that happens, not somewhere you
 * navigate to.
 */

type LinkButtonVariant = 'primary' | 'secondary' | 'tertiary';
type LinkButtonSize = 'sm' | 'md' | 'lg';

const VARIANT_STYLE: Record<LinkButtonVariant, React.CSSProperties> = {
  primary: {
    background: 'var(--color-surface-brand)',
    color: 'var(--color-text-on-brand)',
    border: '1px solid transparent',
  },
  secondary: {
    background: 'var(--color-surface)',
    color: 'var(--color-text-brand)',
    border: '1px solid var(--color-border-brand)',
  },
  tertiary: {
    background: 'transparent',
    color: 'var(--color-text-brand)',
    border: '1px solid transparent',
  },
};

const SIZE_STYLE: Record<LinkButtonSize, React.CSSProperties> = {
  sm: { padding: 'var(--space-2) var(--space-4)', fontSize: 'var(--text-sm)' },
  md: { padding: 'var(--space-3) var(--space-5)', fontSize: 'var(--text-sm)' },
  lg: { padding: 'var(--space-4) var(--space-6)', fontSize: 'var(--text-base)' },
};

export interface LinkButtonProps extends ComponentPropsWithoutRef<typeof Link> {
  variant?: LinkButtonVariant;
  size?: LinkButtonSize;
  fullWidth?: boolean;
  children: ReactNode;
}

export function LinkButton({
  variant = 'primary',
  size = 'md',
  fullWidth = false,
  className,
  style,
  children,
  ...props
}: LinkButtonProps) {
  const isTertiary = variant === 'tertiary';

  return (
    <Link
      className={cn(
        'wws-button',
        isTertiary ? 'wws-button--flat' : 'wws-button--raised',
        'inline-flex items-center justify-center gap-2',
        'cursor-pointer no-underline select-none',
        fullWidth && 'w-full',
        className,
      )}
      style={{
        ...VARIANT_STYLE[variant],
        ...SIZE_STYLE[size],
        borderRadius: 'var(--radius-control)',
        fontFamily: 'var(--font-body)',
        fontWeight: 'var(--weight-label)',
        lineHeight: 'var(--leading-snug)',
        boxShadow: isTertiary ? undefined : 'var(--shadow-button)',
        ...style,
      }}
      {...props}
    >
      {children}
    </Link>
  );
}
