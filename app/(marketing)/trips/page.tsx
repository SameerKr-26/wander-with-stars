import { Suspense } from 'react';
import type { Metadata } from 'next';

import { Container, Section, Skeleton } from '@/components/ui';
import { UpcomingExperiencesView } from '@/components/marketing/upcoming-experiences';
import { PageHeader } from '@/components/marketing/page-header';
import { getUpcomingTrips } from '@/lib/content/queries';

/**
 * /trips — the real trip listing.
 *
 * Reuses `UpcomingExperiencesView`, the pure presentational component the
 * homepage's "Upcoming experiences" section already uses, so loading/empty/
 * error/ready behaviour is identical and only tested once. Same query
 * (`getUpcomingTrips`), so this is genuinely the same data, not a parallel
 * listing that could drift out of sync with the homepage preview.
 */

export const metadata: Metadata = {
  title: 'Trips — Wander With Stars',
  description: 'Departures open for booking, built around the people you travel with.',
};

const GRID_STYLE = {
  display: 'grid',
  gap: 'var(--space-6)',
  gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))',
} as const;

async function TripsContent() {
  const state = await getUpcomingTrips();
  return <UpcomingExperiencesView state={state} />;
}

export default function TripsPage() {
  return (
    <>
      <PageHeader
        eyebrow="Trips"
        title="Departures open right now"
        description="Every trip here is a fixed group, fixed date departure — not a template sold many times over."
      />
      <Section spacing="tight">
        <Container>
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
            <TripsContent />
          </Suspense>
        </Container>
      </Section>
    </>
  );
}
