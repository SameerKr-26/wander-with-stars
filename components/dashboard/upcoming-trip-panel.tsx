import Link from 'next/link';

import { GlassPanel, LinkButton, Stack, Text } from '@/components/ui';
import { formatBookingDate, formatBookingPrice } from '@/lib/booking/format';
import type { TravellerBookingSummary } from '@/lib/dashboard/repository';

import { BookingStatusBadge, PaymentStatusBadge } from './status-badges';

/**
 * The single next relevant trip, highlighted above the full "My Trips"
 * lists — the dashboard's own hero moment (this phase's brief item 2).
 * Every value shown is the booking's own commercial snapshot — the exact
 * "historical values come from the booking, never recalculated from
 * current trip content" rule applies here too, even though this is the
 * NEXT trip, not a past one: a price change to the live departure between
 * booking and today must never silently change what this traveller
 * actually booked.
 *
 * `snapshotTripSlug` links to the CURRENT public trip page — the brief's
 * own distinction between "the booking's historical facts" (shown here,
 * frozen) and "the current public trip page" (live content, a separate
 * link) stays intact: one component, two deliberately different sources.
 */
export function UpcomingTripPanel({ booking }: { booking: TravellerBookingSummary }) {
  const total = booking.snapshotPriceAmount * booking.participantCount;

  return (
    <GlassPanel variant="tinted" radius="panel" style={{ padding: 'var(--space-6)' }}>
      <Stack gap={4}>
        <div className="flex items-start justify-between" style={{ gap: 'var(--space-3)' }}>
          <Stack gap={1}>
            <Text variant="label" tone="brand" uppercase>
              Your next trip — {booking.snapshotDestination}
            </Text>
            <Text
              as="h2"
              style={{ fontSize: 'var(--text-xl)', fontWeight: 'var(--weight-heading)' }}
            >
              {booking.snapshotTripTitle}
            </Text>
          </Stack>
          <BookingStatusBadge status={booking.status} />
        </div>

        <div className="flex flex-wrap" style={{ gap: 'var(--space-5)' }}>
          <Fact label="Departs" value={formatBookingDate(booking.snapshotDepartureDate)} />
          {booking.snapshotReturnDate ? (
            <Fact label="Returns" value={formatBookingDate(booking.snapshotReturnDate)} />
          ) : null}
          <Fact label="Travellers" value={String(booking.participantCount)} />
          <Fact label="Amount" value={formatBookingPrice(total, booking.snapshotPriceCurrency)} />
          <Fact label="Booking reference" value={booking.reference} />
        </div>

        <PaymentStatusBadge status={booking.paymentStatus} />

        <div className="flex flex-wrap" style={{ gap: 'var(--space-3)' }}>
          <LinkButton href={`/dashboard/bookings/${booking.id}`} variant="primary">
            View booking details
          </LinkButton>
          <Link
            href={`/trips/${booking.snapshotTripSlug}`}
            style={{ color: 'var(--color-text-brand)', alignSelf: 'center' }}
          >
            View trip page →
          </Link>
        </div>
      </Stack>
    </GlassPanel>
  );
}

function Fact({ label, value }: { label: string; value: string }) {
  return (
    <Stack gap={1}>
      <Text variant="meta" tone="muted" uppercase>
        {label}
      </Text>
      <Text style={{ fontWeight: 'var(--weight-subheading)' }}>{value}</Text>
    </Stack>
  );
}
