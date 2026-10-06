import { Card, CardAction, Stack, Text } from '@/components/ui';
import { formatBookingDate, formatBookingPrice } from '@/lib/booking/format';
import type { TravellerBookingSummary } from '@/lib/dashboard/repository';

import { BookingStatusBadge, PaymentStatusBadge } from './status-badges';

/**
 * One booking, as a row in a traveller's "My Trips" list — links to its
 * own `/dashboard/bookings/[bookingId]` detail page via `CardAction`
 * (`components/marketing/trip-card.tsx`'s own established pattern), not
 * the public trip page: this card is about THIS booking, not the trip in
 * general.
 */
export function BookingSummaryCard({ booking }: { booking: TravellerBookingSummary }) {
  const total = booking.snapshotPriceAmount * booking.participantCount;

  return (
    <Card tone="surface" interactive>
      <CardAction
        href={`/dashboard/bookings/${booking.id}`}
        label={`View booking ${booking.reference}`}
      />
      <Stack gap={3}>
        <div className="flex items-start justify-between" style={{ gap: 'var(--space-3)' }}>
          <Stack gap={1}>
            <Text variant="label" tone="brand" uppercase>
              {booking.snapshotDestination}
            </Text>
            <Text style={{ fontWeight: 'var(--weight-subheading)', fontSize: 'var(--text-lg)' }}>
              {booking.snapshotTripTitle}
            </Text>
          </Stack>
          <BookingStatusBadge status={booking.status} />
        </div>

        <div className="flex flex-wrap items-baseline" style={{ gap: 'var(--space-5)' }}>
          <Fact label="Departs" value={formatBookingDate(booking.snapshotDepartureDate)} />
          <Fact label="Travellers" value={String(booking.participantCount)} />
          <Fact label="Amount" value={formatBookingPrice(total, booking.snapshotPriceCurrency)} />
          <Fact label="Reference" value={booking.reference} />
        </div>

        <PaymentStatusBadge status={booking.paymentStatus} />
      </Stack>
    </Card>
  );
}

function Fact({ label, value }: { label: string; value: string }) {
  return (
    <Stack gap={1}>
      <Text variant="meta" tone="muted" uppercase>
        {label}
      </Text>
      <Text variant="small" style={{ fontWeight: 'var(--weight-subheading)' }}>
        {value}
      </Text>
    </Stack>
  );
}
