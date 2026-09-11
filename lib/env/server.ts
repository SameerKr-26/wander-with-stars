import 'server-only';

import { z } from 'zod';

/**
 * Server-only environment variables.
 *
 * `server-only` makes importing this module from a Client Component a BUILD
 * ERROR, so a service-role key cannot reach the browser by accident.
 * See docs/SECURITY.md §2 and docs/ARCHITECTURE.md §9.
 */
const serverEnvSchema = z.object({
  /**
   * Supabase service-role key. Bypasses Row Level Security entirely.
   * Only ever used by lib/supabase/admin.ts.
   */
  SUPABASE_SERVICE_ROLE_KEY: z
    .string()
    .min(1, 'SUPABASE_SERVICE_ROLE_KEY is required')
    .refine(
      (value) => !value.startsWith('http'),
      'SUPABASE_SERVICE_ROLE_KEY looks like a URL — check you have not swapped the URL and key.',
    ),

  NODE_ENV: z.enum(['development', 'test', 'production']).default('development'),
});

const parsed = serverEnvSchema.safeParse({
  SUPABASE_SERVICE_ROLE_KEY: process.env.SUPABASE_SERVICE_ROLE_KEY,
  NODE_ENV: process.env.NODE_ENV,
});

if (!parsed.success) {
  const issues = parsed.error.issues.map((i) => `  - ${i.path.join('.')}: ${i.message}`).join('\n');
  throw new Error(
    `Invalid server environment variables:\n${issues}\n\n` +
      'Copy .env.example to .env.local and fill in the values. See README.md.',
  );
}

export const serverEnv = parsed.data;
