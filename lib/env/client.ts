import { z } from 'zod';

/**
 * Public environment variables.
 *
 * Everything in this file is inlined into the browser bundle at build time and
 * is therefore PUBLIC. Never add a secret here — see docs/SECURITY.md §2.
 *
 * Next.js replaces `process.env.NEXT_PUBLIC_*` statically, so each variable
 * must be referenced by its full literal name below. Dynamic access
 * (`process.env[key]`) is NOT substituted and will be undefined in the browser.
 */
const clientEnvSchema = z.object({
  NEXT_PUBLIC_SUPABASE_URL: z.url(
    'NEXT_PUBLIC_SUPABASE_URL must be a valid URL, e.g. https://xxxx.supabase.co',
  ),
  NEXT_PUBLIC_SUPABASE_ANON_KEY: z.string().min(1, 'NEXT_PUBLIC_SUPABASE_ANON_KEY is required'),
  NEXT_PUBLIC_SITE_URL: z.url(
    'NEXT_PUBLIC_SITE_URL must be a valid URL, e.g. http://localhost:3000',
  ),
});

const parsed = clientEnvSchema.safeParse({
  NEXT_PUBLIC_SUPABASE_URL: process.env.NEXT_PUBLIC_SUPABASE_URL,
  NEXT_PUBLIC_SUPABASE_ANON_KEY: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
  NEXT_PUBLIC_SITE_URL: process.env.NEXT_PUBLIC_SITE_URL,
});

if (!parsed.success) {
  const issues = parsed.error.issues.map((i) => `  - ${i.path.join('.')}: ${i.message}`).join('\n');
  throw new Error(
    `Invalid public environment variables:\n${issues}\n\n` +
      'Copy .env.example to .env.local and fill in the values. See README.md.',
  );
}

export const clientEnv = parsed.data;
