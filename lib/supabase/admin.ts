import 'server-only';

import { createClient as createSupabaseClient } from '@supabase/supabase-js';

import { clientEnv } from '@/lib/env/client';
import { serverEnv } from '@/lib/env/server';

import type { Database } from './database.types';

/**
 * ⚠️  SERVICE-ROLE CLIENT — BYPASSES ROW LEVEL SECURITY ENTIRELY.
 *
 * This client can read and write every row in the database. It exists for
 * operations that legitimately cannot run as the user, for example:
 *
 *   - payment webhook processing (no user session exists)
 *   - server-side booking state transitions
 *   - privileged admin operations, AFTER an explicit RBAC check
 *
 * Rules (docs/SECURITY.md §2, §4):
 *
 *   1. NEVER import this from a Client Component. The `server-only` import
 *      above turns that into a build error, and ESLint flags it earlier.
 *   2. NEVER use it just to make a query work. A query blocked by RLS is
 *      usually a policy bug, not a reason to escalate privilege.
 *   3. ALWAYS authorise the caller yourself first. There is no safety net here.
 *   4. ALWAYS write an audit log entry for privileged mutations.
 *
 * Call this function where it is needed rather than exporting a shared
 * instance, so the privileged surface stays visible in the call site.
 */
export function createAdminClient() {
  return createSupabaseClient<Database>(
    clientEnv.NEXT_PUBLIC_SUPABASE_URL,
    serverEnv.SUPABASE_SERVICE_ROLE_KEY,
    {
      auth: {
        // A service-role client has no user session and must never try to
        // persist or refresh one.
        autoRefreshToken: false,
        persistSession: false,
        detectSessionInUrl: false,
      },
    },
  );
}
