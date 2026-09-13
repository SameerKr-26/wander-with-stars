import type { ComponentPropsWithoutRef, ReactNode } from 'react';

import { cn } from '@/lib/utils';

/**
 * Card — a generic surface.
 *
 * Deliberately not a trip card. Destination, price, dates, availability and
 * "who's going" belong to the travel domain and are built with it. This is the
 * surface, elevation and interaction behaviour those cards will sit on.
 *
 * Interactivity is a behaviour, not a look. An interactive card must still be
 * a real control: pass `href` or `onClick` and the card renders an anchor or
 * button internally, so it is focusable, keyboard-activatable and announced
 * correctly. A div with a click handler is not a card, it is a trap.
 */

type CardTone = 'surface' | 'sunk' | 'brand';

const TONE: Record<CardTone, { background: string; color: string; border: string }> = {
  surface: {
    background: 'var(--color-surface)',
    color: 'var(--color-text-primary)',
    border: 'var(--color-border-subtle)',
  },
  sunk: {
    background: 'var(--color-surface-sunk)',
    color: 'var(--color-text-primary)',
    border: 'transparent',
  },
  brand: {
    background: 'var(--color-surface-brand-deep)',
    color: 'var(--color-text-on-brand)',
    border: 'transparent',
  },
};

export interface CardProps extends Omit<ComponentPropsWithoutRef<'div'>, 'onClick'> {
  tone?: CardTone;
  /** Adds hover lift and pointer affordance. Requires href or onClick. */
  interactive?: boolean;
  /** Selected state — announced via aria-current, not colour alone. */
  selected?: boolean;
  disabled?: boolean;
  /** Removes inner padding, for cards whose first child is an ImageFrame. */
  flush?: boolean;
  children: ReactNode;
}

export function Card({
  tone = 'surface',
  interactive = false,
  selected = false,
  disabled = false,
  flush = false,
  className,
  style,
  children,
  ...props
}: CardProps) {
  const t = TONE[tone];

  return (
    <div
      className={cn(
        'wws-card relative flex flex-col overflow-hidden',
        interactive && !disabled && 'wws-card--interactive',
        disabled && 'wws-card--disabled',
        className,
      )}
      style={{
        background: t.background,
        color: t.color,
        /* Selection is carried by a heavier border as well as aria-current, so
           it never depends on colour alone (docs/DESIGN_SYSTEM.md §19). */
        border: `1px solid ${selected ? 'var(--color-border-brand)' : t.border}`,
        outline: selected ? '1px solid var(--color-border-brand)' : undefined,
        borderRadius: 'var(--radius-card)',
        boxShadow: 'var(--shadow-sm)',
        padding: flush ? undefined : 'var(--space-5)',
        opacity: disabled ? 0.55 : undefined,
        ...style,
      }}
      {...(selected ? { 'aria-current': true } : {})}
      {...props}
    >
      {children}
    </div>
  );
}

/* CardAction (the stretched-link control that makes a Card clickable) lives in
   its own file, card-action.tsx, because its onClick branch needs
   'use client' — keeping that directive out of this file lets a plain,
   non-interactive Card stay a Server Component. Re-exported from
   components/ui/index.ts as before, so nothing importing from there notices
   the split. */
