import 'server-only';

import { createServerClient } from '@supabase/ssr';
import { cookies } from 'next/headers';

import { clientEnv } from '@/lib/env/client';

import type { Database } from './database.types';

/**
 * Server Supabase client — anon key, acting AS THE SIGNED-IN USER.
 *
 * Reads the session from cookies, so Row Level Security applies normally. This
 * is the correct default for Server Components, Route Handlers and Server
 * Actions: it is server-side (so queries are not exposed to the client) while
 * still being constrained by the user's own permissions.
 *
 * Reach for lib/supabase/admin.ts only when an operation genuinely must bypass
 * RLS, and only after authorising the caller yourself.
 */
export async function createClient() {
  const cookieStore = await cookies();

  return createServerClient<Database>(
    clientEnv.NEXT_PUBLIC_SUPABASE_URL,
    clientEnv.NEXT_PUBLIC_SUPABASE_ANON_KEY,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll();
        },
        setAll(cookiesToSet) {
          try {
            for (const { name, value, options } of cookiesToSet) {
              cookieStore.set(name, value, options);
            }
          } catch {
            // Called from a Server Component, where cookies are read-only.
            // Session refresh is handled by middleware instead, so this is the
            // one safe case to ignore. Added in the auth milestone (Phase 4).
          }
        },
      },
    },
  );
}
