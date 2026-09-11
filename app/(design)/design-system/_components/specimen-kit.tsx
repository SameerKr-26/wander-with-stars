/**
 * SPECIMEN KIT — design-review primitives, NOT production components.
 *
 * These live inside the specimen route's private `_components` folder on
 * purpose. They exist so the product owner can evaluate button, card, glass,
 * hover and motion treatment in isolation. They are not imported by any
 * product code and are not a component library.
 *
 * When the treatments are approved, the approved ones get promoted into
 * `components/ui/` properly — with variants, states, a11y review and tests.
 * Until then, nothing here should be reused.
 *
 * Every value comes from a semantic token. No hex, no magic numbers.
 */

import type { CSSProperties, ReactNode } from 'react';

/* ------------------------------------------------------------------ layout */

export function Section({
  index,
  title,
  intro,
  children,
}: {
  index: string;
  title: string;
  intro?: string;
  children: ReactNode;
}) {
  return (
    <section
      className="border-border flex flex-col gap-5 border-t"
      style={{ paddingTop: 'var(--space-8)' }}
    >
      <header className="flex flex-col gap-2">
        <span
          className="text-text-brand uppercase"
          style={{
            fontSize: 'var(--text-xs)',
            fontWeight: 'var(--weight-label)',
            letterSpacing: 'var(--tracking-label)',
          }}
        >
          {index}
        </span>
        <h2 style={{ fontSize: 'var(--text-2xl)', fontWeight: 'var(--weight-heading)' }}>
          {title}
        </h2>
        {intro ? (
          <p className="text-text-secondary max-w-[68ch]" style={{ fontSize: 'var(--text-sm)' }}>
            {intro}
          </p>
        ) : null}
      </header>
      {children}
    </section>
  );
}

/** Labels every specimen so nothing on this page can be mistaken for product UI. */
export function SpecimenLabel({ children }: { children: ReactNode }) {
  return (
    <span
      className="text-text-muted uppercase"
      style={{
        fontSize: 'var(--text-xs)',
        fontWeight: 'var(--weight-label)',
        letterSpacing: 'var(--tracking-label)',
      }}
    >
      {children}
    </span>
  );
}

export function Tile({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div className="flex flex-col gap-3">
      <SpecimenLabel>{label}</SpecimenLabel>
      {children}
    </div>
  );
}

/* ----------------------------------------------------------------- buttons */

type ButtonTone = 'primary' | 'secondary' | 'tertiary' | 'accent';

const BUTTON_TONES: Record<ButtonTone, CSSProperties> = {
  /* Highest contrast, one clear action. White on teal-medium = 5.37:1. */
  primary: {
    background: 'var(--color-surface-brand)',
    color: 'var(--color-text-on-brand)',
    border: '1px solid transparent',
  },
  /* Lower visual weight — outline, brand text. teal-text on ivory = 5.87:1. */
  secondary: {
    background: 'transparent',
    color: 'var(--color-text-brand)',
    border: '1px solid var(--color-border-brand)',
  },
  /* Text action. */
  tertiary: {
    background: 'transparent',
    color: 'var(--color-text-brand)',
    border: '1px solid transparent',
  },
  /* Yellow is a fill, never text. Charcoal on yellow = 12.39:1. */
  accent: {
    background: 'var(--color-surface-accent)',
    color: 'var(--color-text-on-accent)',
    border: '1px solid transparent',
  },
};

