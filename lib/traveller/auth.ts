import 'server-only';

import { createClient } from '@/lib/supabase/server';

/**
 * The authenticated traveller identity — Supabase Auth's user plus their
 * `traveller_profiles` row. `null` when there is no signed-in user, or a
 * signed-in user with no profile row yet (a real, safe state: profile
 * creation is a separate, idempotent step — see `lib/traveller/profile.ts` —
 * not something this resolver ever creates as a side effect).
 */
export interface TravellerSession {
  userId: string;
  email: string | null;
  displayName: string;
}

/**
 * Resolves the current request's traveller identity, or `null`.
 *
 * Same pattern as `lib/admin/auth.ts`'s `getAdminSession` — a signed-in
 * user and an admin are not mutually exclusive (an admin account may also
 * have a traveller profile), so this never checks `admin_roles`, and
 * `getAdminSession` never checks this. Uses `supabase.auth.getUser()`, not
 * `getSession()`, for the same reason documented there: `getUser()`
 * revalidates the token with the Auth server rather than trusting an
 * unverified cookie.
 */
export async function getTravellerSession(): Promise<TravellerSession | null> {
  const supabase = await createClient();

  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser();
  if (userError || !user) return null;

  const { data: profile, error: profileError } = await supabase
    .from('traveller_profiles')
    .select('display_name')
    .eq('user_id', user.id)
    .maybeSingle();
  if (profileError || !profile) return null;

  return { userId: user.id, email: user.email ?? null, displayName: profile.display_name };
}
