import type { Metadata } from 'next';

import { ResetPasswordForm } from '@/components/account/reset-password-form';
import { Heading, Stack, Text } from '@/components/ui';

/**
 * Not listed in docs/ROUTES.md's current route map, but a necessary sibling
 * of `/forgot-password`: `resetPasswordForEmail`'s email link has to land
 * somewhere that can actually call `auth.updateUser({ password })`. No
 * session gate here (unlike every other page in this route group) —
 * `ResetPasswordForm` itself checks for the temporary recovery session the
 * link establishes and shows an honest "this link is invalid or has
 * expired" state when there isn't one, rather than a layout-level redirect
 * that would fire before that session exists.
 */
export const metadata: Metadata = {
  title: 'Choose a new password — Wander With Stars',
  robots: { index: false, follow: false },
};

export default function ResetPasswordPage() {
  return (
    <Stack gap={6}>
      <Stack gap={1}>
        <Heading level="2xl" as="h1">
          Choose a new password
        </Heading>
        <Text tone="secondary">Enter a new password for your account.</Text>
      </Stack>
      <ResetPasswordForm />
    </Stack>
  );
}
