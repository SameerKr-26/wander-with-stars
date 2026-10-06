'use server';

import { revalidatePath } from 'next/cache';

import { upsertOwnProfile } from '@/lib/traveller/profile';

/**
 * The traveller-facing profile edit (Phase 4.5's display-name-only form,
 * extended Phase 4.8A to the full onboarding field set — Part 5). Mirrors
 * app/admin/actions.ts's shape (a plain Server Action a
 * `<form action={...}>` posts to) — `upsertOwnProfile` re-validates with
 * the same Zod schema the client form does and relies on
 * `traveller_profiles`'s own-row RLS policy as the actual authorization
 * boundary, the same "RLS is the write boundary, re-checked server-side"
 * discipline `lib/admin/` already established.
 *
 * `getAll('travelInterests')` reads every checked checkbox with that
 * `name` — a plain HTML form's native way to submit a multi-select
 * without any client-side state.
 */
export async function updateProfileAction(formData: FormData): Promise<void> {
  const displayName = formData.get('displayName');
  const phone = formData.get('phone');
  const city = formData.get('city');
  const travelStyle = formData.get('travelStyle');
  const dietaryPreference = formData.get('dietaryPreference');
  const travelInterests = formData
    .getAll('travelInterests')
    .filter((v): v is string => typeof v === 'string');

  await upsertOwnProfile({
    displayName: typeof displayName === 'string' ? displayName : '',
    phone: typeof phone === 'string' && phone.trim() ? phone : undefined,
    city: typeof city === 'string' && city.trim() ? city : undefined,
    travelStyle: typeof travelStyle === 'string' && travelStyle ? travelStyle : undefined,
    travelInterests: travelInterests.length > 0 ? travelInterests : undefined,
    dietaryPreference:
      typeof dietaryPreference === 'string' && dietaryPreference ? dietaryPreference : undefined,
  });
  revalidatePath('/dashboard');
  revalidatePath('/dashboard/profile');
}
