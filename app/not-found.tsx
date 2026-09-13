import Link from 'next/link';

/**
 * Root 404 — for a path that doesn't match any route group at all.
 *
 * app/(marketing)/not-found.tsx handles the common case (an unknown
 * /trips/[slug], reached via notFound() from inside that page) and renders
 * inside the marketing header/footer. This root-level one is the fallback for
 * a genuinely unmatched URL outside any segment, so it renders standalone —
 * the root layout has no header/footer of its own to wrap it in.
 */
export default function RootNotFound() {
  return (
    <main
      className="mx-auto flex min-h-dvh max-w-[60ch] flex-col items-center justify-center text-center"
      style={{ paddingInline: 'var(--container-gutter)', gap: 'var(--space-4)' }}
    >
      <p
        style={{
          fontFamily: 'var(--font-display)',
          fontSize: 'var(--text-sm)',
          fontWeight: 'var(--weight-label)',
          letterSpacing: 'var(--tracking-label)',
          textTransform: 'uppercase',
          color: 'var(--color-text-brand)',
        }}
      >
        404
      </p>
      <h1
        style={{
          fontFamily: 'var(--font-display)',
          fontSize: 'var(--text-3xl)',
          fontWeight: 'var(--weight-heading)',
        }}
      >
        This page doesn&apos;t exist
      </h1>
      <Link
        href="/"
        style={{
          fontSize: 'var(--text-sm)',
          fontWeight: 'var(--weight-label)',
          color: 'var(--color-text-brand)',
        }}
      >
        ← Back to Wander With Stars
      </Link>
    </main>
  );
}
