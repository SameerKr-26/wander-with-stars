/**
 * Explicit content-source switch (Phase 4.2) — read once, never an
 * automatic runtime fallback inside a query.
 *
 * Deliberately its own tiny module rather than a field on
 * `lib/env/server.ts`'s `serverEnv`: that schema also requires
 * `SUPABASE_SERVICE_ROLE_KEY` to be set, which is correct for
 * `lib/supabase/admin.ts` (a real secret, only ever needed by privileged
 * server code) but wrong to force on every page render — `lib/content/queries.ts`
 * is imported by ordinary marketing Server Components that have no business
 * requiring a service-role key just to read this flag.
 *
 * `'database'` reads published trip content from Supabase/Postgres through
 * `lib/content/db/repository.ts`. `'fixtures'` (the default, for now) forces
 * `lib/content/fixtures.ts` instead. A database query failure while
 * `'database'` is active surfaces through `ContentState`'s `'error'` status;
 * it never silently swaps in fixture data, which would make a real outage
 * look like a healthy, empty catalogue.
 *
 * Defaults to `'fixtures'`, not `'database'`, for one concrete reason: the
 * Phase 4.1 schema has been authored and reviewed but never applied to any
 * reachable database (no local Docker/Postgres in this environment, and the
 * real remote Supabase project referenced by `NEXT_PUBLIC_SUPABASE_URL` has
 * not been linked or migrated — see `supabase/migrations/README.md`). Until
 * that migration actually runs somewhere reachable, `'database'` would mean
 * every environment — including today's deployed preview — starts showing
 * `ContentState`'s `'error'`/`'empty'` states instead of the trip cards it
 * shows today, which is a real regression this phase must not cause. Flip
 * this to `'database'` (set `CONTENT_SOURCE=database`) once the schema is
 * live somewhere `lib/supabase/server.ts`'s client can reach.
 */
export type ContentSource = 'database' | 'fixtures';

function readContentSource(): ContentSource {
  const raw = process.env.CONTENT_SOURCE;
  if (raw === 'database') return 'database';
  if (raw === undefined || raw === 'fixtures') return 'fixtures';
  throw new Error(
    `Invalid CONTENT_SOURCE: "${raw}" — expected "database" or "fixtures" (unset defaults to "fixtures").`,
  );
}

export const CONTENT_SOURCE = readContentSource();
