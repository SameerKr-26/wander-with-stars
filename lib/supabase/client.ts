'use client';

import { createBrowserClient } from '@supabase/ssr';

import { clientEnv } from '@/lib/env/client';

import type { Database } from './database.types';

/**
 * Browser Supabase client — runs in the user's browser with the anon key.
 *
 * Every request is subject to Row Level Security. This client can only ever see
 * what RLS policies permit for the current session, which is exactly why RLS
 * must be correct rather than relied upon as a formality (docs/SECURITY.md §5).
 *
 * Use in Client Components only.
 */
export function createClient() {
  return createBrowserClient<Database>(
    clientEnv.NEXT_PUBLIC_SUPABASE_URL,
    clientEnv.NEXT_PUBLIC_SUPABASE_ANON_KEY,
  );
}
