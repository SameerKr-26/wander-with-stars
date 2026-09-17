import { Button, Container, Heading, ImageFrame, Stack, Text } from '@/components/ui';
import { StarMark } from '@/components/marketing/section-heading';
import {
  formatAvailability,
  formatDuration,
  formatPrice,
  formatTripDate,
} from '@/lib/content/format';
import type { TripDetail } from '@/lib/content/types';

/**
 * TripHero — ARRIVAL.
 *
 * Deliberately not the homepage hero repeated: shorter, media-led, and
 * useful rather than a full-viewport statement (docs/WWS_VISUAL_IDENTITY.md's
 * cinematic treatment belongs to the homepage's first impression). Image and
 * text arrive together via a one-time CSS animation (`.wws-arrival-media` /
 * `.wws-arrival-text`, trip-detail.css) — always in the initial viewport, so
 * this runs on mount rather than on scroll intersection, unlike the reveal
 * used further down the page.
 *
 * No 'use client': the animation is pure CSS, so the hero ships no JS of
 * its own.
 */
export function TripHero({ trip }: { trip: TripDetail }) {
  const year = new Date(trip.departureDate).getFullYear();

  return (
    <>
      <section className="relative" aria-label={trip.title}>
        <ImageFrame
          src={trip.heroMedia.kind === 'image' ? trip.heroMedia.src : undefined}
          alt={trip.heroMedia.kind === 'image' ? trip.heroMedia.alt : undefined}
          ratio="cinematic"
          radius="none"
          priority
          className="wws-arrival-media"
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

          {/* Arrival mark — an editorial stamp, not a badge/sticker: no fill,
              no border, no pill radius, just restrained tracked type over
              the photograph. */}
          <div
            className="absolute"
            style={{ top: 'var(--space-6)', left: 'var(--container-gutter)' }}
          >
            <Stack gap={1}>
              <Text
                variant="meta"
                uppercase
                style={{ color: 'var(--wws-white)', opacity: 0.85, letterSpacing: '0.12em' }}
              >
                <StarMark /> WWS Journey
              </Text>
              <Text
                variant="meta"
                uppercase
                style={{ color: 'var(--wws-white)', opacity: 0.65, letterSpacing: '0.12em' }}
              >
                {trip.destination} · {year}
              </Text>
            </Stack>
          </div>

          <div
            className="wws-arrival-text absolute inset-x-0 bottom-0"
            style={{
              background:
                'linear-gradient(to top, color-mix(in srgb, var(--wws-charcoal) 70%, transparent), transparent)',
              padding: 'var(--space-8) var(--container-gutter)',
            }}
          >
            <Container>
              <Stack gap={2} className="max-w-[52ch]">
                <Text
                  variant="label"
                  uppercase
                  style={{ color: 'var(--wws-white)', opacity: 0.85 }}
                >
                  {trip.destination}, {trip.country}
                </Text>
                <Heading level="3xl" as="h1" style={{ color: 'var(--wws-white)' }}>
                  {trip.title}
                </Heading>
                {trip.tagline ? (
                  <Text
                    style={{
                      color: 'var(--wws-white)',
                      opacity: 0.9,
                      fontSize: 'var(--text-lg)',
                      lineHeight: 'var(--leading-normal)',
                    }}
                  >
                    {trip.tagline}
                  </Text>
                ) : null}
              </Stack>
            </Container>
          </div>
        </ImageFrame>
      </section>

      {/* Useful, not immersive: date/duration/price/availability plus the
          honest booking state, directly beneath the photograph rather than
          crowded onto it. */}
      <section aria-label="Trip details" style={{ paddingBlock: 'var(--space-6)' }}>
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
            </Stack>
          </div>
        </Container>
      </section>
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
