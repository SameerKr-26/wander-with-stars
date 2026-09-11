import type { ComponentPropsWithoutRef, ElementType, ReactNode } from 'react';

import { cn } from '@/lib/utils';

/**
 * Typography primitives.
 *
 * These exist for one reason: to stop font size, weight, tracking and leading
 * being retyped in every component. Nothing here decides how WWS looks — the
 * values come from styles/tokens.css.
 *
 * Visual level and HTML element are separate props on purpose. A section that
 * must be an <h2> for document structure can still be sized as a display
 * heading, without abusing heading levels for visual effect.
 */

/* -------------------------------------------------------------- headings */

type HeadingLevel = 'hero' | 'display' | '4xl' | '3xl' | '2xl' | 'xl';

const HEADING_STYLE: Record<HeadingLevel, { size: string; weight: string; track: string }> = {
  hero: {
    size: 'var(--text-hero)',
    weight: 'var(--weight-display)',
    track: 'var(--tracking-display)',
  },
  display: {
    size: 'var(--text-display)',
    weight: 'var(--weight-display)',
    track: 'var(--tracking-display)',
  },
  '4xl': {
    size: 'var(--text-4xl)',
    weight: 'var(--weight-heading)',
    track: 'var(--tracking-display)',
  },
  '3xl': {
    size: 'var(--text-3xl)',
    weight: 'var(--weight-heading)',
    track: 'var(--tracking-heading)',
  },
  '2xl': {
    size: 'var(--text-2xl)',
    weight: 'var(--weight-subheading)',
    track: 'var(--tracking-heading)',
  },
  xl: {
    size: 'var(--text-xl)',
    weight: 'var(--weight-subheading)',
    track: 'var(--tracking-heading)',
  },
};

export interface HeadingProps extends Omit<ComponentPropsWithoutRef<'h2'>, 'color'> {
  /** Visual size. Independent of the HTML element. */
  level?: HeadingLevel;
  /** HTML element, chosen for document structure rather than appearance. */
  as?: 'h1' | 'h2' | 'h3' | 'h4' | 'h5' | 'h6' | 'p' | 'span' | 'div';
  children: ReactNode;
}

export function Heading({
  level = '3xl',
  as: Tag = 'h2',
  className,
  style,
  children,
  ...props
}: HeadingProps) {
  const s = HEADING_STYLE[level];
  return (
    <Tag
      className={cn('text-text-primary text-balance', className)}
      style={{
        fontFamily: 'var(--font-display)',
        fontSize: s.size,
        fontWeight: s.weight,
        letterSpacing: s.track,
        lineHeight:
          level === 'hero' || level === 'display' ? 'var(--leading-tight)' : 'var(--leading-snug)',
        ...style,
      }}
      {...props}
    >
      {children}
    </Tag>
  );
}

/* ------------------------------------------------------------------ text */

type TextVariant = 'lead' | 'body' | 'small' | 'label' | 'meta';

const TEXT_STYLE: Record<TextVariant, { size: string; weight: string; leading: string }> = {
  lead: { size: 'var(--text-lg)', weight: 'var(--weight-body)', leading: 'var(--leading-normal)' },
  body: {
    size: 'var(--text-base)',
    weight: 'var(--weight-body)',
    leading: 'var(--leading-normal)',
  },
  small: { size: 'var(--text-sm)', weight: 'var(--weight-body)', leading: 'var(--leading-normal)' },
  label: { size: 'var(--text-sm)', weight: 'var(--weight-label)', leading: 'var(--leading-snug)' },
  meta: { size: 'var(--text-xs)', weight: 'var(--weight-body)', leading: 'var(--leading-normal)' },
};

/** Semantic colour roles. `brand` is safe at body size; `brandDisplay` is not. */
type TextTone =
  'primary' | 'secondary' | 'muted' | 'brand' | 'brandStrong' | 'onBrand' | 'onAccent';

const TONE_CLASS: Record<TextTone, string> = {
  primary: 'text-text-primary',
  secondary: 'text-text-secondary',
  muted: 'text-text-muted',
  brand: 'text-text-brand',
  brandStrong: 'text-text-brand-strong',
  onBrand: 'text-text-on-brand',
  onAccent: 'text-text-on-accent',
};

export interface TextProps extends Omit<ComponentPropsWithoutRef<'p'>, 'color'> {
  variant?: TextVariant;
  tone?: TextTone;
  as?: ElementType;
  /** Uppercase tracked label. Only meaningful with variant="label". */
  uppercase?: boolean;
  children: ReactNode;
}

export function Text({
  variant = 'body',
  tone = 'primary',
  as: Tag = 'p',
  uppercase = false,
  className,
  style,
  children,
  ...props
}: TextProps) {
  const s = TEXT_STYLE[variant];
  return (
    <Tag
      className={cn(TONE_CLASS[tone], uppercase && 'uppercase', className)}
      style={{
        fontSize: s.size,
        fontWeight: s.weight,
        lineHeight: s.leading,
        letterSpacing: uppercase ? 'var(--tracking-label)' : 'var(--tracking-normal)',
        ...style,
      }}
      {...props}
    >
      {children}
    </Tag>
  );
}
