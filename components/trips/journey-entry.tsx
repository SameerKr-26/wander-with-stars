'use client';

import { useCallback, useState } from 'react';

import { Badge, Card, CardAction, ImageFrame, Text } from '@/components/ui';
import {
  formatAvailability,
  formatDuration,
  formatPrice,
  formatTripDate,
  topStyleSignals,
} from '@/lib/content/format';
import type { TripPreview } from '@/lib/content/types';
import { cn } from '@/lib/utils';

/**
 * JourneyEntry — the one editorial trip composition shared by the featured
 * "Next Escape" section, the alternating "More Journeys" list, and the
 * /trips/all catalogue grid (`emphasis: 'compact'`). One data/presentation
 * implementation rather than three card designs: `emphasis` and `reverse`
 * are the only differences, so there is nothing to keep in sync between
 * them.
 *
 * Information order follows the brief's priority — destination/experience,
 * emotional description, atmosphere/style, when + duration, price, host —
 * so price and dates never dominate the composition. `compact` drops the
 * tagline (storytelling copy the catalogue's scannability goal doesn't need)
 * but keeps everything else, including the same secondary-info hover/focus
 * reveal.
 *
 * Links via CardAction, same as the original TripCard/FeaturedTrip: one
 * focus stop, real navigation, no window.location.
 */

/**
 * Scroll-reveal, gated on prefers-reduced-motion. A callback ref rather than
 * useRef + useEffect: it only ever runs on the client (refs never fire
 * during SSR, so there is no server/client mismatch to guard against), and
 * every `setVisible` call happens from a callback — an IntersectionObserver
 * entry or the ref attaching — never synchronously in an effect body.
 */
function useReveal<T extends HTMLElement>() {
  const [visible, setVisible] = useState(false);

  const ref = useCallback(
    (el: T | null) => {
      if (!el || visible) return;

      if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
        setVisible(true);
        return;
      }

      const observer = new IntersectionObserver(
        (entries) => {
          if (entries.some((entry) => entry.isIntersecting)) {
            setVisible(true);
            observer.disconnect();
          }
        },
        { threshold: 0.2 },
      );
      observer.observe(el);
    },
    [visible],
  );

  return [ref, visible] as const;
}

export interface JourneyEntryProps {
  trip: TripPreview;
  /** Content left / image right. Default is image left / content right. Ignored by `compact`. */
  reverse?: boolean;
  /**
   * `featured` — the single "Next Escape" hero entry.
   * `regular` — the alternating "More Journeys" list, image/content side by
   * side at desktop widths.
   * `compact` — a grid-friendly variant for /trips/all: always a single
   * column (image on top), sized for several per row rather than one
   * full-width entry. Same data, same primary/secondary field split, same
   * secondary-reveal mechanism — a presentation variant of the one card,
   * not a second card design.
   */
  emphasis?: 'featured' | 'regular' | 'compact';
  /** LCP hint — set only on the entry rendered above the fold. */
  priority?: boolean;
}

