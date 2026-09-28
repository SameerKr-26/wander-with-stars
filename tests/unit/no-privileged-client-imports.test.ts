import { readFileSync, readdirSync } from 'node:fs';
import { extname, join, resolve } from 'node:path';

import { describe, expect, it } from 'vitest';

function listSourceFiles(dir: string): string[] {
  const entries = readdirSync(dir, { withFileTypes: true });
  return entries.flatMap((entry) => {
    const path = join(dir, entry.name);
    if (entry.isDirectory()) return listSourceFiles(path);
    return ['.ts', '.tsx'].includes(extname(entry.name)) ? [path] : [];
  });
}

/**
 * Static guard: no UI code imports the service-role client.
 *
 * ESLint's `no-restricted-imports` rule (eslint.config.mjs) already blocks
 * this for every file under `components/` and every `.tsx` file under
 * `app/` at edit time. This test re-asserts the same guarantee independent
 * of the lint config, so a future change to that config can't silently
 * remove the protection docs/SECURITY.md §1/§4 depend on: privileged,
 * RLS-bypassing database access must never be reachable from a Client
 * Component.
 */
describe('no-restricted-imports guard', () => {
  it('finds no import of lib/supabase/admin under app/ or components/', () => {
    const root = process.cwd();
    const files = [
      ...listSourceFiles(resolve(root, 'app')),
      ...listSourceFiles(resolve(root, 'components')),
    ];

    const offenders = files.filter((path) =>
      /from\s+['"]@\/lib\/supabase\/admin['"]/.test(readFileSync(path, 'utf8')),
    );

    expect(offenders).toEqual([]);
  });
});
