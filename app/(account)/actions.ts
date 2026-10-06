'use server';

import { ensureTravellerProfile, upsertOwnProfile } from '@/lib/traveller/profile';

/**
 * The narrow defensive fallback: creates the traveller's profile row with
 * ONLY a display name, for a signed-in user whose real onboarding
 * (`completeOnboardingAction` below) never ran — `app/dashboard/layout.tsx`
 * is the only caller. Idempotent via `ignoreDuplicates`: never overwrites
 * a real profile that already exists.
 */
export async function createTravellerProfileAction(displayName: string): Promise<void> {
  await ensureTravellerProfile(displayName);
}

/**
 * Signup Step 2 — traveller profile onboarding (Phase 4.8A). The real
 * profile write: full name plus whichever optional fields the traveller
 * filled in. Runs with the SAME session-aware, RLS-governed client
 * `lib/traveller/profile.ts` already uses — no service-role escalation.
 *
 * Idempotent by construction (`upsertOwnProfile`'s own genuine upsert, not
 * `ignoreDuplicates`): a browser refresh or a resubmission of the same
 * Step 2 form always converges on the same stored row, never errors, and
 * never creates a second one.
 */
export async function completeOnboardingAction(
  input: unknown,
): Promise<{ ok: true } | { ok: false; errorMessage: string }> {
  try {
    await upsertOwnProfile(input);
    return { ok: true };
  } catch {
    return { ok: false, errorMessage: 'Could not save your profile. Please try again.' };
  }
}