export function JourneyEntry({
  trip,
  reverse = false,
  emphasis = 'regular',
  priority = false,
}: JourneyEntryProps) {
  const [mediaRef, mediaVisible] = useReveal<HTMLDivElement>();
  const [textRef, textVisible] = useReveal<HTMLDivElement>();
  const featured = emphasis === 'featured';
  const compact = emphasis === 'compact';
  const topStyles = topStyleSignals(trip.styleScores, featured ? 3 : 2);

  const titleSize = featured ? 'var(--text-3xl)' : compact ? 'var(--text-xl)' : 'var(--text-2xl)';
  const taglineSize = featured ? 'var(--text-lg)' : compact ? 'var(--text-sm)' : 'var(--text-base)';
  const priceSize = featured ? 'var(--text-2xl)' : compact ? 'var(--text-lg)' : 'var(--text-xl)';
  const contentPadding = featured
    ? 'var(--space-8)'
    : compact
      ? 'var(--space-5)'
      : 'var(--space-6)';

  return (
    <Card tone="surface" interactive flush>
      <CardAction href={`/trips/${trip.slug}`} label={`View ${trip.title}`} />
      <div
        className={
          compact
            ? 'flex flex-col'
            : cn('grid lg:grid-cols-2', reverse && 'wws-journey-grid--reverse')
        }
      >
        <div
          ref={mediaRef}
          className={cn(
            'wws-journey-media wws-reveal-media',
            mediaVisible && 'wws-reveal-media--visible',
          )}
        >
          {/* Root cause of the card's previous "large blank area below the
              content": CSS Grid's default `align-items: stretch` sizes both
              grid cells to the row's height, and the row's height was always
              at least the image's own aspect-ratio height — so a short,
              compact text column got stretched (and, with the old
              `justify-center`, visibly centred inside) that taller box,
              leaving blank space around it. `lg:absolute lg:inset-0` removes
              the image from the grid's height calculation entirely at
              desktop widths (an absolutely positioned box contributes no
              intrinsic size to its container): the row now sizes to the
              text column's own compact content, and the image simply fills
              whatever height results, cropping via ImageFrame's existing
              object-fit: cover — showing more of the photo as the card
              grows on hover/focus, less at rest. Below `lg` the grid falls
              back to one implicit column per child (mobile already stacks
              image-then-content, each in its own row), so the image keeps
              its normal, static, aspect-ratio-driven height there — this
              only changes desktop's shared-row behaviour. `compact` never
              shares a row with the text column in the first place (it's a
              single stacked column at every width, for the /trips/all
              grid), so it keeps the plain static/aspect-ratio sizing. */}
          <ImageFrame
            src={trip.heroMedia.kind === 'image' ? trip.heroMedia.src : undefined}
            alt={trip.heroMedia.kind === 'image' ? trip.heroMedia.alt : undefined}
            ratio={featured ? 'wide' : 'card'}
            zoom
            radius="none"
            priority={priority}
            className={cn('h-full', !compact && 'lg:absolute lg:inset-0')}
          >
            {trip.heroMedia.kind !== 'image' ? <PlaceholderMedia /> : null}
            {featured ? (
              <Badge
                tone="accent"
                className="absolute"
                style={{ top: 'var(--space-4)', left: 'var(--space-4)' }}
              >
                Featured departure
              </Badge>
            ) : null}
          </ImageFrame>
        </div>

        <div
          ref={textRef}
          className={cn(
            'wws-journey-content wws-reveal-text flex flex-col justify-start',
            textVisible && 'wws-reveal-text--visible',
          )}
          style={{
            padding: contentPadding,
            gap: 'var(--space-3)',
          }}
        >
          <Text variant="label" tone="brand" uppercase>
            {trip.destination}, {trip.country}
          </Text>

          <Text
            as="h2"
            style={{
              fontFamily: 'var(--font-display)',
              fontSize: titleSize,
              fontWeight: 'var(--weight-heading)',
              lineHeight: 'var(--leading-snug)',
            }}
          >
            {trip.title}
          </Text>

          {trip.tagline && !compact ? (
            <Text
              tone="secondary"
              style={{
                fontSize: taglineSize,
                lineHeight: 'var(--leading-normal)',
              }}
            >
              {trip.tagline}
            </Text>
          ) : null}

          <Text variant="small" tone="secondary">
            {formatTripDate(trip.departureDate)} · {formatDuration(trip.durationNights)} ·{' '}
            {formatAvailability(trip.availability.status, trip.availability.spotsLeft)}
          </Text>

          <Text
            style={{
              fontSize: priceSize,
              fontWeight: 'var(--weight-heading)',
            }}
          >
            {formatPrice(trip.price)}{' '}
            <span
              className="text-text-muted"
              style={{ fontSize: 'var(--text-sm)', fontWeight: 'var(--weight-body)' }}
            >
              per person
            </span>
          </Text>

          {/* Secondary — style, host, the closing link. Collapsed to zero
              height at rest and revealed on hover/focus via the shared
              .wws-reveal / .wws-reveal-content mechanism (components/ui/ui.css
              — also used by components/marketing/trip-card.tsx, so both
              surfaces share one implementation) rather than always taking up
              space or always being shown: the resting card's height is its
              primary content's natural height, never a reserved, pre-expanded
              one. Always present in the DOM regardless of visual state, so it
              stays reachable to assistive technology and is shown plainly
              (never hidden behind an unreachable hover) on touch and narrow
              screens. */}
          <div className="wws-reveal">
            <div
              className="wws-reveal-content flex flex-col"
              style={{ gap: 'var(--space-3)', paddingTop: 'var(--space-1)' }}
            >
              {topStyles.length > 0 ? (
                <div className="flex flex-wrap" style={{ gap: 'var(--space-2)' }}>
                  {topStyles.map(({ signal }) => (
                    <Badge key={signal} tone="outline">
                      {signal[0]?.toUpperCase()}
                      {signal.slice(1)}
                    </Badge>
                  ))}
                </div>
              ) : null}

              <Text variant="small" tone="secondary">
                Hosted by {trip.host.name}
                {trip.travellerCount !== undefined
                  ? ` · ${trip.travellerCount} travellers joining`
                  : ''}
              </Text>

              <span
                aria-hidden="true"
                className="inline-flex items-center"
                style={{
                  color: 'var(--color-text-brand)',
                  fontWeight: 'var(--weight-label)',
                  fontSize: 'var(--text-sm)',
                  gap: 'var(--space-1)',
                }}
              >
                Explore journey <span className="wws-journey-link__arrow">→</span>
              </span>
            </div>
          </div>
        </div>
      </div>
    </Card>
  );
}

/**
 * Development-only stand-in for a missing photo. Never mistaken for real
 * photography: a plain token gradient with a visible label, not an image.
 */
function PlaceholderMedia() {
  return (
    <div
      className="absolute inset-0 flex items-end"
      style={{
        background: 'linear-gradient(135deg, var(--wws-teal-core), var(--wws-teal-deep) 80%)',
        padding: 'var(--space-4)',
      }}
    >
      <span
        style={{
          color: 'var(--wws-white)',
          fontSize: 'var(--text-xs)',
          fontWeight: 'var(--weight-label)',
          letterSpacing: 'var(--tracking-label)',
          textTransform: 'uppercase',
          opacity: 0.85,
        }}
      >
        Photography pending
      </span>
    </div>
  );
}
