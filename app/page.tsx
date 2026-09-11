/**
 * Foundation placeholder.
 *
 * Replaced by the real homepage in Phase 3 (docs/ROADMAP.md). Kept deliberately
 * plain so no invented styling has to be unpicked later — brand colour,
 * typography and the cinematic treatment are decided in Phase 2.
 */
export default function HomePage() {
  return (
    <main className="mx-auto flex min-h-dvh max-w-2xl flex-col justify-center gap-4 px-6 py-16">
      <p className="text-xs font-semibold tracking-[0.2em] uppercase opacity-60">
        Wander With Stars
      </p>
      <h1 className="text-3xl font-bold text-balance sm:text-4xl">Engineering foundation</h1>
      <p className="text-base leading-relaxed opacity-80">
        Milestone 1A is in place: Next.js, TypeScript in strict mode, Tailwind, ESLint and Prettier.
        The product experience is built from Phase 2 onward.
      </p>
      <p className="text-sm opacity-60">
        See{' '}
        <code className="rounded bg-black/5 px-1.5 py-0.5 dark:bg-white/10">docs/ROADMAP.md</code>{' '}
        for what ships next.
      </p>
    </main>
  );
}
