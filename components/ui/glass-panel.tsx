import type { ComponentPropsWithoutRef, ReactNode } from 'react';

import { cn } from '@/lib/utils';

/**
 * GlassPanel — thin translucent material.
 *
 * docs/WWS_VISUAL_IDENTITY.md §9: glass is an accent, not the dominant
 * language. Reserve it for floating panels, sticky navigation, image overlays
 * and selected filters. Most surfaces should be a plain `Card`.
 *
 * Glass only reads as glass over something. On a flat ivory background it is
 * an expensive way to draw a near-white box — put it over imagery or a teal
 * field, or use Card instead.
 *
 * Readability is why the variants exist rather than a freeform opacity prop.
 * At 32% over the darkest part of the teal field, charcoal text measures
 * 4.69:1 — AA at body size, and the floor. `strong` (48%) is for panels
 * carrying dense or small text.
 */

type GlassVariant = 'default' | 'tinted' | 'strong';

const VARIANT_SURFACE: Record<GlassVariant, string> = {
  default: 'var(--glass-surface)',
  tinted: 'var(--glass-surface-teal)',
  strong: 'var(--glass-surface-strong)',
};

export interface GlassPanelProps extends ComponentPropsWithoutRef<'div'> {
  variant?: GlassVariant;
  radius?: 'card' | 'panel';
  /** Stronger blur for large hero-scale panels. */
  intense?: boolean;
  children: ReactNode;
}

export function GlassPanel({
  variant = 'default',
  radius = 'card',
  intense = false,
  className,
  style,
  children,
  ...props
}: GlassPanelProps) {
  return (
    <div
      className={cn('relative', className)}
      style={{
        background: VARIANT_SURFACE[variant],
        /* saturate() restores the colour heavy blurring washes out, so what is
           behind the panel still reads as WWS teal rather than grey. */
        backdropFilter: intense ? 'var(--glass-filter-strong)' : 'var(--glass-filter)',
        WebkitBackdropFilter: intense ? 'var(--glass-filter-strong)' : 'var(--glass-filter)',
        border: '1px solid var(--glass-border)',
        borderRadius: `var(--radius-${radius})`,
        /* Ambient separation, plus a bright top hairline that reads as edge
           thickness rather than a drawn outline. */
        boxShadow: 'var(--shadow-glass), var(--glass-highlight)',
        padding: 'var(--space-5)',
        color: 'var(--color-text-primary)',
        ...style,
      }}
      {...props}
    >
      {children}
    </div>
  );
}
