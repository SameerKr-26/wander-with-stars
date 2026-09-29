import Link from 'next/link';
import type { Metadata } from 'next';

import { Heading, Stack, Text } from '@/components/ui';
import { getTravellerSession } from '@/lib/traveller/auth';

export const metadata: Metadata = {
  title: 'Your account — Wander With Stars',
  robots: { index: false, follow: false },
};

/**
 * Minimal account landing — NOT the traveller dashboard docs/ROUTES.md
 * sketches (`/dashboard/trips`, `/bookings`, `/payments`, `/documents`,
 * `/community`, `/wishlist`, `/recommendations`, `/passport`,
 * `/preferences`, `/notifications`, `/support`). This phase establishes
 * identity and account ownership only — see docs/ARCHITECTURE.md's
 * "Traveller authentication" section for the full list of what is
 * deliberately deferred and why.
 */
export default async function DashboardPage() {
  const session = await getTravellerSession();
  // The layout above already guarantees a session exists by the time this
  // renders; this narrows the type rather than re-implementing the gate.
  if (!session) return null;

  return (
    <Stack gap={4}>
      <Heading level="2xl" as="h1">
        Welcome back, {session.displayName}
      </Heading>
      <Text tone="secondary">
        Your account is set up. Trip bookings and history will appear here in a future update.
      </Text>
      <Text variant="small" tone="secondary">
        <Link href="/dashboard/profile" style={{ color: 'var(--color-text-brand)' }}>
          Edit your profile →
        </Link>
      </Text>
    </Stack>
  );
}
