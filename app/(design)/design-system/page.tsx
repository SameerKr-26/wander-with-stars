import type { Metadata } from 'next';
import Image from 'next/image';

import {
  GlassPanel,
  GlassStage,
  MotionSample,
  Section,
  SpecimenButton,
  SpecimenCard,
  SpecimenLabel,
  Tile,
} from './_components/specimen-kit';
import './specimen.css';

/**
 * DESIGN SYSTEM SPECIMEN — INTERNAL REVIEW SURFACE, NOT A PRODUCT PAGE.
 *
 * A design laboratory: each section isolates one part of the system so the
 * product owner can judge it before any real page exists. It is deliberately
 * not a homepage, not navigation, and not a component library.
 *
 * Contract: docs/WWS_VISUAL_IDENTITY.md. Every value shown is read from
 * styles/tokens.css — this page documents the tokens, it does not define them.
 *
 * Isolation: lives in the (design) route group with its own CSS and its own
 * private _components folder, so it deletes in one move
 * (docs/MODULAR_FEATURE_ARCHITECTURE.md §4). Not linked from anywhere.
 */

export const metadata: Metadata = {
  title: 'WWS Design System — Specimen',
  robots: { index: false, follow: false },
};

/* --------------------------------------------------------------------------
 * Contrast maths — local to the specimen. This documents the palette; it is
 * not a utility for product code.
 * ----------------------------------------------------------------------- */

function relativeLuminance(hex: string): number {
  const channels = [0, 2, 4]
    .map((i) => parseInt(hex.slice(1 + i, 3 + i), 16) / 255)
    .map((v) => (v <= 0.03928 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4)));
  return 0.2126 * (channels[0] ?? 0) + 0.7152 * (channels[1] ?? 0) + 0.0722 * (channels[2] ?? 0);
}

function contrastRatio(a: string, b: string): number {
  const la = relativeLuminance(a);
  const lb = relativeLuminance(b);
  const [hi, lo] = la > lb ? [la, lb] : [lb, la];
  return (hi + 0.05) / (lo + 0.05);
}

function verdict(ratio: number): { label: string; tone: 'pass' | 'limited' | 'fail' } {
  if (ratio >= 7) return { label: 'AAA', tone: 'pass' };
  if (ratio >= 4.5) return { label: 'AA body', tone: 'pass' };
  if (ratio >= 3) return { label: 'Large / UI only', tone: 'limited' };
  return { label: 'Fails — never use', tone: 'fail' };
}

/* --------------------------------------------------------------------------
 * Specimen data. Hex values appear here because this page's job is to document
 * the palette; the rendered UI is styled from semantic tokens throughout.
 * ----------------------------------------------------------------------- */

const BRAND = {
  tealCore: '#0497B2',
  tealMedium: '#00758A',
  tealText: '#006D7A',
  tealDeep: '#005F73',
  yellow: '#FEDE59',
  ivory: '#FFFBF5',
  charcoal: '#142126',
  white: '#FFFFFF',
} as const;

const CORE_PALETTE = [
  {
    name: 'WWS Teal',
    hex: BRAND.tealCore,
    token: '--wws-teal-core',
    use: 'Core brand. Fills, icons, large display. Never body text.',
  },
  {
    name: 'WWS Yellow',
    hex: BRAND.yellow,
    token: '--wws-yellow-core',
    use: 'Core brand. Accent and fill only, 5–10% presence. Never text on light.',
  },
  { name: 'Warm Ivory', hex: BRAND.ivory, token: '--wws-ivory', use: 'Page base.' },
  { name: 'Deep Charcoal', hex: BRAND.charcoal, token: '--wws-charcoal', use: 'Default text.' },
  { name: 'White', hex: BRAND.white, token: '--wws-white', use: 'Elevated surfaces.' },
];

