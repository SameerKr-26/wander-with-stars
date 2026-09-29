import type { Metadata } from 'next';

import { Button, Field, Heading, Input, Stack, Text } from '@/components/ui';
import { getTravellerSession } from '@/lib/traveller/auth';

import { updateProfileAction } from '../actions';

export const metadata: Metadata = {
  title: 'Edit profile — Wander With Stars',
  robots: { index: false, follow: false },
};

/**
 * The one editable field this phase ships. A plain `<form action={...}>`
 * posting to a Server Action — the same progressive-enhancement pattern
 * `app/admin/(protected)/trips/[id]/page.tsx` already uses for its own
 * edit forms — rather than client-side state, since there is nothing here
 * that needs optimistic UI or inline validation beyond what the Server
 * Action's own Zod schema (`lib/traveller/validation.ts`) already enforces.
 */
export default async function ProfilePage() {
  const session = await getTravellerSession();
  if (!session) return null;

  return (
    <Stack gap={6}>
      <Heading level="2xl" as="h1">
        Your profile
      </Heading>

      <Stack gap={1}>
        <Text variant="label" tone="muted" uppercase>
          Email
        </Text>
        <Text>{session.email}</Text>
        <Text variant="small" tone="secondary">
          Managed through your account&apos;s sign-in method — not editable here.
        </Text>
      </Stack>

      <form action={updateProfileAction}>
        <Stack gap={4}>
          <Field label="Display name" required>
            <Input
              type="text"
              name="displayName"
              required
              maxLength={80}
              defaultValue={session.displayName}
            />
          </Field>
          <Button type="submit">Save changes</Button>
        </Stack>
      </form>
    </Stack>
  );
}
