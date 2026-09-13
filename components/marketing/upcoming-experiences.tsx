import Link from 'next/link';
import { Suspense } from 'react';

import { Container, EmptyState, ErrorState, Section, Skeleton } from '@/components/ui';
import { getUpcomingTrips } from '@/lib/content/queries';
import type { ContentState, TripPreview } from '@/lib/content/types';

import { EditorialStatement } from './section-heading';
import { TripCard } from './trip-card';

/**
 * Upcoming experiences — 05, the main data-driven homepage section.
 *
 * Split in two, deliberately:
 *
 *   UpcomingExperiencesView   pure, given a ContentState — this is what tests
 *                             exercise directly for loading/empty/error/ready.
 *   UpcomingExperiences       the Server Component that calls the real query
 *                             and feeds the view. Swapping fixtures for
 *                             Supabase later touches queries.ts, not this file.
 *
 * The Suspense boundary is real (not decorative): `Content` is an async
 * Server Component, so a slow query genuinely streams the skeleton first.
 */

const GRID_STYLE = {
  display: 'grid',
  gap: 'var(--space-6)',
  gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))',
} as const;

export function UpcomingExperiencesView({ state }: { state: ContentState<TripPreview[]> }) {
  if (state.status === 'loading') {
    return (
      <div style={GRID_STYLE} aria-hidden="true">
        {[0, 1, 2].map((i) => (
          <div key={i} className="flex flex-col" style={{ gap: 'var(--space-3)' }}>
            <Skeleton height="200px" radius="card" />
            <Skeleton width="60%" />
            <Skeleton width="40%" />
          </div>
        ))}
      </div>
    );
  }

  if (state.status === 'error') {
    return (
      <ErrorState
        title="Trips couldn’t be loaded"
        description={state.message || 'Something went wrong on our end. Please try again shortly.'}
      />
    );
  }

  if (state.status === 'empty') {
    return (
      <EmptyState
        title="No departures open right now"
        description="New trips are added regularly — check back soon, or tell us what you're looking for."
      />
    );
  }

  return (
    <div style={GRID_STYLE}>
      {state.data.map((trip) => (
        <TripCard key={trip.id} trip={trip} />
      ))}
    </div>
  );
}

async function UpcomingExperiencesContent() {
  const state = await getUpcomingTrips();
  return <UpcomingExperiencesView state={state} />;
}

export function UpcomingExperiences() {
  return (
    <Section spacing="default" id="upcoming-experiences">
      <Container>
        <div className="flex flex-col" style={{ gap: 'var(--space-8)' }}>
          <EditorialStatement
            eyebrow="Upcoming experiences"
            title="Departures open right now"
            note={
              <Link
                href="/trips"
                className="hover:text-text-brand-strong"
                style={{
                  color: 'var(--color-text-brand)',
                  fontWeight: 'var(--weight-label)',
                  fontSize: 'var(--text-sm)',
                }}
              >
                See all trips →
              </Link>
            }
          />
          <Suspense
            fallback={
              <div style={GRID_STYLE} aria-hidden="true">
                {[0, 1, 2].map((i) => (
                  <div key={i} className="flex flex-col" style={{ gap: 'var(--space-3)' }}>
                    <Skeleton height="200px" radius="card" />
                    <Skeleton width="60%" />
                  </div>
                ))}
              </div>
            }
          >
            <UpcomingExperiencesContent />
          </Suspense>
        </div>
      </Container>
    </Section>
  );
}
