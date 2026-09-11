import type { ComponentPropsWithoutRef, ReactNode } from 'react';

import { cn } from '@/lib/utils';

/**
 * Badge — a small status or metadata marker.
 *
 * `accent` is the yellow one. docs/WWS_VISUAL_IDENTITY.md §7 puts yellow at
 * roughly 5–10% of the visual field, so it marks the one thing that matters on
 * a surface — availability, a key number — not every label on the page.
 *
 * Badges are not buttons. If it is clickable it is a Button.
 */

type BadgeTone = 'neutral' | 'brand' | 'accent' | 'outline';

const TONE = {
  neutral: {
    background: 'var(--color-surface-sunk)',
    color: 'var(--color-text-secondary)',
    border: 'transparent',
  },
  /* White on teal-deep — 7.28:1. */
  brand: {
    background: 'var(--color-surface-brand-deep)',
    color: 'var(--color-text-on-brand)',
    border: 'transparent',
  },
  /* Charcoal on yellow — 12.39:1. Yellow as fill, never as text. */
  accent: {
    background: 'var(--color-surface-accent)',
    color: 'var(--color-text-on-accent)',
    border: 'transparent',
  },
  outline: {
    background: 'transparent',
    color: 'var(--color-text-brand)',
    border: 'var(--color-border-brand)',
  },
} as const;

export interface BadgeProps extends ComponentPropsWithoutRef<'span'> {
  tone?: BadgeTone;
  children: ReactNode;
}

export function Badge({ tone = 'neutral', className, style, children, ...props }: BadgeProps) {
  const t = TONE[tone];
  return (
    <span
      className={cn('inline-flex items-center whitespace-nowrap', className)}
      style={{
        background: t.background,
        color: t.color,
        border: `1px solid ${t.border}`,
        /* Pill is semantically right here — a badge is a token, not a panel. */
        borderRadius: 'var(--radius-pill)',
        padding: 'var(--space-1) var(--space-3)',
        fontSize: 'var(--text-xs)',
        fontWeight: 'var(--weight-label)',
        lineHeight: 'var(--leading-snug)',
        ...style,
      }}
      {...props}
    >
      {children}
    </span>
  );
}

/* ---------------------------------------------------------------- avatar */

export interface AvatarProps extends Omit<ComponentPropsWithoutRef<'span'>, 'children'> {
  /** Used for initials and as the accessible name. */
  name: string;
  src?: string | undefined;
  size?: 'sm' | 'md' | 'lg';
}

const AVATAR_SIZE = {
  sm: 'var(--space-8)',
  md: 'var(--space-10)',
  lg: 'var(--space-16)',
} as const;

/**
 * Avatar with initials fallback.
 *
 * Falls back to initials rather than a generic silhouette: WWS profile
 * visibility is opt-in (docs/PRODUCT_REQUIREMENTS.md §12), so many travellers
 * will have no photo and a page full of identical placeholders reads as broken.
 */
export function Avatar({ name, src, size = 'md', className, style, ...props }: AvatarProps) {
  const initials = name
    .trim()
    .split(/\s+/)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase() ?? '')
    .join('');

  return (
    <span
      className={cn('inline-flex shrink-0 items-center justify-center overflow-hidden', className)}
      style={{
        width: AVATAR_SIZE[size],
        height: AVATAR_SIZE[size],
        borderRadius: 'var(--radius-pill)',
        background: 'var(--color-surface-brand-deep)',
        color: 'var(--color-text-on-brand)',
        fontSize: size === 'lg' ? 'var(--text-lg)' : 'var(--text-xs)',
        fontWeight: 'var(--weight-label)',
        ...style,
      }}
      {...props}
    >
      {src ? (
        /* Avatar sources are arbitrary remote URLs. next/image would require
           whitelisting hosts in next.config, and which hosts those are is not
           known until the profile domain exists. Revisit in that milestone. */
        // eslint-disable-next-line @next/next/no-img-element
        <img src={src} alt={name} width={40} height={40} className="h-full w-full object-cover" />
      ) : (
        <>
          <span aria-hidden="true">{initials}</span>
          <span className="sr-only">{name}</span>
        </>
      )}
    </span>
  );
}