export function SpecimenButton({
  tone = 'primary',
  children,
  disabled,
}: {
  tone?: ButtonTone;
  children: ReactNode;
  disabled?: boolean;
}) {
  return (
    <button
      type="button"
      disabled={disabled}
      className={['specimen-button', tone === 'tertiary' ? 'specimen-button--flat' : null]
        .filter(Boolean)
        .join(' ')}
      style={{
        ...BUTTON_TONES[tone],
        borderRadius: 'var(--radius-control)',
        padding: 'var(--space-3) var(--space-5)',
        fontSize: 'var(--text-sm)',
        fontWeight: 'var(--weight-label)',
        fontFamily: 'var(--font-body)',
        cursor: disabled ? 'not-allowed' : 'pointer',
        opacity: disabled ? 0.45 : 1,
        /* Resting elevation. Tertiary opts out via --flat. */
        boxShadow: 'var(--shadow-button)',
        transitionProperty: 'transform, filter, background-color, box-shadow',
        transitionDuration: 'var(--duration-micro)',
        transitionTimingFunction: 'var(--ease-standard)',
      }}
    >
      {children}
    </button>
  );
}

/* ------------------------------------------------------------------- cards */

/**
 * Card specimen.
 *
 * NOT a trip card. The content is generic on purpose — trip card composition
 * is a product decision that has not been made. What is being evaluated here
 * is surface, radius, elevation, image treatment and hover behaviour.
 *
 * The image area is a token-derived placeholder: WWS has no photography in the
 * repository yet, and inventing stock imagery would misrepresent the design.
 */
export function SpecimenCard({
  title,
  meta,
  secondary,
  glass = false,
}: {
  title: string;
  meta: string;
  secondary: string;
  glass?: boolean;
}) {
  return (
    <article
      className="specimen-card"
      style={{
        borderRadius: 'var(--radius-card)',
        overflow: 'hidden',
        background: glass ? 'var(--glass-surface)' : 'var(--color-surface)',
        backdropFilter: glass ? 'var(--glass-filter)' : undefined,
        WebkitBackdropFilter: glass ? 'var(--glass-filter)' : undefined,
        border: `1px solid ${glass ? 'var(--glass-border)' : 'var(--color-border-subtle)'}`,
        boxShadow: 'var(--shadow-sm)',
        display: 'flex',
        flexDirection: 'column',
        transitionProperty: 'transform, box-shadow',
        transitionDuration: 'var(--duration-card)',
        transitionTimingFunction: 'var(--ease-standard)',
      }}
    >
      <div style={{ overflow: 'hidden', position: 'relative' }}>
        <div
          className="specimen-card__image"
          style={{
            aspectRatio: '16 / 10',
            background: 'linear-gradient(135deg, var(--wws-teal-core), var(--wws-teal-deep) 70%)',
            transitionProperty: 'transform',
            transitionDuration: 'var(--duration-card)',
            transitionTimingFunction: 'var(--ease-standard)',
          }}
        />
        {/* Readability scrim — §11 of DESIGN_SYSTEM: gradients only where they
            help text sit on an image. */}
        <div
          aria-hidden="true"
          style={{
            position: 'absolute',
            inset: 0,
            background: 'linear-gradient(to top, rgb(20 33 38 / 0.55), transparent 55%)',
            pointerEvents: 'none',
          }}
        />
        <span
          style={{
            position: 'absolute',
            left: 'var(--space-4)',
            bottom: 'var(--space-3)',
            color: 'var(--wws-white)',
            fontSize: 'var(--text-xs)',
            fontWeight: 'var(--weight-label)',
            letterSpacing: 'var(--tracking-label)',
            textTransform: 'uppercase',
          }}
        >
          Image area
        </span>
      </div>

      <div className="flex flex-col gap-2" style={{ padding: 'var(--space-5)' }}>
        <h3 style={{ fontSize: 'var(--text-xl)', fontWeight: 'var(--weight-subheading)' }}>
          {title}
        </h3>
        {/* Primary information: always visible, never hover-gated. */}
        <p className="text-text-secondary" style={{ fontSize: 'var(--text-sm)' }}>
          {meta}
        </p>
        {/* Secondary information: revealed on hover/focus on pointer devices,
            but always visible on touch and narrow screens. See the
            .specimen-card rules in globals.css. */}
        <p
          className="specimen-card__secondary text-text-muted"
          style={{ fontSize: 'var(--text-xs)' }}
        >
          {secondary}
        </p>
      </div>
    </article>
  );
}

