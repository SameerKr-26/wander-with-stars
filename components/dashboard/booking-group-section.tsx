import { Stack, Text } from '@/components/ui';
import type { TravellerBookingSummary } from '@/lib/dashboard/repository';

import { BookingSummaryCard } from './booking-summary-card';

/**
 * One of the three "My Trips" groups (Upcoming/Past/Cancelled) — renders
 * nothing at all when empty, rather than an empty heading with nothing
 * under it. The dashboard page itself decides what to show when EVERY
 * group is empty (its own distinct empty state, this phase's brief item
 * 4); this component only ever handles "this one group has rows."
 */
export function BookingGroupSection({
  title,
  bookings,
}: {
  title: string;
  bookings: readonly TravellerBookingSummary[];
}) {
  if (bookings.length === 0) return null;

  return (
    <Stack gap={4}>
      <Text as="h2" style={{ fontSize: 'var(--text-lg)', fontWeight: 'var(--weight-subheading)' }}>
        {title}
      </Text>
      <Stack gap={3}>
        {bookings.map((booking) => (
          <BookingSummaryCard key={booking.id} booking={booking} />
        ))}
      </Stack>
    </Stack>
  );
}
