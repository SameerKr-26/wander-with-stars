import { Suspense } from 'react';
import type { Metadata } from 'next';

import { Container, EmptyState, ErrorState, Section, Skeleton } from '@/components/ui';
import { TripDiscoveryCTA } from '@/components/trips/trip-discovery-cta';
import { TripDiscoveryExperience } from '@/components/trips/trip-discovery-experience';
import { TripDiscoveryHero } from '@/components/trips/discovery-hero';
import { getUpcomingTrips } from '@/lib/content/queries';

/**
 * /trips — trip discovery (Phase 3.4).
 *
 * This Server Component owns exactly one job: resolve the *system-level*
 * content state (is there any trip data at all?) and hand a plain
 * `TripPreview[]` to `TripDiscoveryExperience`, the single client boundary
 * that owns search/filter state. That split matters for two reasons:
 *
 *   1. Loading/error/empty here mean "the query layer has no trips" — a
 *      different, more serious condition than "no trips match the current
 *      filter", which TripEmptyState (inside the experience) handles.
 *   2. Everything above the client boundary — this file, the hero — ships
 *      no client JS. Only the interactive discovery surface does.
 */

export const metadata: Metadata = {
  title: 'Trips — Wander With Stars',
  description: 'Discover trips built around experiences, people and moments.',
};

async function TripsContent() {
  const state = await getUpcomingTrips();

  // 'loading' is part of ContentState's declared shape for a real streaming
  // query later; getUpcomingTrips() never actually returns it today (Suspense
  // owns the loading UI at the boundary above), but the branch must exist for
  // TypeScript to narrow the rest of this function safely — and so it stays
  // correct if that ever changes.
  if (state.status === 'loading') {
    return null;
  }

  if (state.status === 'error') {
    return (
      <Section spacing="tight">
        <Container>
          <ErrorState
            title="Trips couldn’t be loaded"
            description={
              state.message || 'Something went wrong on our end. Please try again shortly.'
            }
          />
        </Container>
      </Section>
    );
  }

  if (state.status === 'empty') {
    return (
      <Section spacing="tight">
        <Container>
          <EmptyState
            title="No departures open right now"
            description="New trips are added regularly — check back soon, or tell us what you're looking for."
          />
        </Container>
      </Section>
    );
  }

  return <TripDiscoveryExperience trips={state.data} />;
}

export default function TripsPage() {
  return (
    <>
      <TripDiscoveryHero />
      <Suspense
        fallback={
          <Section spacing="default">
            <Container>
              <div className="flex flex-col" style={{ gap: 'var(--space-6)' }} aria-hidden="true">
                <Skeleton height="360px" radius="card" />
                <Skeleton width="40%" />
                <Skeleton width="60%" />
              </div>
            </Container>
          </Section>
        }
      >
        <TripsContent />
      </Suspense>
      <TripDiscoveryCTA />
    </>
  );
}
