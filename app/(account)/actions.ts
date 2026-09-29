'use server';

import { ensureTravellerProfile } from '@/lib/traveller/profile';

/**
 * The one server-side step signup depends on: creating the traveller's
 * profile row right after `supabase.auth.signUp()` succeeds client-side.
 *
 * Why a Server Action rather than doing this in the browser: the insert
 * itself is a plain RLS-governed write any authenticated client could make,
 * but doing it here keeps profile creation in one auditable, testable
 * place rather than duplicated in every form that might ever create an
 * account (there is only one today, but the next one — a future social
 * login — would otherwise need to remember to repeat it). It runs with the
 * SAME session-aware, RLS-governed client `lib/traveller/profile.ts`
 * already uses — no service-role escalation.
 *
 * Idempotent: `ensureTravellerProfile` upserts with `ignoreDuplicates`, so
 * calling this twice for the same account (a retry, or the defensive call
 * in `app/dashboard/layout.tsx`) never errors and never overwrites an
 * existing display name.
 */
export async function createTravellerProfileAction(displayName: string): Promise<void> {
  await ensureTravellerProfile(displayName);
}
