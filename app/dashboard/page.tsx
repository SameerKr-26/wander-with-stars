import type { Metadata } from 'next';

import { BookingGroupSection } from '@/components/dashboard/booking-group-section';
import { UpcomingTripPanel } from '@/components/dashboard/upcoming-trip-panel';
import { EmptyState, Heading, LinkButton, Stack, Text } from '@/components/ui';
import { fetchTravellerBookingGroups } from '@/lib/dashboard/repository';
import { getTravellerSession } from '@/lib/traveller/auth';

export const metadata: Metadata = {
  title: 'My Trips — Wander With Stars',
  robots: { index: false, follow: false },
};

/**
 * The traveller dashboard — "My Trips" (Phase 4.8).
 *
 * `fetchTravellerBookingGroups` reads through the session-aware client
 * under RLS (`auth.uid() = bookings.traveller_id`) — never the service
 * role — so this page can genuinely only ever see this signed-in
 * traveller's own bookings; a guest booking (`traveller_id is null`)
 * structurally can never appear here, by construction, not by a filter
 * this page remembers to apply.
 *
 * The "Welcome back, {name}" heading is Phase 4.5's original greeting,
 * kept verbatim — `tests/e2e-db/traveller-auth.spec.ts` already asserts
 * on this exact text, and this phase extends the page rather than
 * replacing what it already did.
 */
export default async function DashboardPage() {
  const session = await getTravellerSession();
  // The layout above already guarantees a session exists by the time this
  // renders; this narrows the type rather than re-implementing the gate.
  if (!session) return null;

  const groups = await fetchTravellerBookingGroups(session.userId);
  const hasAnyBooking =
    groups.upcoming.length > 0 || groups.past.length > 0 || groups.cancelled.length > 0;
  const [nextTrip, ...restUpcoming] = groups.upcoming;

  return (
    <Stack gap={8}>
      <Stack gap={2}>
        <Heading level="2xl" as="h1">
          Welcome back, {session.displayName}
        </Heading>
        <Text tone="secondary">Your trips, bookings and travel details, all in one place.</Text>
      </Stack>

      {!hasAnyBooking ? (
        <EmptyState
          title="Your next adventure starts here."
          description="You don't have any bookings yet. Explore WWS trips and reserve your spot."
          action={<LinkButton href="/trips">Explore Trips</LinkButton>}
        />
      ) : (
        <Stack gap={8}>
          {nextTrip ? <UpcomingTripPanel booking={nextTrip} /> : null}

          <BookingGroupSection title="Upcoming" bookings={restUpcoming} />
          <BookingGroupSection title="Past" bookings={groups.past} />
          <BookingGroupSection title="Cancelled" bookings={groups.cancelled} />
        </Stack>
      )}
    </Stack>
  );
}
