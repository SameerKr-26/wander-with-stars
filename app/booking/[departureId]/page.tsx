import { notFound } from 'next/navigation';
import type { Metadata } from 'next';

import { BookingWizard } from '@/components/booking/booking-wizard';
import { fetchBookableDepartureSummary } from '@/lib/booking/repository';

/**
 * /booking/[departureId] — Phase 4.6.
 *
 * Keyed by the exact `trip_departure_id` the traveller selected on
 * `/trips/[slug]` (`TripDeparturePanel`'s "Book this departure" link) —
 * never a trip slug, never an array position. This page's own read
 * (`fetchBookableDepartureSummary`) is display-only, so the wizard has
 * something to show; it is NOT the authoritative check a submission
 * relies on — `submitBookingAction` re-validates the same departure
 * server-side a second time, from scratch, at the moment of booking.
 *
 * A departure id that doesn't exist, or belongs to a trip RLS hides from
 * the current (possibly anonymous) reader, is a real 404 — the same
 * "unknown vs. hidden are indistinguishable on purpose" convention
 * `/trips/[slug]` already follows.
 *
 * CONTROL-world route, deliberately outside `app/(marketing)/` — no
 * cinematic site header/footer here, matching the phase's own visual
 * scope (`app/(account)/` and `app/dashboard/` already established this
 * pattern for auth/account pages).
 */

interface PageProps {
  params: Promise<{ departureId: string }>;
}

export const metadata: Metadata = {
  title: 'Reserve your spot — Wander With Stars',
  robots: { index: false, follow: false },
};

export default async function BookingPage({ params }: PageProps) {
  const { departureId } = await params;
  const summary = await fetchBookableDepartureSummary(departureId);
  if (!summary) notFound();

  return <BookingWizard departureId={departureId} summary={summary} />;
}
