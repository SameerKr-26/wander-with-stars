import Link from 'next/link';
import { notFound } from 'next/navigation';
import type { Metadata } from 'next';

import { BookingStatusBadge, PaymentStatusBadge } from '@/components/dashboard/status-badges';
import { GlassPanel, Heading, Stack, Text } from '@/components/ui';
import { formatBookingDate, formatBookingPrice } from '@/lib/booking/format';
import { fetchTravellerBookingDetail } from '@/lib/dashboard/repository';
import { getTravellerSession } from '@/lib/traveller/auth';

export const metadata: Metadata = {
  title: 'Booking details — Wander With Stars',
  robots: { index: false, follow: false },
};

interface PageProps {
  params: Promise<{ bookingId: string }>;
}

/**
 * /dashboard/bookings/[bookingId] — Phase 4.8.
 *
 * `fetchTravellerBookingDetail` independently re-checks
 * `traveller_id === session.userId` against the row it reads, on top of
 * the RLS policy that already scopes the query — this phase's own
 * "every booking detail read must independently verify ownership, do not
 * trust the booking ID supplied by the browser" requirement, satisfied
 * twice over rather than once. A booking that doesn't exist, isn't this
 * traveller's own, or is a guest booking are all indistinguishable 404s —
 * never a distinguishing "forbidden" response that would confirm to an
 * attacker that a given ID exists at all.
 */
export default async function BookingDetailPage({ params }: PageProps) {
  const { bookingId } = await params;
  const session = await getTravellerSession();
  if (!session) return null;

  const booking = await fetchTravellerBookingDetail(bookingId, session.userId);
  if (!booking) notFound();

  const total = booking.snapshotPriceAmount * booking.participantCount;

  return (
    <Stack gap={6}>
      <Stack gap={1}>
        <Text variant="small" tone="secondary">
          <Link href="/dashboard" style={{ color: 'var(--color-text-brand)' }}>
            ← My Trips
          </Link>
        </Text>
        <Heading level="2xl" as="h1">
          {booking.snapshotTripTitle}
        </Heading>
        <Text tone="secondary">{booking.snapshotDestination}</Text>
      </Stack>

      <GlassPanel variant="tinted" radius="panel" style={{ padding: 'var(--space-6)' }}>
        <Stack gap={4}>
          <Stack gap={1}>
            <Text variant="label" tone="brand" uppercase>
              Booking reference
            </Text>
            <Text style={{ fontSize: 'var(--text-2xl)', fontWeight: 'var(--weight-heading)' }}>
              {booking.reference}
            </Text>
          </Stack>

          <div className="flex flex-wrap" style={{ gap: 'var(--space-3)' }}>
            <BookingStatusBadge status={booking.status} />
            <PaymentStatusBadge status={booking.paymentStatus} />
          </div>

          <Stack gap={2}>
            <DetailRow label="Departs" value={formatBookingDate(booking.snapshotDepartureDate)} />
            {booking.snapshotReturnDate ? (
              <DetailRow label="Returns" value={formatBookingDate(booking.snapshotReturnDate)} />
            ) : null}
            <DetailRow label="Travellers" value={String(booking.participantCount)} />
            <DetailRow
              label="Booked amount"
              value={formatBookingPrice(total, booking.snapshotPriceCurrency)}
              emphasis
            />
          </Stack>
        </Stack>
      </GlassPanel>

      <Stack gap={3}>
        <Text
          as="h2"
          style={{ fontWeight: 'var(--weight-subheading)', fontSize: 'var(--text-lg)' }}
        >
          Travellers on this booking
        </Text>
        <Stack gap={2}>
          {booking.participants.map((participant) => (
            <div
              key={participant.id}
              className="flex items-center justify-between"
              style={{ gap: 'var(--space-4)' }}
            >
              <Text>{participant.fullName}</Text>
              {participant.isLead ? (
                <Text variant="meta" tone="muted" uppercase>
                  Lead traveller
                </Text>
              ) : null}
            </div>
          ))}
        </Stack>
      </Stack>

      <Stack gap={3}>
        <Text
          as="h2"
          style={{ fontWeight: 'var(--weight-subheading)', fontSize: 'var(--text-lg)' }}
        >
          Contact details
        </Text>
        <Stack gap={2}>
          <DetailRow label="Name" value={booking.contactName} />
          <DetailRow label="Email" value={booking.contactEmail} />
          {booking.contactPhone ? <DetailRow label="Phone" value={booking.contactPhone} /> : null}
        </Stack>
      </Stack>

      <Text variant="small" tone="secondary">
        <Link
          href={`/trips/${booking.snapshotTripSlug}`}
          style={{ color: 'var(--color-text-brand)' }}
        >
          View the current trip page →
        </Link>
      </Text>
    </Stack>
  );
}

function DetailRow({
  label,
  value,
  emphasis,
}: {
  label: string;
  value: string;
  emphasis?: boolean;
}) {
  return (
    <div className="flex items-baseline justify-between" style={{ gap: 'var(--space-4)' }}>
      <Text variant="small" tone="muted">
        {label}
      </Text>
      <Text
        style={{
          fontWeight: emphasis ? 'var(--weight-heading)' : 'var(--weight-subheading)',
          fontSize: emphasis ? 'var(--text-lg)' : undefined,
          textAlign: 'right',
        }}
      >
        {value}
      </Text>
    </div>
  );
}
