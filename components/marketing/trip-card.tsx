import { Badge, Card, CardAction, ImageFrame, Text } from '@/components/ui';
import {
  formatAvailability,
  formatDuration,
  formatPrice,
  formatTripDate,
  topStyleSignals,
} from '@/lib/content/format';
import type { TripPreview } from '@/lib/content/types';

/**
 * TripCard — the production card for a trip departure.
 *
 * Primary information (destination, title, date, duration, price,
 * availability) is always visible, on every viewport —
 * docs/UX_INTERACTION_GUIDE.md §3. Secondary information (host, traveller
 * count, trip style) is collapsed to zero height at rest and reveals on
 * hover/focus on pointer-capable, ≥768px screens via the shared
 * `.wws-reveal` / `.wws-reveal-content` mechanism (components/ui/ui.css —
 * the same one components/trips/journey-entry.tsx uses, so both surfaces
 * share one trip-card interaction rather than two that could drift), and is
 * otherwise shown plainly — never hidden on touch. Collapsed by height, not
 * merely opacity, so a resting card never carries a blank area reserved for
 * content it isn't currently showing (Phase 3.4 "trip card consistency" fix
 * — this used to be opacity-only, which hid the text but still reserved its
 * full height).
 *
 * Links to `/trips/${trip.slug}` via `CardAction`, which stretches over the
 * whole card so it is one focus stop, keyboard-activatable, and announced
 * correctly — not a div with a click handler. (Phase 3.3 update: this used to
 * be a non-navigating, tab-focusable card because no detail route existed;
 * now that /trips/[slug] is real, it's a real link.)
 */
export function TripCard({ trip }: { trip: TripPreview }) {
  const topStyles = topStyleSignals(trip.styleScores, 2);

  return (
    <Card tone="surface" interactive flush>
      <CardAction href={`/trips/${trip.slug}`} label={`View ${trip.title}`} />
      <ImageFrame
        src={trip.heroMedia.kind === 'image' ? trip.heroMedia.src : undefined}
        alt={trip.heroMedia.kind === 'image' ? trip.heroMedia.alt : undefined}
        ratio="card"
        zoom
        radius="none"
      >
        {trip.heroMedia.kind !== 'image' ? <PlaceholderMedia /> : null}
        <Badge
          tone={trip.availability.status === 'almost-full' ? 'accent' : 'brand'}
          className="absolute"
          style={{ top: 'var(--space-3)', left: 'var(--space-3)' }}
        >
          {formatAvailability(trip.availability.status, trip.availability.spotsLeft)}
        </Badge>
      </ImageFrame>

      <div className="flex flex-col" style={{ padding: 'var(--space-5)', gap: 'var(--space-3)' }}>
        <Text variant="label" tone="brand" uppercase>
          {trip.destination}
        </Text>

        <Text
          as="h3"
          style={{ fontSize: 'var(--text-xl)', fontWeight: 'var(--weight-subheading)' }}
        >
          {trip.title}
        </Text>

        <div className="flex flex-wrap items-baseline" style={{ gap: 'var(--space-3)' }}>
          <Text variant="small" tone="secondary">
            {formatTripDate(trip.departureDate)} · {formatDuration(trip.durationNights)}
          </Text>
        </div>

        <Text style={{ fontSize: 'var(--text-lg)', fontWeight: 'var(--weight-heading)' }}>
          {formatPrice(trip.price)}{' '}
          <span
            className="text-text-muted"
            style={{ fontSize: 'var(--text-xs)', fontWeight: 'var(--weight-body)' }}
          >
            per person
          </span>
        </Text>

        {/* Secondary — host, travellers, style. Always present in the DOM,
            collapsed to zero height and revealed only where a pointer +
            hover (or keyboard focus) exist — see the shared
            .wws-reveal / .wws-reveal-content note above; shown plainly
            otherwise. The divider (border-t) lives on the inner content
            element so it fades in with the text, rather than sitting as a
            stray line above a collapsed, empty area at rest. */}
        <div className="wws-reveal" style={{ marginTop: 'var(--space-1)' }}>
          <div
            className="wws-reveal-content border-border-subtle flex flex-col border-t"
            style={{ paddingTop: 'var(--space-3)', gap: 'var(--space-2)' }}
          >
            <Text variant="small" tone="secondary">
              Hosted by {trip.host.name}
              {trip.travellerCount !== undefined
                ? ` · ${trip.travellerCount} travellers joining`
                : ''}
            </Text>
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
        background: 'linear-gradient(135deg, var(--wws-teal-core), var(--wws-teal-deep) 75%)',
        padding: 'var(--space-3)',
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
