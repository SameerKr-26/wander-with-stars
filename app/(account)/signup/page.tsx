import Link from 'next/link';
import { redirect } from 'next/navigation';
import type { Metadata } from 'next';

import { SignupForm } from '@/components/account/signup-form';
import { Heading, Stack, Text } from '@/components/ui';
import { getTravellerSession } from '@/lib/traveller/auth';

export const metadata: Metadata = {
  title: 'Create an account — Wander With Stars',
  robots: { index: false, follow: false },
};

export default async function SignupPage() {
  const session = await getTravellerSession();
  if (session) redirect('/dashboard');

  return (
    <Stack gap={6}>
      <Stack gap={1}>
        <Heading level="2xl" as="h1">
          Create an account
        </Heading>
        <Text tone="secondary">Join Wander With Stars.</Text>
      </Stack>
      <SignupForm />
      <Text variant="small" tone="secondary">
        Already have an account?{' '}
        <Link href="/login" style={{ color: 'var(--color-text-brand)' }}>
          Sign in
        </Link>
      </Text>
    </Stack>
  );
}
