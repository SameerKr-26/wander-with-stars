import Link from 'next/link';
import { redirect } from 'next/navigation';
import type { Metadata } from 'next';

import { ForgotPasswordForm } from '@/components/account/forgot-password-form';
import { Heading, Stack, Text } from '@/components/ui';
import { getTravellerSession } from '@/lib/traveller/auth';

export const metadata: Metadata = {
  title: 'Reset your password — Wander With Stars',
  robots: { index: false, follow: false },
};

export default async function ForgotPasswordPage() {
  const session = await getTravellerSession();
  if (session) redirect('/dashboard');

  return (
    <Stack gap={6}>
      <Stack gap={1}>
        <Heading level="2xl" as="h1">
          Reset your password
        </Heading>
        <Text tone="secondary">We&apos;ll email you a link to choose a new one.</Text>
      </Stack>
      <ForgotPasswordForm />
      <Text variant="small" tone="secondary">
        <Link href="/login" style={{ color: 'var(--color-text-brand)' }}>
          ← Back to sign in
        </Link>
      </Text>
    </Stack>
  );
}