const TEAL_VARIANTS = [
  {
    name: 'Teal Medium',
    hex: BRAND.tealMedium,
    token: '--wws-teal-medium',
    use: 'Solid brand surfaces and buttons.',
    hsl: 'h189 s100% l27%',
  },
  {
    name: 'Teal Text',
    hex: BRAND.tealText,
    token: '--wws-teal-text',
    use: 'Body-size teal text and links.',
    hsl: 'h186 s100% l24%',
  },
  {
    name: 'Teal Deep',
    hex: BRAND.tealDeep,
    token: '--wws-teal-deep',
    use: 'Strongest teal, dark surfaces.',
    hsl: 'h190 s100% l23%',
  },
];

const COMBINATIONS = [
  { label: 'Charcoal on Ivory', fg: BRAND.charcoal, bg: BRAND.ivory, note: 'Default body text' },
  { label: 'Charcoal on White', fg: BRAND.charcoal, bg: BRAND.white, note: 'Body on cards' },
  {
    label: 'Charcoal on Yellow',
    fg: BRAND.charcoal,
    bg: BRAND.yellow,
    note: 'Accent buttons, badges',
  },
  { label: 'Teal Deep on Ivory', fg: BRAND.tealDeep, bg: BRAND.ivory, note: 'Strong links' },
  { label: 'Teal Text on Ivory', fg: BRAND.tealText, bg: BRAND.ivory, note: 'Body-size links' },
  { label: 'Teal Medium on Ivory', fg: BRAND.tealMedium, bg: BRAND.ivory, note: 'Labels' },
  { label: 'Teal Core on Ivory', fg: BRAND.tealCore, bg: BRAND.ivory, note: 'Large display only' },
  { label: 'White on Teal Deep', fg: BRAND.white, bg: BRAND.tealDeep, note: 'Buttons' },
  { label: 'White on Teal Medium', fg: BRAND.white, bg: BRAND.tealMedium, note: 'Primary button' },
  { label: 'White on Teal Core', fg: BRAND.white, bg: BRAND.tealCore, note: 'Large / UI only' },
  { label: 'Yellow on Teal Deep', fg: BRAND.yellow, bg: BRAND.tealDeep, note: 'Accent on dark' },
  { label: 'Yellow on Ivory', fg: BRAND.yellow, bg: BRAND.ivory, note: 'Forbidden as text' },
];

const WEIGHTS = [
  { weight: 400, role: 'Body, metadata', token: '--weight-body' },
  { weight: 500, role: 'Body emphasis', token: '--weight-emphasis' },
  { weight: 600, role: 'Labels, subheadings', token: '--weight-label' },
  { weight: 700, role: 'Major headings', token: '--weight-heading' },
  { weight: 800, role: 'Hero, display', token: '--weight-display' },
];

/** Locked scale. `px` is documentation only — rendering uses the token. */
const SCALE = [
  { token: '--text-display', px: 72, role: 'Display', weight: 800, sample: 'Wander' },
  { token: '--text-6xl', px: 60, role: '6xl', weight: 800, sample: 'Find your people' },
  { token: '--text-5xl', px: 48, role: '5xl', weight: 700, sample: 'Travel with people' },
  {
    token: '--text-4xl',
    px: 38,
    role: '4xl',
    weight: 700,
    sample: 'Meet your group before you fly',
  },
  { token: '--text-3xl', px: 30, role: '3xl', weight: 700, sample: 'Upcoming departures' },
  { token: '--text-2xl', px: 24, role: '2xl', weight: 600, sample: 'Who’s going' },
  { token: '--text-xl', px: 20, role: 'xl', weight: 600, sample: 'Vietnam Community Trip' },
  {
    token: '--text-lg',
    px: 18,
    role: 'lg',
    weight: 400,
    sample: 'You don’t need a group to join a group.',
  },
  {
    token: '--text-base',
    px: 16,
    role: 'body',
    weight: 400,
    sample: 'Seven days across Hanoi, Ha Long Bay and Ninh Binh.',
  },
  { token: '--text-sm', px: 14, role: 'sm', weight: 500, sample: '18–24 September · 6 nights' },
  {
    token: '--text-xs',
    px: 12,
    role: 'xs',
    weight: 400,
    sample: '23 travellers joining · 11 solo',
  },
];

