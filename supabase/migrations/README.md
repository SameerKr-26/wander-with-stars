# Database migrations

Every schema change lives here as a timestamped SQL migration, applied through
the Supabase CLI. The schema itself is built from Phase 5 onward — see
`docs/DATABASE.md` for the intended model and `docs/ROADMAP.md` for ordering.

**Phase 4.1 established the production content schema** (`hosts`, `guides`,
`trips`, `itinerary_days`, `trip_media`, `trip_inclusions`, `trip_exclusions`,
`trip_important_notes`, `trip_extras`, `trip_faqs`, `trip_policy_sections`,
`trip_departures`, `trip_accommodation`, `trip_transport`,
`trip_meeting_points`) across the five migrations in this directory — see
`docs/DATABASE.md` §3 for the current model and each migration's own header
comment for the reasoning behind it.

**Phase 4.2A verified all five migrations against a real, local Postgres
database** (`npx supabase start`, Docker-based — see "Local development
database" below): they apply cleanly and in order to a clean database, every
table has RLS enabled with exactly the intended policy, every FK/index/CHECK
constraint matches this document, and `lib/supabase/database.types.ts` is now
real generated output (`npm run db:types:local`), not the Phase 1 placeholder.
**No remote or shared Supabase project has been linked, pushed to, or
otherwise mutated** — every verification in Phase 4.2A ran against a disposable
local Docker stack only. Linking and pushing to the real project referenced by
`.env.local` remains a deliberate, separately-authorized step (see "Setup
(once)" below), not something either phase did automatically.

## Local development database

No linking, no remote project, no secrets beyond what Docker itself needs —
this is the fastest way to get a real Postgres running these migrations, and
the only way this repository has actually verified them (Phase 4.2A):

```bash
npm run db:start        # supabase start — needs Docker Desktop running
npm run db:reset         # re-applies every migration + supabase/seed.sql from empty
npm run db:types:local   # regenerate lib/supabase/database.types.ts from it
npm run db:stop          # stop the containers when done
```

`db:start`/`db:reset` print the local `API_URL` (`http://127.0.0.1:54321`),
`ANON_KEY` and `SERVICE_ROLE_KEY` — these are the Supabase CLI's well-known,
publicly-documented local-dev demo keys (identical on every developer's
machine unless `supabase/config.toml`'s `auth.jwt_secret` is overridden), not
project secrets. To run `tests/integration/` for real against this local
database, export those three values as `NEXT_PUBLIC_SUPABASE_URL`,
`NEXT_PUBLIC_SUPABASE_ANON_KEY` and `SUPABASE_SERVICE_ROLE_KEY` before
`npm run test` — otherwise those tests read `.env.local` and (correctly)
self-skip unless that also happens to be reachable and migrated.

**Whether a database is reachable at all:** `npx supabase status` — exits
non-zero (or hangs, per its own timeout) when nothing is running.
`tests/integration/migrations.test.ts` and
`tests/integration/trip-content-schema.test.ts` both probe this themselves
and skip, rather than fail, when it's unreachable.

**Note:** `npm run test`'s `supabase db reset` check runs for real whenever a
local Supabase stack happens to be up — including a developer's own, already
populated with their own test data. That is the point (it proves migration
reproducibility), but it does mean the local database gets reset as a side
effect of running the test suite. Nothing here ever touches a remote project.

**Before production activation remains:** deciding on and linking a real
development (and, separately, production) Supabase project, running
`db:push` against it, generating types from it with `db:types`, and only then
switching `CONTENT_SOURCE=database` (`lib/content/db/source.ts`) somewhere
that project is actually reachable from. None of that is done by anything in
this repository automatically.

## Setup (linking a real project — separate, deliberate, not done here)

The CLI is a project dev dependency, so it needs no global install:

```bash
npx supabase login
npx supabase link --project-ref <your-dev-project-ref>
```

The ref comes from Supabase → Project Settings → General → Reference ID. The
link is stored in `supabase/.temp/`, which is gitignored — each developer links
their own environment.

Link the **development** project. Never point local work at production.

## Workflow (a linked project)

```bash
npx supabase migration new add_trips_table   # create an empty migration
npm run db:push                              # apply to the linked project
npm run db:types                             # regenerate lib/supabase/database.types.ts
```

Commit the migration and the regenerated types together, so CI type-checks
against the schema the code expects.

## Rules

1. **Never edit an applied migration.** Add a new one — others' databases have
   already run the old file.
2. **Every protected table needs RLS enabled and explicit policies**, in the
   same migration that creates the table. A table without policies is either
   fully exposed or entirely broken, and both are discovered too late.
   No `using (true)` on private data, not even temporarily (`docs/SECURITY.md`).
3. **Index what you filter, join and sort on** — see `docs/DATABASE.md` §13.
4. **Constraints belong in the database**, not only in application code.
5. Prefer additive, reversible changes. Destructive changes need a deliberate
   plan for existing rows.
