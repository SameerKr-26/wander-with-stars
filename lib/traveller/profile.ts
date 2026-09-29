import 'server-only';

import { createClient } from '@/lib/supabase/server';

import { profileUpdateSchema, type ProfileUpdateInput } from './validation';

/**
 * Traveller profile writes — Phase 4.5.
 *
 * Every function here uses `lib/supabase/server.ts`'s session-aware client
 * (never `lib/supabase/admin.ts`'s service-role client): the
 * `traveller_profiles` RLS policies (own-row select/insert/update) are the
 * actual authorization boundary, and this module relies on them rather than
 * re-implementing an ownership check in application code that the database
 * would enforce anyway — the same "RLS is the read/write boundary" pattern
 * `lib/admin/` already established for admin-authored content, applied here
 * to traveller-authored data instead.
 */

export class ProfileError extends Error {
  constructor(
    public readonly reason: 'unauthenticated' | 'invalid' | 'write-failed',
    message: string,
  ) {
    super(message);
    this.name = 'ProfileError';
  }
}

/**
 * Creates the caller's traveller profile if it doesn't already exist.
 *
 * Idempotent by construction: `upsert` with `onConflict: 'user_id'` and
 * `ignoreDuplicates: true` is a no-op when a row already exists, so calling
 * this more than once for the same account (a retry after a transient
 * failure, or the defensive call in `/dashboard`'s layout — see that file)
 * never errors and never overwrites an existing display name.
 */
export async function ensureTravellerProfile(displayName: string): Promise<void> {
  const parsed = profileUpdateSchema.safeParse({ displayName });
  if (!parsed.success) {
    throw new ProfileError('invalid', parsed.error.issues[0]?.message ?? 'Invalid display name.');
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new ProfileError('unauthenticated', 'Not signed in.');

  const { error } = await supabase
    .from('traveller_profiles')
    .upsert(
      { user_id: user.id, display_name: parsed.data.displayName },
      { onConflict: 'user_id', ignoreDuplicates: true },
    );
  if (error) throw new ProfileError('write-failed', 'Could not create your profile.');
}

/** Updates the caller's own display name. RLS rejects any other row. */
export async function updateOwnDisplayName(input: ProfileUpdateInput): Promise<void> {
  const parsed = profileUpdateSchema.safeParse(input);
  if (!parsed.success) {
    throw new ProfileError('invalid', parsed.error.issues[0]?.message ?? 'Invalid display name.');
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new ProfileError('unauthenticated', 'Not signed in.');

  const { error } = await supabase
    .from('traveller_profiles')
    .update({ display_name: parsed.data.displayName })
    .eq('user_id', user.id);
  if (error) throw new ProfileError('write-failed', 'Could not update your profile.');
}