const SPACING = [
  { token: '--space-1', px: 4 },
  { token: '--space-2', px: 8 },
  { token: '--space-3', px: 12 },
  { token: '--space-4', px: 16 },
  { token: '--space-5', px: 20 },
  { token: '--space-6', px: 24 },
  { token: '--space-8', px: 32 },
  { token: '--space-10', px: 40 },
  { token: '--space-12', px: 48 },
  { token: '--space-16', px: 64 },
  { token: '--space-20', px: 80 },
  { token: '--space-24', px: 96 },
  { token: '--space-32', px: 128 },
];

const RADII = [
  { token: '--radius-panel', label: '20px', use: 'Large feature panels' },
  { token: '--radius-card', label: '14px', use: 'Standard cards' },
  { token: '--radius-control', label: '12px', use: 'Buttons and inputs' },
  { token: '--radius-pill', label: 'pill', use: 'Only when semantically appropriate' },
];

const SURFACES = [
  { token: '--color-background', label: 'Background', note: 'Warm ivory page base' },
  { token: '--color-background-secondary', label: 'Background secondary', note: 'Pale teal wash' },
  { token: '--color-surface', label: 'Surface', note: 'Cards and panels' },
  { token: '--color-surface-sunk', label: 'Surface sunk', note: 'Recessed areas' },
  { token: '--color-surface-brand', label: 'Surface brand', note: 'Teal medium' },
  { token: '--color-surface-brand-deep', label: 'Surface brand deep', note: 'Teal deep' },
  { token: '--color-surface-accent', label: 'Surface accent', note: 'Yellow, fills only' },
];

const MOTION = [
  {
    token: '--duration-micro',
    value: '150ms',
    range: '120–180ms',
    use: 'Button press',
    behaviour: 'press' as const,
  },
  {
    token: '--duration-standard',
    value: '210ms',
    range: '180–240ms',
    use: 'Default transitions',
    behaviour: 'zoom' as const,
  },
  {
    token: '--duration-card',
    value: '270ms',
    range: '220–320ms',
    use: 'Card hover lift',
    behaviour: 'lift' as const,
  },
  {
    token: '--duration-reveal',
    value: '675ms',
    range: '600–750ms',
    use: 'Section reveal',
    behaviour: 'reveal' as const,
  },
];

/* ----------------------------------------------------------------------- */

function Swatch({
  hex,
  name,
  token,
  use,
  extra,
}: {
  hex: string;
  name: string;
  token: string;
  use: string;
  extra?: string;
}) {
  return (
    <div
      className="flex flex-col overflow-hidden"
      style={{
        borderRadius: 'var(--radius-card)',
        border: '1px solid var(--color-border-subtle)',
        background: 'var(--color-surface)',
      }}
    >
      <div style={{ background: hex, height: 'var(--space-16)' }} />
      <div className="flex flex-col gap-1" style={{ padding: 'var(--space-4)' }}>
        <span style={{ fontSize: 'var(--text-sm)', fontWeight: 'var(--weight-label)' }}>
          {name}
        </span>
        <code className="text-text-muted" style={{ fontSize: 'var(--text-xs)' }}>
          {hex} · {token}
        </code>
        {extra ? (
          <code className="text-text-muted" style={{ fontSize: 'var(--text-xs)' }}>
            {extra}
          </code>
        ) : null}
        <span className="text-text-secondary" style={{ fontSize: 'var(--text-xs)' }}>
          {use}
        </span>
      </div>
    </div>
  );
}

