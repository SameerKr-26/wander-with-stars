import Link from 'next/link';
import type { Metadata } from 'next';

import { Container, EmptyState, ErrorState, Heading, Section, Text } from '@/components/ui';
import { Highlight } from '@/components/marketing/highlight';
import { AllTripsCatalogue } from '@/components/trips/all-trips-catalogue';
import { getUpcomingTrips } from '@/lib/content/queries';

/**
 * /trips/all — the complete trip directory.
 *
 * Product distinction from /trips (docs discussed inline where it matters):
 * /trips is discovery — editorial, inspirational, exploratory. /trips/all is
 * the plain "show me everything" destination — complete, scannable,
 * practical. No hero storytelling, no featured trip, no mood section; a
 * heading, a search field, and a grid of every trip.
 *
 * Uses the same `getUpcomingTrips()` query /trips and the homepage already
 * call — no second fixture set, no parallel data path. When a real Supabase
 * catalogue query exists, swapping it in here needs no change to
 * AllTripsCatalogue or JourneyEntry.
 */

export const metadata: Metadata = {
  title: 'All journeys — Wander With Stars',
  description: 'Every current WWS journey in one place.',
};

export default async function AllTripsPage() {
  const state = await getUpcomingTrips();

  return (
    <>
      <Section spacing="tight">
        <Container>
          <div className="flex flex-col" style={{ gap: 'var(--space-3)' }}>
            <Link
              href="/trips"
              className="hover:text-text-brand-strong"
              style={{
                color: 'var(--color-text-brand)',
                fontSize: 'var(--text-sm)',
                fontWeight: 'var(--weight-label)',
              }}
            >
              ← Discover trips
            </Link>
            <Heading level="4xl" as="h1">
              All <Highlight>journeys</Highlight>
            </Heading>
            <Text tone="secondary" style={{ fontSize: 'var(--text-lg)' }}>
              Every current WWS journey in one place.
            </Text>
          </div>
        </Container>
      </Section>

      <Section spacing="default">
        <Container>
          {state.status === 'error' ? (
            <ErrorState
              title="Trips couldn’t be loaded"
              description={
                state.message || 'Something went wrong on our end. Please try again shortly.'
              }
            />
          ) : state.status === 'empty' ? (
            <EmptyState
              title="No departures open right now"
              description="New trips are added regularly — check back soon, or tell us what you're looking for."
            />
          ) : state.status === 'loading' ? null : (
            <AllTripsCatalogue trips={state.data} />
          )}
        </Container>
      </Section>
    </>
  );
}
