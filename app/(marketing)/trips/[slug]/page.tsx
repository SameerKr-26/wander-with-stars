import { notFound } from 'next/navigation';
import type { Metadata } from 'next';

import {
  Badge,
  Button,
  Container,
  GlassPanel,
  Heading,
  ImageFrame,
  LinkButton,
  Section,
  Separator,
  Stack,
  Text,
} from '@/components/ui';
import { StarMark } from '@/components/marketing/section-heading';
import {
  formatAvailability,
  formatDuration,
  formatPrice,
  formatTripDate,
  topStyleSignals,
} from '@/lib/content/format';
import { getTripBySlug } from '@/lib/content/queries';

/**
 * /trips/[slug] — trip detail architecture.
 *
 * Establishes the product surface described in
 * docs/DATABASE.md's hierarchy — Trip → Departure → Itinerary → Activities →
 * Media — as a page, using development fixtures (lib/content/fixtures.ts).
 * No booking logic: the itinerary engine and booking flow are later
 * milestones (docs/ROADMAP.md Phases 5–6). Everything invented for this page
 * (overview copy, itinerary days) is visibly labelled "Sample" — never
 * presented as a real WWS itinerary.
 *
 * An unknown slug is a real 404 via `notFound()`, not a fabricated "coming
 * soon" page for a URL that was never valid.
 */

interface PageProps {
  params: Promise<{ slug: string }>;
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { slug } = await params;
  const state = await getTripBySlug(slug);
  if (state.status !== 'ready') return { title: 'Trip not found — Wander With Stars' };
  return {
    title: `${state.data.title} — Wander With Stars`,
    description: state.data.overview,
  };
}

