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
comment for the reasoning behind it. `lib/supabase/database.types.ts` is still
the placeholder committed in Phase 1: it can only be regenerated (`npm run
db:types`) against a real, reachable, migrated database, which no session so
far has had (no local Docker/Postgres available, and the configured remote
project has not been linked/pushed to without explicit approval — see the
Phase 4.1 report). **None of these five migrations have been applied to or
verified against a real database yet.** They were written and self-reviewed
for correctness (constraint fidelity against `lib/content/ingest/schema.ts`'s
Zod shapes, RLS coverage, FK/index correctness) but not executed — the
`supabase db reset` step below (and `tests/integration/migrations.test.ts`,
`tests/integration/trip-content-schema.test.ts`) is the way to actually
confirm that once a database is reachable.

## Setup (once)

The CLI is a project dev dependency, so it needs no global install:

```bash
npx supabase login
npx supabase link --project-ref <your-dev-project-ref>
```

The ref comes from Supabase → Project Settings → General → Reference ID. The
link is stored in `supabase/.temp/`, which is gitignored — each developer links
their own environment.

Link the **development** project. Never point local work at production.

## Workflow

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
