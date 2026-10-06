import 'server-only';

import { createClient } from '@/lib/supabase/server';

import {
  profileOnboardingSchema,
  profileUpdateSchema,
  type DietaryPreference,
  type TravelInterest,
  type TravelStyle,
} from './validation';

/**
 * Traveller profile reads/writes — Phase 4.5, extended Phase 4.8A.
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
    public readonly reason: 'unauthenticated' | 'invalid' | 'write-failed' | 'read-failed',
    message: string,
  ) {
    super(message);
    this.name = 'ProfileError';
  }
}

export interface TravellerProfile {
  displayName: string;
  phone: string | null;
  city: string | null;
  travelStyle: TravelStyle | null;
  travelInterests: TravelInterest[];
  dietaryPreference: DietaryPreference | null;
}

/**
 * Creates the caller's traveller profile if it doesn't already exist, with
 * ONLY a display name — the narrow defensive fallback
 * `app/dashboard/layout.tsx` uses for a signed-in user whose profile
 * creation step never ran (e.g. a failed Step 2 submission, or a future
 * auth method that doesn't go through signup at all). Deliberately
 * `ignoreDuplicates: true`, NOT a full overwrite: if a real profile
 * already exists (the normal case), this must never reset its
 * onboarding fields back to empty — it only ever fills a genuinely
 * missing row. The richer write path for actually saving onboarding data
 * is `upsertOwnProfile` below.
 */
export async function ensureTravellerProfile(displayName: string): Promise<void> {
  const parsed = profileUpdateSchema.pick({ displayName: true }).safeParse({ displayName });
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

/**
 * Saves the caller's complete profile — signup Step 2's own write, and
 * `/dashboard/profile`'s edit form (Part 5). A genuine upsert, not
 * `ignoreDuplicates`: the caller always submits the full current state of
 * every field (the edit form is pre-filled from `fetchOwnProfile` below),
 * so overwriting is the correct, idempotent behaviour the brief asks for
 * — resubmitting the identical form twice (a browser refresh, a double
 * click, returning to finish onboarding later) always converges on the
 * same stored row, never errors, and never creates a second row
 * (`onConflict: 'user_id'`, the table's own unique constraint since Phase
 * 4.5). An omitted optional field is stored as `null`/`[]`, not left
 * untouched — this is a full save of the submitted form state, not a
 * partial patch.
 *
 * Accepts `unknown`, not a typed `ProfileOnboardingInput` — the same
 * "validate raw input at the boundary" pattern
 * `app/booking/[departureId]/payment-actions.ts` already establishes for
 * its own Server Actions, since one real caller (the profile edit form)
 * builds its input from raw `FormData` strings, not already-typed data.
 */
export async function upsertOwnProfile(input: unknown): Promise<void> {
  const parsed = profileOnboardingSchema.safeParse(input);
  if (!parsed.success) {
    throw new ProfileError('invalid', parsed.error.issues[0]?.message ?? 'Check your details.');
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new ProfileError('unauthenticated', 'Not signed in.');

  const { error } = await supabase.from('traveller_profiles').upsert(
    {
      user_id: user.id,
      display_name: parsed.data.displayName,
      phone: parsed.data.phone ?? null,
      city: parsed.data.city ?? null,
      travel_style: parsed.data.travelStyle ?? null,
      travel_interests: parsed.data.travelInterests ?? [],
      dietary_preference: parsed.data.dietaryPreference ?? null,
    },
    { onConflict: 'user_id' },
  );
  if (error) throw new ProfileError('write-failed', 'Could not save your profile.');
}

/**
 * The caller's own full profile, for `/dashboard/profile`'s edit form.
 * `null` for a signed-in user with no profile row yet — the same genuinely
 * possible state `getTravellerSession()` already documents (RLS also
 * makes this the only state a client can ever observe for a profile that
 * isn't theirs: not "forbidden", just "not found").
 */
export async function fetchOwnProfile(): Promise<TravellerProfile | null> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new ProfileError('unauthenticated', 'Not signed in.');

  const { data, error } = await supabase
    .from('traveller_profiles')
    .select('display_name, phone, city, travel_style, travel_interests, dietary_preference')
    .eq('user_id', user.id)
    .maybeSingle();
  if (error) throw new ProfileError('read-failed', 'Could not load your profile.');
  if (!data) return null;

  return {
    displayName: data.display_name,
    phone: data.phone,
    city: data.city,
    travelStyle: data.travel_style as TravelStyle | null,
    travelInterests: data.travel_interests as TravelInterest[],
    dietaryPreference: data.dietary_preference as DietaryPreference | null,
  };
}
