import type { ComponentPropsWithoutRef, ElementType, ReactNode } from 'react';

import { cn } from '@/lib/utils';

/**
 * Layout primitives.
 *
 * Deliberately few. These three earn their place because every page needs the
 * same page width, the same vertical rhythm, and the same gap scale — and
 * because getting the side gutter wrong is the most common way a layout breaks
 * on a phone.
 *
 * A `Grid` primitive is intentionally absent: real grids differ per surface,
 * and wrapping CSS grid adds indirection without removing duplication.
 */

/* ------------------------------------------------------------- container */

export interface ContainerProps extends ComponentPropsWithoutRef<'div'> {
  as?: ElementType;
  /** `narrow` is for reading-width prose; `wide` for full-bleed-ish layouts. */
  width?: 'default' | 'narrow' | 'wide';
  children: ReactNode;
}

const CONTAINER_WIDTH = {
  default: 'var(--container-max)',
  narrow: '68ch',
  wide: '100%',
} as const;

export function Container({
  as: Tag = 'div',
  width = 'default',
  className,
  style,
  children,
  ...props
}: ContainerProps) {
  return (
    <Tag
      className={cn('mx-auto w-full', className)}
      style={{
        maxWidth: CONTAINER_WIDTH[width],
        /* Side gutter is set once, here. Vertical padding uses padding-block
           elsewhere so it can never zero the gutter out. */
        paddingInline: 'var(--container-gutter)',
        ...style,
      }}
      {...props}
    >
      {children}
    </Tag>
  );
}

/* ----------------------------------------------------------------- stack */

type SpaceToken = 1 | 2 | 3 | 4 | 5 | 6 | 8 | 10 | 12 | 16 | 20 | 24 | 32;

export interface StackProps extends ComponentPropsWithoutRef<'div'> {
  as?: ElementType;
  direction?: 'column' | 'row';
  gap?: SpaceToken;
  align?: 'start' | 'center' | 'end' | 'stretch' | 'baseline';
  justify?: 'start' | 'center' | 'end' | 'between';
  /** Rows wrap by default so narrow screens never force sideways scrolling. */
  wrap?: boolean;
  children: ReactNode;
}

const ALIGN = {
  start: 'flex-start',
  center: 'center',
  end: 'flex-end',
  stretch: 'stretch',
  baseline: 'baseline',
} as const;

const JUSTIFY = {
  start: 'flex-start',
  center: 'center',
  end: 'flex-end',
  between: 'space-between',
} as const;

/**
 * Flex layout with gaps from the spacing scale.
 *
 * Uses `gap` rather than per-child margins, so spacing cannot collapse or
 * double when children are conditionally rendered.
 */
export function Stack({
  as: Tag = 'div',
  direction = 'column',
  gap = 4,
  align,
  justify,
  wrap = true,
  className,
  style,
  children,
  ...props
}: StackProps) {
  return (
    <Tag
      className={cn('flex', className)}
      style={{
        flexDirection: direction,
        gap: `var(--space-${gap})`,
        ...(align ? { alignItems: ALIGN[align] } : {}),
        ...(justify ? { justifyContent: JUSTIFY[justify] } : {}),
        ...(direction === 'row' && wrap ? { flexWrap: 'wrap' } : {}),
        ...style,
      }}
      {...props}
    >
      {children}
    </Tag>
  );
}

/* --------------------------------------------------------------- section */

export interface SectionProps extends ComponentPropsWithoutRef<'section'> {
  /** Vertical rhythm. `tight` for dense areas, `loose` for cinematic ones. */
  spacing?: 'tight' | 'default' | 'loose';
  children: ReactNode;
}

const SECTION_SPACING = {
  tight: 'var(--space-12)',
  default: 'var(--space-20)',
  loose: 'var(--space-32)',
} as const;

/**
 * A page section with consistent vertical rhythm.
 *
 * `padding-block` rather than the `padding` shorthand, so it can never wipe out
 * the side gutter set by Container.
 */
export function Section({
  spacing = 'default',
  className,
  style,
  children,
  ...props
}: SectionProps) {
  return (
    <section
      className={className}
      style={{ paddingBlock: SECTION_SPACING[spacing], ...style }}
      {...props}
    >
      {children}
    </section>
  );
}

/* ------------------------------------------------------------- separator */

export interface SeparatorProps extends ComponentPropsWithoutRef<'div'> {
  orientation?: 'horizontal' | 'vertical';
  /** Decorative separators are hidden from assistive technology. */
  decorative?: boolean;
}

export function Separator({
  orientation = 'horizontal',
  decorative = true,
  className,
  style,
  ...props
}: SeparatorProps) {
  return (
    <div
      role={decorative ? 'none' : 'separator'}
      {...(decorative ? { 'aria-hidden': true } : { 'aria-orientation': orientation })}
      className={cn('bg-border shrink-0', className)}
      style={{
        width: orientation === 'horizontal' ? '100%' : '1px',
        height: orientation === 'horizontal' ? '1px' : '100%',
        ...style,
      }}
      {...props}
    />
  );
}