export default async function TripDetailPage({ params }: PageProps) {
  const { slug } = await params;
  const state = await getTripBySlug(slug);

  if (state.status !== 'ready') {
    notFound();
  }

  const trip = state.data;
  const topStyles = topStyleSignals(trip.styleScores, 3);

  return (
    <>
      {/* Hero media area */}
      <section className="relative" aria-label={trip.title}>
        <ImageFrame
          src={trip.heroMedia.kind === 'image' ? trip.heroMedia.src : undefined}
          alt={trip.heroMedia.kind === 'image' ? trip.heroMedia.alt : undefined}
          ratio="cinematic"
          radius="none"
        >
          {trip.heroMedia.kind !== 'image' ? (
            <div
              className="absolute inset-0"
              style={{
                background:
                  'linear-gradient(135deg, var(--wws-teal-core), var(--wws-teal-deep) 80%)',
              }}
            />
          ) : null}
          <div
            className="absolute inset-x-0 bottom-0"
            style={{
              background:
                'linear-gradient(to top, color-mix(in srgb, var(--wws-charcoal) 65%, transparent), transparent)',
              padding: 'var(--space-8) var(--container-gutter)',
            }}
          >
            <Container>
              <Stack gap={2}>
                <Text
                  variant="label"
                  uppercase
                  style={{ color: 'var(--wws-white)', opacity: 0.85 }}
                >
                  <StarMark /> {trip.destination}, {trip.country}
                </Text>
                <Heading level="3xl" as="h1" style={{ color: 'var(--wws-white)' }}>
                  {trip.title}
                </Heading>
              </Stack>
            </Container>
          </div>
        </ImageFrame>
      </section>

      {/* Quick metadata + availability + CTA */}
      <Section spacing="tight">
        <Container>
          <div
            className="flex flex-wrap items-start justify-between"
            style={{ gap: 'var(--space-6)' }}
          >
            <div className="flex flex-wrap" style={{ gap: 'var(--space-6)' }}>
              <Metadata label="Departs" value={formatTripDate(trip.departureDate)} />
              <Metadata label="Duration" value={formatDuration(trip.durationNights)} />
              <Metadata label="Price" value={`${formatPrice(trip.price)} / person`} />
              <Metadata
                label="Availability"
                value={formatAvailability(trip.availability.status, trip.availability.spotsLeft)}
              />
            </div>

            <Stack gap={2} align="end">
              <Button disabled title="Booking opens once the payments milestone ships">
                Booking opens soon
              </Button>
              <Text variant="meta" tone="muted">
                Not yet bookable — see docs/ROADMAP.md Phase 6
              </Text>
            </Stack>
          </div>

          {topStyles.length > 0 ? (
            <div
              className="flex flex-wrap"
              style={{ gap: 'var(--space-2)', marginTop: 'var(--space-6)' }}
            >
              {topStyles.map(({ signal }) => (
                <Badge key={signal} tone="outline">
                  {signal[0]?.toUpperCase()}
                  {signal.slice(1)}
                </Badge>
              ))}
            </div>
          ) : null}
        </Container>
      </Section>

      <Container>
        <Separator />
      </Container>

      {/* Overview */}
      <Section spacing="default">
        <Container width="narrow">
          <Stack gap={3}>
            <Text variant="label" tone="brand" uppercase>
              Overview
            </Text>
            <Text
              tone="secondary"
              style={{ fontSize: 'var(--text-lg)', lineHeight: 'var(--leading-normal)' }}
            >
              {trip.overview}
            </Text>
          </Stack>
        </Container>
      </Section>

      {/* Itinerary preview */}
      <Section spacing="default" style={{ background: 'var(--color-background-secondary)' }}>
        <Container>
          <Stack gap={6}>
            <Stack gap={2}>
              <Text variant="label" tone="brand" uppercase>
                Sample itinerary
              </Text>
              <Text tone="secondary" variant="small">
                Illustrative only — the real day-by-day plan for this departure is confirmed closer
                to travel.
              </Text>
            </Stack>
            <div className="flex flex-col" style={{ gap: 'var(--space-5)' }}>
              {trip.itineraryPreview.map((day) => (
                <div key={day.day} className="flex" style={{ gap: 'var(--space-5)' }}>
                  <Text
                    as="span"
                    className="shrink-0 tabular-nums"
                    style={{
                      fontFamily: 'var(--font-display)',
                      fontSize: 'var(--text-2xl)',
                      fontWeight: 'var(--weight-display)',
                      color: 'var(--color-text-brand)',
                      width: '3ch',
                    }}
                  >
                    {String(day.day).padStart(2, '0')}
                  </Text>
                  <Stack gap={1}>
                    <Text style={{ fontWeight: 'var(--weight-subheading)' }}>{day.title}</Text>
                    <Text variant="small" tone="secondary">
                      {day.summary}
                    </Text>
                  </Stack>
                </div>
              ))}
            </div>
          </Stack>
        </Container>
      </Section>

      {/* Host + community context */}
      <Section spacing="default">
        <Container>
          <div
            className="grid"
            style={{
              gap: 'var(--space-8)',
              gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))',
            }}
          >
            <Stack gap={2}>
              <Text variant="label" tone="brand" uppercase>
                Your host
              </Text>
              <Text style={{ fontWeight: 'var(--weight-subheading)' }}>{trip.host.name}</Text>
              <Text variant="small" tone="secondary">
                Travels with the group for the full departure, start to finish.
              </Text>
            </Stack>
            <Stack gap={2}>
              <Text variant="label" tone="brand" uppercase>
                Who&apos;s going
              </Text>
              <Text variant="small" tone="secondary">
                {trip.travellerCount !== undefined
                  ? `${trip.travellerCount} travellers have joined this departure so far.`
                  : 'Traveller count for this departure isn’t available yet.'}
              </Text>
            </Stack>
          </div>
        </Container>
      </Section>

      {/* CTA back into the product */}
      <Section spacing="default">
        <Container>
          <GlassPanel
            variant="tinted"
            radius="panel"
            className="flex flex-wrap items-center justify-between"
            style={{ gap: 'var(--space-4)', padding: 'var(--space-6)' }}
          >
            <Text style={{ fontWeight: 'var(--weight-subheading)', fontSize: 'var(--text-lg)' }}>
              Looking for a different departure?
            </Text>
            <LinkButton href="/trips" variant="secondary">
              ← All trips
            </LinkButton>
          </GlassPanel>
        </Container>
      </Section>
    </>
  );
}

function Metadata({ label, value }: { label: string; value: string }) {
  return (
    <Stack gap={1}>
      <Text variant="meta" tone="muted" uppercase>
        {label}
      </Text>
      <Text style={{ fontWeight: 'var(--weight-subheading)' }}>{value}</Text>
    </Stack>
  );
}
