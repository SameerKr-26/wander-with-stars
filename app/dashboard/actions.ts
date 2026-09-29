'use server';

import { revalidatePath } from 'next/cache';

import { updateOwnDisplayName } from '@/lib/traveller/profile';

/**
 * The one traveller-facing write this phase ships: updating your own
 * display name. Mirrors app/admin/actions.ts's shape (a plain Server Action
 * a <form action={...}> posts to) — `updateOwnDisplayName` re-validates
 * with the same Zod schema the client form does and relies on
 * `traveller_profiles`'s own-row RLS policy as the actual authorization
 * boundary, the same "RLS is the write boundary, re-checked server-side"
 * discipline `lib/admin/` already established.
 */
export async function updateProfileAction(formData: FormData): Promise<void> {
  const displayName = formData.get('displayName');
  await updateOwnDisplayName({ displayName: typeof displayName === 'string' ? displayName : '' });
  revalidatePath('/dashboard');
  revalidatePath('/dashboard/profile');
}
