/**
 * Atmosphere field — the "water-light" environment from
 * docs/WWS_VISUAL_IDENTITY.md §4, built entirely from locked tokens.
 *
 * This exists because real WWS hero photography does not exist in the
 * repository yet, and the instruction is explicit: do not invent or download
 * stock imagery to fill the gap. Rather than fake a photo, the environment is
 * an honest, token-derived teal-to-ivory field — consistent with the approved
 * "subtle, calm, water-like" background direction, and never presented as
 * photography.
 *
 * Once real trip media exists, a Hero variant accepts `backgroundMedia` (see
 * hero.tsx) and renders an ImageFrame/video in its place — this component is
 * the fallback, not a permanent design choice.
 */
export function AtmosphereField({ variant = 'hero' }: { variant?: 'hero' | 'panel' }) {
  return (
    <div
      aria-hidden="true"
      className="pointer-events-none absolute inset-0 overflow-hidden"
      style={{ background: 'var(--color-background)' }}
    >
      <div
        style={{
          position: 'absolute',
          inset: variant === 'hero' ? '-20%' : 0,
          background:
            'radial-gradient(60% 60% at 80% 20%, var(--wws-teal-wash-strong), transparent 60%),' +
            'radial-gradient(50% 50% at 10% 90%, var(--wws-teal-wash), transparent 65%)',
        }}
      />
      {/* A restrained flight-path motif — dashed route with a small marker,
          docs/WWS_VISUAL_IDENTITY.md §13. Vocabulary, not a sticker: one
          instance, low opacity, never competing with content. */}
      <svg
        className="absolute top-[12%] right-[6%] hidden sm:block"
        width="220"
        height="90"
        viewBox="0 0 220 90"
        fill="none"
        style={{ opacity: 0.35 }}
      >
        <path
          d="M4 70 C 60 10, 140 10, 216 40"
          stroke="var(--wws-teal-deep)"
          strokeWidth="1.5"
          strokeDasharray="2 8"
          strokeLinecap="round"
        />
        <circle cx="216" cy="40" r="3" fill="var(--wws-teal-deep)" />
      </svg>
    </div>
  );
}
