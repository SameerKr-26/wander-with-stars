/**
 * Migration hygiene checks for `supabase/migrations/`.
 *
 * Two tiers:
 *
 *   1. Static checks (always run): every migration file is named with a
 *      sortable timestamp prefix, applies in that order, and every
 *      `create table` is paired with `enable row level security` in the
 *      SAME file — this project's own rule (supabase/migrations/README.md
 *      rule 2). These need no database connection at all.
 *
 *   2. `supabase db reset` (runs only when the Supabase CLI can actually
 *      reach a local Postgres via Docker): proves the whole migration set
 *      applies cleanly to an empty database, in order, with no manual
 *      undocumented step. Skips — does not fail — when Docker isn't
 *      running, which is the case in this environment; see this phase's
 *      final report for the explicit disclosure that tier 2 has not been
 *      executed here.
 */
import { execFileSync } from 'node:child_process';
import { readdirSync, readFileSync } from 'node:fs';
import { resolve } from 'node:path';

import { describe, expect, it } from 'vitest';

const migrationsDir = resolve(process.cwd(), 'supabase/migrations');
const migrationFiles = readdirSync(migrationsDir)
  .filter((name) => name.endsWith('.sql'))
  .sort();

describe('migration file hygiene', () => {
  it('has at least one migration', () => {
    expect(migrationFiles.length).toBeGreaterThan(0);
  });

  it('names every migration with a sortable numeric timestamp prefix', () => {
    for (const name of migrationFiles) {
      expect(name).toMatch(/^\d{14}_[a-z0-9_]+\.sql$/);
    }
  });

  it('gives every table created in a migration RLS in the same file', () => {
    for (const name of migrationFiles) {
      const sql = readFileSync(resolve(migrationsDir, name), 'utf8');
      const createdTables = [...sql.matchAll(/create table public\.(\w+)/g)].map((m) => m[1]);
      for (const table of createdTables) {
        expect(sql, `${name}: ${table} has no "enable row level security"`).toMatch(
          new RegExp(`alter table public\\.${table} enable row level security`),
        );
      }
    }
  });
});

function canReachLocalSupabase(): boolean {
  try {
    execFileSync('npx', ['supabase', 'status'], { stdio: 'ignore', timeout: 5000 });
    return true;
  } catch {
    return false;
  }
}

describe.skipIf(!canReachLocalSupabase())('supabase db reset', () => {
  it('applies every migration to a clean local database', () => {
    expect(() =>
      execFileSync('npx', ['supabase', 'db', 'reset'], { stdio: 'pipe', timeout: 120_000 }),
    ).not.toThrow();
  });
});

describe.skipIf(canReachLocalSupabase())('supabase db reset (unreachable)', () => {
  it('is skipped: no local Supabase stack (Docker) is running', () => {
    expect(true).toBe(true);
  });
});
