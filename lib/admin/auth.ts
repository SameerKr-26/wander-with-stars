import 'server-only';

import { createClient } from '@/lib/supabase/server';

import { isAdminRole, type AdminSession } from './roles';

/**
 * Resolves the current request's admin identity, or `null` if there isn't
 * one — no signed-in user, or a signed-in user with no `admin_roles` row
 * (an ordinary account, once traveller accounts exist, has none by design).
 *
 * Uses `lib/supabase/server.ts`'s session-aware client and
 * `supabase.auth.getUser()` (never `getSession()` — same rule
 * `lib/supabase/middleware.ts` documents: `getSession` decodes the cookie
 * without verifying it against the Auth server). The `admin_roles` read
 * relies on that table's own RLS policy (a user may read only their own
 * row) — this function never needs the service-role client just to check
 * who is asking.
 */
export async function getAdminSession(): Promise<AdminSession | null> {
  const supabase = await createClient();

  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser();
  if (userError || !user) return null;

  const { data: roleRow, error: roleError } = await supabase
    .from('admin_roles')
    .select('role')
    .eq('id', user.id)
    .maybeSingle();
  if (roleError || !roleRow || !isAdminRole(roleRow.role)) return null;

  return { userId: user.id, email: user.email ?? null, role: roleRow.role };
}
