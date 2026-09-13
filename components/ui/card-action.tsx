'use client';

import { cn } from '@/lib/utils';

/**
 * CardAction — the control that makes a Card clickable.
 *
 * Split from card.tsx so that file's plain `Card` can stay a Server
 * Component. This one needs 'use client': its `onClick` branch attaches a
 * handler to a native button, which React Server Components cannot serialize
 * across the boundary. The `href` branch renders a plain anchor and would work
 * without it, but the component can't opt out per-render, so the whole file
 * carries the directive.
 */

export interface CardActionProps {
  href?: string;
  onClick?: (() => void) | undefined;
  disabled?: boolean;
  /**
   * The card's accessible name. Rendered visually by the card's own heading;
   * this control stretches over the whole card so the entire surface is
   * clickable while only one focus stop exists.
   */
  label: string;
}

/**
 * Makes an entire Card activatable with a single focus stop.
 *
 * Place inside a `Card` alongside its content. The control covers the card via
 * a stretched pseudo-element, so text stays selectable and nested links keep
 * working, while keyboard users get exactly one tab stop rather than one per
 * element inside the card.
 */
export function CardAction({ href, onClick, disabled, label }: CardActionProps) {
  const className = 'after:absolute after:inset-0 after:content-[""] focus-visible:outline-none';

  if (href && !disabled) {
    return (
      <a href={href} className={className} aria-label={label}>
        <span className="sr-only">{label}</span>
      </a>
    );
  }

  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      className={cn(className, 'cursor-pointer disabled:cursor-not-allowed')}
      aria-label={label}
    >
      <span className="sr-only">{label}</span>
    </button>
  );
}
