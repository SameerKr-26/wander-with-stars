'use client';

import type { ComponentPropsWithoutRef, CSSProperties, ReactNode } from 'react';

import { cn } from '@/lib/utils';

import { Spinner } from './feedback';

/**
 * Button.
 *
 * Client Component: it attaches onClick to a native element, and React
 * Server Components cannot serialize a function prop across the server/client
 * boundary. Any component that renders `<button onClick>` (or similar) needs
 * this directive — omitting it fails at build time the first time the
 * component is actually used inside a page route, not before, which is how
 * this was missed until now (see components/ui/card.tsx for the same fix).
 *
 * Implements the approved three-elevation depth system: resting, hover
 * (stronger shadow plus a 1px lift), pressed (reduced shadow plus 0.98 scale).
 * Interaction states live in components/ui/ui.css because pseudo-states cannot
 * be inline; every value there reads from a token.
 *
 * ── On the `destructive` variant ────────────────────────────────────────────
 * The locked palette has no error or destructive colour: it is teal, yellow,
 * ivory, charcoal and white. Rather than invent a red, `destructive` uses a
 * solid charcoal fill — visually unmistakable against the teal primary, and
 * 15.97:1 against white text.
 *
 * That is a deliberate stopgap, not a design decision. Convention leads people
 * to expect red for irreversible actions, so a destructive colour should be
 * approved and added to the token layer before destructive actions ship. Until
 * then, pair this variant with explicit wording ("Cancel booking", not
 * "Confirm") and a confirmation step.
 * ───────────────────────────────────────────────────────────────────────────
 */

type ButtonVariant = 'primary' | 'secondary' | 'tertiary' | 'destructive';
type ButtonSize = 'sm' | 'md' | 'lg';

/** Every value is a token. No literal colours. */
const VARIANT_STYLE: Record<ButtonVariant, CSSProperties> = {
  /* White on teal-medium — 5.37:1. */
  primary: {
    background: 'var(--color-surface-brand)',
    color: 'var(--color-text-on-brand)',
    border: '1px solid transparent',
  },
  /* Outline. teal-text on ivory — 5.87:1. */
  secondary: {
    background: 'var(--color-surface)',
    color: 'var(--color-text-brand)',
    border: '1px solid var(--color-border-brand)',
  },
  /* Text action; no surface, no elevation. */
  tertiary: {
    background: 'transparent',
    color: 'var(--color-text-brand)',
    border: '1px solid transparent',
  },
  /* See the note above — charcoal, pending an approved destructive colour. */
  destructive: {
    background: 'var(--color-text-primary)',
    color: 'var(--color-text-on-brand)',
    border: '1px solid transparent',
  },
};

const SIZE_STYLE: Record<ButtonSize, CSSProperties> = {
  sm: { padding: 'var(--space-2) var(--space-4)', fontSize: 'var(--text-sm)' },
  md: { padding: 'var(--space-3) var(--space-5)', fontSize: 'var(--text-sm)' },
  lg: { padding: 'var(--space-4) var(--space-6)', fontSize: 'var(--text-base)' },
};

const SHARED_STYLE: CSSProperties = {
  borderRadius: 'var(--radius-control)',
  fontFamily: 'var(--font-body)',
  fontWeight: 'var(--weight-label)',
  lineHeight: 'var(--leading-snug)',
};

export interface ButtonProps extends Omit<ComponentPropsWithoutRef<'button'>, 'color'> {
  variant?: ButtonVariant;
  size?: ButtonSize;
  /** Shows a spinner, blocks activation, and announces busy state. */
  loading?: boolean;
  /** Accessible name announced while loading. */
  loadingLabel?: string;
  fullWidth?: boolean;
  children: ReactNode;
}

export function Button({
  variant = 'primary',
  size = 'md',
  loading = false,
  loadingLabel = 'Loading',
  fullWidth = false,
  disabled,
  onClick,
  className,
  style,
  children,
  ...props
}: ButtonProps) {
  const isTertiary = variant === 'tertiary';
  /* A loading button stays focusable but must not fire. `disabled` would move
     focus away mid-interaction, which is disorienting for keyboard and screen
     reader users, so aria-busy plus a click guard is used instead. */
  const inert = loading || disabled;

  return (
    <button
      type="button"
      disabled={disabled}
      aria-busy={loading || undefined}
      aria-disabled={inert || undefined}
      className={cn(
        'wws-button',
        isTertiary ? 'wws-button--flat' : 'wws-button--raised',
        'inline-flex items-center justify-center gap-2',
        'cursor-pointer select-none',
        'disabled:cursor-not-allowed disabled:opacity-45',
        fullWidth && 'w-full',
        className,
      )}
      style={{
        ...VARIANT_STYLE[variant],
        ...SIZE_STYLE[size],
        ...SHARED_STYLE,
        ...(loading ? { cursor: 'progress' } : {}),
        ...style,
      }}
      onClick={loading ? undefined : onClick}
      {...props}
    >
      {loading ? <Spinner size="sm" label={loadingLabel} /> : null}
      {children}
    </button>
  );
}

/* ------------------------------------------------------------ icon button */

export interface IconButtonProps extends Omit<ButtonProps, 'children' | 'fullWidth'> {
  /** Required: an icon-only control has no visible text to name it. */
  label: string;
  children: ReactNode;
}

/**
 * Icon-only button.
 *
 * `label` is mandatory and becomes the accessible name — an icon-only control
 * without one is invisible to screen readers. The icon itself is hidden from
 * assistive technology so the name is not announced twice.
 */
export function IconButton({
  label,
  variant = 'tertiary',
  size = 'md',
  className,
  style,
  children,
  ...props
}: IconButtonProps) {
  const padding =
    size === 'sm' ? 'var(--space-2)' : size === 'lg' ? 'var(--space-4)' : 'var(--space-3)';

  return (
    <Button
      variant={variant}
      size={size}
      aria-label={label}
      className={cn('aspect-square', className)}
      style={{ padding, ...style }}
      {...props}
    >
      <span aria-hidden="true" className="inline-flex">
        {children}
      </span>
    </Button>
  );
}