export default function DesignSystemSpecimen() {
  return (
    <main
      className="mx-auto flex flex-col"
      style={{
        maxWidth: 'var(--container-max)',
        paddingInline: 'var(--container-gutter)',
        paddingBlock: 'var(--space-16) var(--space-24)',
        gap: 'var(--space-16)',
      }}
    >
      {/* ================================================================ */}
      <header className="flex flex-col" style={{ gap: 'var(--space-4)' }}>
        <SpecimenLabel>Design laboratory · internal specimen · not a product page</SpecimenLabel>
        <h1
          style={{
            fontSize: 'var(--text-4xl)',
            fontWeight: 'var(--weight-display)',
            letterSpacing: 'var(--tracking-display)',
            lineHeight: 'var(--leading-tight)',
          }}
        >
          WWS design system
        </h1>
        <p className="text-text-secondary max-w-[68ch]" style={{ fontSize: 'var(--text-lg)' }}>
          Every section isolates one part of the visual system for review. Nothing here is a
          homepage, navigation, or production component.
        </p>
        <p className="text-text-muted max-w-[68ch]" style={{ fontSize: 'var(--text-sm)' }}>
          Contract: <code>docs/WWS_VISUAL_IDENTITY.md</code>. All values are read from{' '}
          <code>styles/tokens.css</code>; contrast figures are computed at render time from the
          locked palette, not copied from a table.
        </p>
      </header>

      {/* ================================================================ */}
      <Section
        index="01"
        title="Manrope against the wordmark"
        intro="§5 requires the typeface to be compared with the logo before it is locked. The mark is shown first, then the same word set in Manrope at display weights. Compare the ‘a’, ‘e’ and ‘r’ terminals and the overall geometric roundness."
      >
        <div
          className="flex items-center justify-center overflow-hidden"
          style={{
            borderRadius: 'var(--radius-panel)',
            background: 'var(--color-surface-brand-deep)',
            padding: 'var(--space-6)',
          }}
        >
          <Image
            src="/brand/Brand_logo.PNG"
            alt="Wander With Stars logo"
            width={420}
            height={420}
            priority
            style={{ width: 'min(420px, 100%)', height: 'auto' }}
          />
        </div>

        <div
          className="flex flex-col"
          style={{
            background: 'var(--color-surface)',
            border: '1px solid var(--color-border-subtle)',
            borderRadius: 'var(--radius-panel)',
            padding: 'var(--space-6)',
            boxShadow: 'var(--shadow-sm)',
            gap: 'var(--space-4)',
          }}
        >
          {[800, 700, 600].map((w) => (
            <div key={w} className="flex flex-wrap items-baseline gap-x-4 gap-y-1">
              <span
                style={{
                  fontSize: 'var(--text-6xl)',
                  fontWeight: w,
                  letterSpacing: 'var(--tracking-display)',
                  lineHeight: 'var(--leading-tight)',
                }}
              >
                wander
              </span>
              <span className="text-text-muted" style={{ fontSize: 'var(--text-xs)' }}>
                Manrope {w}
              </span>
            </div>
          ))}
          <p className="text-text-muted" style={{ fontSize: 'var(--text-sm)' }}>
            The wordmark is a custom treatment (§5), so an exact match is not expected. The question
            is whether Manrope sits comfortably beside it.
          </p>
        </div>
      </Section>

      {/* ================================================================ */}
      <Section
        index="02"
        title="Font weights"
        intro="The five locked weights. These are the only weights loaded — anything else would ship unused bytes."
      >
        <div className="flex flex-col">
          {WEIGHTS.map(({ weight, role, token }) => (
            <div
              key={weight}
              className="border-border-subtle flex flex-wrap items-baseline justify-between gap-2 border-b"
              style={{ paddingBlock: 'var(--space-4)' }}
            >
              <span style={{ fontSize: 'var(--text-2xl)', fontWeight: weight }}>
                Find your people
              </span>
              <span className="flex items-baseline" style={{ gap: 'var(--space-3)' }}>
                <code className="text-text-muted" style={{ fontSize: 'var(--text-xs)' }}>
                  {token}
                </code>
                <span className="text-text-secondary" style={{ fontSize: 'var(--text-sm)' }}>
                  {weight} · {role}
                </span>
              </span>
            </div>
          ))}
        </div>
      </Section>

      {/* ================================================================ */}
      <Section
        index="03"
        title="Type scale"
        intro="The locked scale, rendered from its tokens. Each specimen uses the weight its role calls for."
      >
        <div className="flex flex-col">
          {SCALE.map(({ token, px, role, weight, sample }) => (
            <div
              key={token}
              className="border-border-subtle flex flex-col gap-1 border-b"
              style={{ paddingBlock: 'var(--space-4)' }}
            >
              <div className="flex flex-wrap items-baseline" style={{ gap: 'var(--space-3)' }}>
                <code className="text-text-brand" style={{ fontSize: 'var(--text-xs)' }}>
                  {token}
                </code>
                <span className="text-text-muted" style={{ fontSize: 'var(--text-xs)' }}>
                  {px}px · {role} · weight {weight}
                </span>
              </div>
              <span
                style={{
                  fontSize: `var(${token})`,
                  fontWeight: weight,
                  letterSpacing:
                    px >= 38
                      ? 'var(--tracking-display)'
                      : px >= 20
                        ? 'var(--tracking-heading)'
                        : 'var(--tracking-normal)',
                  lineHeight:
                    px >= 38
                      ? 'var(--leading-tight)'
                      : px >= 20
                        ? 'var(--leading-snug)'
                        : 'var(--leading-normal)',
                }}
              >
                {sample}
              </span>
            </div>
          ))}
        </div>
      </Section>

      {/* ================================================================ */}
      <Section
        index="04"
        title="Responsive hero"
        intro="The hero sits outside the standard scale by intent. One token, three approved bands — resize the window and this specimen re-scales: mobile 42–60px, tablet 56–80px, desktop 64–112px."
      >
        <div
          className="flex flex-col"
          style={{
            background: 'var(--color-background-secondary)',
            border: '1px solid var(--color-border-subtle)',
            borderRadius: 'var(--radius-panel)',
            padding: 'var(--space-8)',
            gap: 'var(--space-4)',
          }}
        >
          <h3
            style={{
              fontSize: 'var(--text-hero)',
              fontWeight: 'var(--weight-display)',
              letterSpacing: 'var(--tracking-display)',
              lineHeight: 'var(--leading-tight)',
            }}
          >
            Find your people.
          </h3>
          <code className="text-text-brand" style={{ fontSize: 'var(--text-xs)' }}>
            --text-hero
          </code>
        </div>
        <div
          className="grid gap-3"
          style={{ gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))' }}
        >
          {[
            { band: 'Mobile', range: '42–60px', query: 'base' },
            { band: 'Tablet', range: '56–80px', query: 'min-width: 640px' },
            { band: 'Desktop', range: '64–112px', query: 'min-width: 1024px' },
          ].map(({ band, range, query }) => (
            <div
              key={band}
              style={{
                border: '1px solid var(--color-border-subtle)',
                borderRadius: 'var(--radius-card)',
                padding: 'var(--space-4)',
                background: 'var(--color-surface)',
              }}
            >
              <div style={{ fontSize: 'var(--text-sm)', fontWeight: 'var(--weight-label)' }}>
                {band}
              </div>
              <div className="text-text-secondary" style={{ fontSize: 'var(--text-sm)' }}>
                {range}
              </div>
              <code className="text-text-muted" style={{ fontSize: 'var(--text-xs)' }}>
                {query}
              </code>
            </div>
          ))}
        </div>
      </Section>

      {/* ================================================================ */}
      <Section
        index="05"
        title="Core brand colours"
        intro="Locked and immutable. Components never reference these directly — they use the semantic roles that point at them."
      >
        <div
          className="grid gap-4"
          style={{ gridTemplateColumns: 'repeat(auto-fit, minmax(230px, 1fr))' }}
        >
          {CORE_PALETTE.map((c) => (
            <Swatch key={c.token} {...c} />
          ))}
        </div>
      </Section>

      {/* ================================================================ */}
      <Section
        index="06"
        title="Approved teal variants"
        intro="Added because the core teal is 3.35:1 on ivory and cannot carry body-size text. All three sit in the same hue family as the core — 4° total spread across 189/186/190."
      >
        <div
          className="grid gap-4"
          style={{ gridTemplateColumns: 'repeat(auto-fit, minmax(230px, 1fr))' }}
        >
          {TEAL_VARIANTS.map((c) => (
            <Swatch key={c.token} {...c} extra={c.hsl} />
          ))}
        </div>
      </Section>

      {/* ================================================================ */}
      <Section
        index="07"
        title="Accessibility contrast"
        intro="Computed at render time from the locked palette. Anything marked as failing must never carry text."
      >
        <div className="overflow-x-auto">
          <table
            className="w-full border-collapse"
            style={{ fontSize: 'var(--text-sm)', minWidth: '560px' }}
          >
            <thead>
              <tr>
                {['Combination', 'Sample', 'Ratio', 'Verdict', 'Use'].map((h) => (
                  <th
                    key={h}
                    className="text-text-muted border-border-strong border-b text-left uppercase"
                    style={{
                      fontSize: 'var(--text-xs)',
                      fontWeight: 'var(--weight-label)',
                      letterSpacing: 'var(--tracking-label)',
                      paddingBottom: 'var(--space-2)',
                      paddingRight: 'var(--space-4)',
                    }}
                  >
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {COMBINATIONS.map(({ label, fg, bg, note }) => {
                const ratio = contrastRatio(fg, bg);
                const v = verdict(ratio);
                return (
                  <tr key={label}>
                    <td
                      className="border-border-subtle border-b"
                      style={{ paddingBlock: 'var(--space-3)', paddingRight: 'var(--space-4)' }}
                    >
                      {label}
                    </td>
                    <td
                      className="border-border-subtle border-b"
                      style={{ paddingBlock: 'var(--space-3)', paddingRight: 'var(--space-4)' }}
                    >
                      <span
                        style={{
                          background: bg,
                          color: fg,
                          padding: 'var(--space-2) var(--space-3)',
                          borderRadius: 'var(--radius-control)',
                          fontWeight: 'var(--weight-label)',
                          whiteSpace: 'nowrap',
                          border: '1px solid var(--color-border-subtle)',
                        }}
                      >
                        Aa 16px
                      </span>
                    </td>
                    <td
                      className="border-border-subtle border-b tabular-nums"
                      style={{ paddingBlock: 'var(--space-3)', paddingRight: 'var(--space-4)' }}
                    >
                      {ratio.toFixed(2)}:1
                    </td>
                    <td
                      className="border-border-subtle border-b"
                      style={{
                        paddingBlock: 'var(--space-3)',
                        paddingRight: 'var(--space-4)',
                        fontWeight: 'var(--weight-emphasis)',
                        color:
                          v.tone === 'pass'
                            ? 'var(--color-text-brand-strong)'
                            : 'var(--color-text-secondary)',
                      }}
                    >
                      {/* Never colour alone — DESIGN_SYSTEM §19. */}
                      {v.tone === 'fail' ? '✕ ' : v.tone === 'limited' ? '△ ' : '✓ '}
                      {v.label}
                    </td>
                    <td
                      className="text-text-muted border-border-subtle border-b"
                      style={{ paddingBlock: 'var(--space-3)', fontSize: 'var(--text-xs)' }}
                    >
                      {note}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </Section>

      {/* ================================================================ */}
      <Section
        index="08"
        title="Spacing scale"
        intro="One scale, used for padding, gaps and rhythm. Components reference these rather than arbitrary values."
      >
        <div className="flex flex-col" style={{ gap: 'var(--space-2)' }}>
          {SPACING.map(({ token, px }) => (
            <div key={token} className="flex items-center" style={{ gap: 'var(--space-4)' }}>
              <code
                className="text-text-brand shrink-0"
                style={{ fontSize: 'var(--text-xs)', width: '7.5rem' }}
              >
                {token}
              </code>
              <span
                className="text-text-muted shrink-0 tabular-nums"
                style={{ fontSize: 'var(--text-xs)', width: '3rem' }}
              >
                {px}px
              </span>
              <div
                style={{
                  width: `var(${token})`,
                  height: 'var(--space-4)',
                  background: 'var(--color-accent)',
                  borderRadius: 'var(--space-1)',
                }}
              />
            </div>
          ))}
        </div>
      </Section>

      {/* ================================================================ */}
      <Section
        index="09"
        title="Radius and geometry"
        intro="Locked at 20 / 14 / 12. Pills only where semantically appropriate — §8 warns against excessive rounding."
      >
        <div
          className="grid gap-4"
          style={{ gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))' }}
        >
          {RADII.map(({ token, label, use }) => (
            <Tile key={token} label={label}>
              <div
                style={{
                  height: 'var(--space-20)',
                  background: 'var(--color-accent-soft)',
                  border: '1px solid var(--color-border-brand)',
                  borderRadius: `var(${token})`,
                }}
              />
              <div className="flex flex-col gap-1">
                <code className="text-text-brand" style={{ fontSize: 'var(--text-xs)' }}>
                  {token}
                </code>
                <span className="text-text-secondary" style={{ fontSize: 'var(--text-xs)' }}>
                  {use}
                </span>
              </div>
            </Tile>
          ))}
        </div>
      </Section>

      {/* ================================================================ */}
      <Section
        index="10"
        title="Semantic surfaces"
        intro="What components actually reference. Each role points at a locked primitive, so the palette can change from one place."
      >
        <div
          className="grid gap-4"
          style={{ gridTemplateColumns: 'repeat(auto-fit, minmax(210px, 1fr))' }}
        >
          {SURFACES.map(({ token, label, note }) => (
            <div
              key={token}
              className="flex flex-col overflow-hidden"
              style={{
                borderRadius: 'var(--radius-card)',
                border: '1px solid var(--color-border-subtle)',
              }}
            >
              <div style={{ background: `var(${token})`, height: 'var(--space-16)' }} />
              <div
                className="flex flex-col gap-1"
                style={{ padding: 'var(--space-4)', background: 'var(--color-surface)' }}
              >
                <span style={{ fontSize: 'var(--text-sm)', fontWeight: 'var(--weight-label)' }}>
                  {label}
                </span>
                <code className="text-text-muted" style={{ fontSize: 'var(--text-xs)' }}>
                  {token}
                </code>
                <span className="text-text-secondary" style={{ fontSize: 'var(--text-xs)' }}>
                  {note}
                </span>
              </div>
            </div>
          ))}
        </div>
      </Section>

      {/* ================================================================ */}
      <Section
        index="11"
        title="Buttons"
        intro="Basic treatment for review, not a finished component set. Three distinct elevations: resting, hover (shadow grows, 1px lift), and press (compresses to 0.98 and drops below resting). Tertiary stays flat because it is a text action, not a surface. Every pairing here passes AA at body size."
      >
        <div className="flex flex-wrap items-center" style={{ gap: 'var(--space-4)' }}>
          <SpecimenButton tone="primary">Find My Trip</SpecimenButton>
          <SpecimenButton tone="secondary">Explore Trips</SpecimenButton>
          <SpecimenButton tone="tertiary">View itinerary</SpecimenButton>
          <SpecimenButton tone="accent">8 spots left</SpecimenButton>
          <SpecimenButton tone="primary" disabled>
            Disabled
          </SpecimenButton>
        </div>
        <p className="text-text-muted" style={{ fontSize: 'var(--text-xs)' }}>
          Tab to each button to check the focus ring. Primary is white on teal-medium (5.37:1);
          accent is charcoal on yellow (12.39:1) — yellow as a fill, never as text.
        </p>
      </Section>

      {/* ================================================================ */}
      <Section
        index="12"
        title="Cards, hover and progressive disclosure"
        intro="Generic cards, not trip cards — composition is a product decision that has not been made. What is under review is surface, radius, elevation, image treatment and disclosure behaviour."
      >
        <div
          className="grid gap-6"
          style={{ gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))' }}
        >
          <SpecimenCard
            title="Card specimen"
            meta="Primary information · always visible"
            secondary="Secondary information · revealed on hover or focus, on pointer devices only"
          />
          <SpecimenCard
            title="Card specimen"
            meta="Primary information · always visible"
            secondary="Secondary information · revealed on hover or focus, on pointer devices only"
          />
          <SpecimenCard
            title="Card specimen"
            meta="Primary information · always visible"
            secondary="Secondary information · revealed on hover or focus, on pointer devices only"
          />
        </div>
        <p className="text-text-muted max-w-[68ch]" style={{ fontSize: 'var(--text-xs)' }}>
          On touch devices and below 768px, the secondary line is always visible — disclosure is
          applied only where a fine pointer exists. Tab into a card to confirm keyboard parity:
          focus triggers the same lift and reveal as hover.
        </p>
      </Section>

      {/* ================================================================ */}
      <Section
        index="13"
        title="Glass"
        intro="An accent, not the dominant language (§9). Shown over a teal field because glass is invisible without something behind it. Thin transparent material: 32% surface opacity, 28px blur with saturation restored, a bright top hairline for edge thickness, and a soft ambient shadow for separation. The teal gradient should stay clearly visible through every panel."
      >
        <GlassStage>
          <GlassPanel
            variant="surface"
            label="Glass — default"
            note="--glass-surface · 32% · blur 28px · 4.69:1 worst case"
          />
          <GlassPanel
            variant="teal"
            label="Glass — teal tint"
            note="--glass-surface-teal · 34% · blur 28px"
          />
          <GlassPanel
            variant="strong"
            label="Glass — strong"
            note="--glass-surface-strong · 48% · blur 28px"
          />
        </GlassStage>
        <p className="text-text-muted max-w-[68ch]" style={{ fontSize: 'var(--text-xs)' }}>
          Reserved for floating panels, sticky navigation, image overlays and selected filters. Not
          every card is glass.
        </p>
      </Section>

      {/* ================================================================ */}
      <Section
        index="14"
        title="Motion"
        intro="Hover or focus each tile to play the transition at that token’s duration. CSS-only — the specimen ships no client JavaScript."
      >
        <div
          className="grid gap-6"
          style={{ gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))' }}
        >
          {MOTION.map((m) => (
            <MotionSample key={m.token} {...m} />
          ))}
        </div>
        <div
          style={{
            background: 'var(--color-surface-sunk)',
            borderRadius: 'var(--radius-card)',
            padding: 'var(--space-5)',
          }}
        >
          <SpecimenLabel>Reduced motion</SpecimenLabel>
          <p
            className="text-text-secondary max-w-[68ch]"
            style={{ fontSize: 'var(--text-sm)', marginTop: 'var(--space-2)' }}
          >
            With <code>prefers-reduced-motion: reduce</code> enabled, every transition and animation
            above collapses to 0.01ms while remaining fully usable — states still change, they just
            do not animate. Enable it in your OS display settings and reload to verify.
          </p>
        </div>
      </Section>

      {/* ================================================================ */}
      <footer className="border-border border-t" style={{ paddingTop: 'var(--space-6)' }}>
        <p className="text-text-muted max-w-[68ch]" style={{ fontSize: 'var(--text-sm)' }}>
          Not built: navigation, homepage, trip pages, booking, dashboards, admin. The specimens
          above are for review only and are not production components — approved treatments get
          promoted into <code>components/ui/</code> with full variants, states and tests.
        </p>
      </footer>
    </main>
  );
}
