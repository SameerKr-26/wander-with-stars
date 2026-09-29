import Link from 'next/link';
import { redirect } from 'next/navigation';
import type { Metadata } from 'next';

import { LoginForm } from '@/components/account/login-form';
import { Heading, Stack, Text } from '@/components/ui';
import { getTravellerSession } from '@/lib/traveller/auth';

export const metadata: Metadata = {
  title: 'Sign in — Wander With Stars',
  robots: { index: false, follow: false },
};

export default async function LoginPage() {
  // A signed-in traveller has no reason to see the sign-in form again —
  // send them straight to their account instead of a confusing "sign in
  // again?" state.
  const session = await getTravellerSession();
  if (session) redirect('/dashboard');

  return (
    <Stack gap={6}>
      <Stack gap={1}>
        <Heading level="2xl" as="h1">
          Sign in
        </Heading>
        <Text tone="secondary">Welcome back.</Text>
      </Stack>
      <LoginForm />
      <Stack gap={2}>
        <Text variant="small" tone="secondary">
          <Link href="/forgot-password" style={{ color: 'var(--color-text-brand)' }}>
            Forgot your password?
          </Link>
        </Text>
        <Text variant="small" tone="secondary">
          New here?{' '}
          <Link href="/signup" style={{ color: 'var(--color-text-brand)' }}>
            Create an account
          </Link>
        </Text>
      </Stack>
    </Stack>
  );
}
