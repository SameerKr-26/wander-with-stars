# Database migrations

Every schema change lives here as a timestamped SQL migration, applied through
the Supabase CLI. The schema itself is built from Phase 5 onward — see
`docs/DATABASE.md` for the intended model and `docs/ROADMAP.md` for ordering.

**This directory is intentionally empty of migrations.** No tables exist yet.

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
