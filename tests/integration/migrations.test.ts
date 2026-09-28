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
 *      undocumented step. Skips — does not fail — when no local Supabase
 *      stack is running (Docker unavailable, or `supabase start` was never
 *      run). Verified for real in Phase 4.2A — see docs/DATABASE.md's
 *      "Local development database" section for how to bring one up.
 */
import { execFileSync } from 'node:child_process';
import { readdirSync, readFileSync } from 'node:fs';
import { resolve } from 'node:path';

import { describe, expect, it } from 'vitest';

// Windows: `npx` resolves to `npx.cmd`, a batch file — Windows can only
// execute those through `cmd.exe`, so `execFileSync` needs `shell: true`
// here (spawning `npx.cmd` directly still fails, with `EINVAL`). Discovered
// in Phase 4.2A, where the plain, no-shell call silently produced a false
// "unreachable" on every run on Windows, even with a real local Supabase
// stack up. Every argument below is a fixed literal this file wrote, never
// external input, so `shell: true`'s "arguments aren't escaped" warning
// carries no real injection risk here.
const EXEC_OPTS = { shell: process.platform === 'win32' } as const;

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
    // `npx` resolution alone can take several seconds on a cold cache,
    // hence the longer-than-default timeout.
    execFileSync('npx', ['supabase', 'status'], { stdio: 'ignore', timeout: 20_000, ...EXEC_OPTS });
    return true;
  } catch {
    return false;
  }
}

// Computed once — `describe.skipIf` below would otherwise each spawn their
// own `npx supabase status` process at module-evaluation time.
const localSupabaseReachable = canReachLocalSupabase();

// Vitest's default 5s per-test timeout is unrelated to (and shorter than)
// execFileSync's own 120s timeout below — this actually resets a Postgres
// database and reapplies every migration, which reliably takes longer than 5s.
const DB_RESET_TEST_TIMEOUT_MS = 130_000;

describe.skipIf(!localSupabaseReachable)('supabase db reset', () => {
  it(
    'applies every migration to a clean local database',
    () => {
      expect(() =>
        execFileSync('npx', ['supabase', 'db', 'reset'], {
          stdio: 'pipe',
          timeout: 120_000,
          ...EXEC_OPTS,
        }),
      ).not.toThrow();
    },
    DB_RESET_TEST_TIMEOUT_MS,
  );
});

describe.skipIf(localSupabaseReachable)('supabase db reset (unreachable)', () => {
  it('is skipped: no local Supabase stack (Docker) is running', () => {
    expect(true).toBe(true);
  });
});