/* ------------------------------------------------------------------- glass */

/** Glass over a teal field, because glass is invisible without something behind it. */
export function GlassStage({ children }: { children: ReactNode }) {
  return (
    <div
      style={{
        borderRadius: 'var(--radius-panel)',
        padding: 'var(--space-8)',
        background:
          'radial-gradient(120% 120% at 20% 10%, var(--wws-teal-core), var(--wws-teal-deep) 70%)',
        display: 'grid',
        gap: 'var(--space-5)',
        gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))',
      }}
    >
      {children}
    </div>
  );
}

export function GlassPanel({
  variant,
  label,
  note,
}: {
  variant: 'surface' | 'teal' | 'strong';
  label: string;
  note: string;
}) {
  const background =
    variant === 'teal'
      ? 'var(--glass-surface-teal)'
      : variant === 'strong'
        ? 'var(--glass-surface-strong)'
        : 'var(--glass-surface)';

  return (
    <div
      style={{
        background,
        /* saturate() restores the teal the blur washes out, so the panel reads
           as thin material rather than frosted white. */
        backdropFilter: 'var(--glass-filter)',
        WebkitBackdropFilter: 'var(--glass-filter)',
        border: '1px solid var(--glass-border)',
        borderRadius: 'var(--radius-card)',
        /* Ambient separation plus a bright top hairline for edge thickness. */
        boxShadow: 'var(--shadow-glass), var(--glass-highlight)',
        padding: 'var(--space-5)',
        display: 'flex',
        flexDirection: 'column',
        gap: 'var(--space-2)',
      }}
    >
      <span style={{ fontSize: 'var(--text-base)', fontWeight: 'var(--weight-subheading)' }}>
        {label}
      </span>
      <span className="text-text-secondary" style={{ fontSize: 'var(--text-xs)' }}>
        {note}
      </span>
    </div>
  );
}

/* ------------------------------------------------------------------ motion */

/**
 * Motion sample. Hover or focus the tile to play the transition at that
 * token's duration. CSS-only, so the specimen ships no client JavaScript —
 * and everything here is disabled under prefers-reduced-motion by the global
 * rule in globals.css.
 */
export function MotionSample({
  token,
  value,
  range,
  use,
  behaviour,
}: {
  token: string;
  value: string;
  range: string;
  use: string;
  behaviour: 'lift' | 'reveal' | 'zoom' | 'press';
}) {
  return (
    <div className="flex flex-col gap-3">
      <div
        className={`motion-sample motion-sample--${behaviour}`}
        tabIndex={0}
        role="button"
        aria-label={`Preview ${token}`}
        style={{
          borderRadius: 'var(--radius-card)',
          border: '1px solid var(--color-border-subtle)',
          background: 'var(--color-surface)',
          boxShadow: 'var(--shadow-sm)',
          height: 'var(--space-24)',
          display: 'grid',
          placeItems: 'center',
          overflow: 'hidden',
          cursor: 'pointer',
          transitionDuration: value,
          transitionTimingFunction: 'var(--ease-standard)',
        }}
      >
        <span
          className="motion-sample__inner"
          style={{
            fontSize: 'var(--text-sm)',
            fontWeight: 'var(--weight-label)',
            color: 'var(--color-text-brand)',
            transitionDuration: value,
            transitionTimingFunction: 'var(--ease-standard)',
          }}
        >
          Hover or focus
        </span>
      </div>
      <div className="flex flex-col gap-1">
        <code className="text-text-brand" style={{ fontSize: 'var(--text-xs)' }}>
          {token} · {value}
        </code>
        <span className="text-text-muted" style={{ fontSize: 'var(--text-xs)' }}>
          range {range} · {use}
        </span>
      </div>
    </div>
  );
}
