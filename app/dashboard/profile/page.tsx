import type { Metadata } from 'next';

import { Button, Checkbox, Field, Heading, Input, Select, Stack, Text } from '@/components/ui';
import { fetchOwnProfile } from '@/lib/traveller/profile';
import { getTravellerSession } from '@/lib/traveller/auth';
import { DIETARY_PREFERENCES, TRAVEL_INTERESTS, TRAVEL_STYLES } from '@/lib/traveller/validation';

import { updateProfileAction } from '../actions';

export const metadata: Metadata = {
  title: 'Edit profile — Wander With Stars',
  robots: { index: false, follow: false },
};

/**
 * Profile editing — Phase 4.5's display-name-only form, extended Phase
 * 4.8A to the full onboarding field set (Part 5). A plain
 * `<form action={...}>` posting to a Server Action — the same
 * progressive-enhancement pattern `app/admin/(protected)/trips/[id]/page.tsx`
 * already uses for its own edit forms — rather than client-side state,
 * since there is nothing here that needs optimistic UI or inline
 * validation beyond what the Server Action's own Zod schema
 * (`lib/traveller/validation.ts`) already enforces.
 *
 * `fetchOwnProfile` reads through the session-aware client under RLS —
 * `traveller_profiles`'s own-row select policy (Phase 4.5) is what makes
 * "only your own profile" true here, not an application-layer check this
 * page adds on top.
 */
export default async function ProfilePage() {
  const session = await getTravellerSession();
  if (!session) return null;

  const profile = await fetchOwnProfile();

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
          <Field label="Full name" required>
            <Input
              type="text"
              name="displayName"
              required
              maxLength={80}
              defaultValue={session.displayName}
            />
          </Field>

          <Field label="Phone / WhatsApp" description="Optional.">
            <Input type="tel" name="phone" defaultValue={profile?.phone ?? ''} />
          </Field>

          <Field label="City" description="Optional.">
            <Input type="text" name="city" defaultValue={profile?.city ?? ''} />
          </Field>

          <Field label="Preferred travel style" description="Optional.">
            <Select name="travelStyle" defaultValue={profile?.travelStyle ?? ''}>
              <option value="">No preference</option>
              {TRAVEL_STYLES.map((style) => (
                <option key={style} value={style}>
                  {style}
                </option>
              ))}
            </Select>
          </Field>

          <Stack gap={2}>
            <Text variant="small" style={{ fontWeight: 'var(--weight-label)' }}>
              Travel interests{' '}
              <Text as="span" variant="small" tone="muted">
                (optional, pick any)
              </Text>
            </Text>
            <div className="grid grid-cols-2" style={{ gap: 'var(--space-2)' }}>
              {TRAVEL_INTERESTS.map((interest) => (
                <Checkbox
                  key={interest}
                  label={interest}
                  name="travelInterests"
                  value={interest}
                  defaultChecked={profile?.travelInterests.includes(interest) ?? false}
                />
              ))}
            </div>
          </Stack>

          <Field label="Dietary preference" description="Optional.">
            <Select name="dietaryPreference" defaultValue={profile?.dietaryPreference ?? ''}>
              <option value="">Prefer not to say</option>
              {DIETARY_PREFERENCES.map((preference) => (
                <option key={preference} value={preference}>
                  {preference}
                </option>
              ))}
            </Select>
          </Field>

          <Button type="submit">Save changes</Button>
        </Stack>
      </form>
    </Stack>
  );
}
