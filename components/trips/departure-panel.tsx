'use client';

import { useId, useState } from 'react';

import { Button, Container, GlassPanel, LinkButton, Radio, Stack, Text } from '@/components/ui';
import { getDepartureOptions } from '@/lib/content/departures';
import {
  formatAvailability,
  formatDuration,
  formatPrice,
  formatTripDate,
} from '@/lib/content/format';
import type { TripDetail } from '@/lib/content/types';

/**
 * TripDeparturePanel — Phase 4.4C.
 *
 * Replaces TripHero's old static commercial-metadata block and
 * TripBookingCTA's static copy with one client component that owns which
 * departure is selected, so the metadata and the booking CTA below it
 * always agree on the SAME departure — the one a future booking would
 * attach to (`bookings.trip_departure_id`, Phase 4.4's booking domain).
 *
 * A trip with only one public departure renders exactly as the old
 * TripHero/TripBookingCTA pair did: no selector, no extra client-only
 * affordance where nothing needs choosing. A trip with more than one shows
 * every option — never hidden, never collapsed into a single number — as
 * an accessible radio group (`components/ui/field.tsx`'s existing `Radio`,
 * not a bespoke control), defaulting to the earliest/soonest one, matching
 * the product's existing default (`selectPresentableDeparture`).
 *
 * Deliberately no URL-level departure identity (no `?departure=`/route
 * segment): nothing downstream reads the selection across a page
 * load/reload yet (no booking flow exists to hand it to), so a query
 * param would be state with no consumer — plain client `useState` is
 * enough today, and this comment is the place to revisit that decision
 * once a real booking flow needs the selection to survive navigation.
 *
 * Still no checkout, no booking form — "Booking opens soon" stays exactly
 * as honest as it always was, just now naming the departure it refers to.
 */
export function TripDeparturePanel({ trip }: { trip: TripDetail }) {
  const options = getDepartureOptions(trip);
  const [selectedId, setSelectedId] = useState(options[0]!.id);
  const selected = options.find((option) => option.id === selectedId) ?? options[0]!;
  const groupName = useId();

  return (
    <section aria-label="Trip details" style={{ paddingBlock: 'var(--space-6)' }}>
      <Container>
        <div className="flex flex-col" style={{ gap: 'var(--space-6)' }}>
          {options.length > 1 ? (
            <fieldset style={{ border: 'none', padding: 0, margin: 0 }}>
              <Text
                as="legend"
                variant="meta"
                tone="muted"
                uppercase
                style={{ padding: 0, marginBottom: 'var(--space-3)' }}
              >
                Choose a departure — {options.length} available
              </Text>
              <div className="flex flex-wrap" style={{ gap: 'var(--space-4)' }}>
                {options.map((option) => (
                  <div
                    key={option.id}
                    style={{
                      padding: 'var(--space-3) var(--space-4)',
                      borderRadius: 'var(--radius-card)',
                      border: `1px solid ${
                        option.id === selectedId
                          ? 'var(--color-border-brand)'
                          : 'var(--color-border-subtle)'
                      }`,
                      background:
                        option.id === selectedId ? 'var(--color-surface-sunk)' : 'transparent',
                    }}
                  >
                    <Radio
                      name={groupName}
                      value={option.id}
                      checked={option.id === selectedId}
                      onChange={() => setSelectedId(option.id)}
                      label={formatTripDate(option.departureDate)}
                      description={`${formatPrice(option.price)} · ${formatAvailability(
                        option.availability.status,
                        option.availability.spotsLeft,
                      )}`}
                    />
                  </div>
                ))}
              </div>
            </fieldset>
          ) : null}

          <div
            className="flex flex-wrap items-start justify-between"
            style={{ gap: 'var(--space-6)' }}
          >
            <div className="flex flex-wrap" style={{ gap: 'var(--space-6)' }}>
              <Metadata label="Departs" value={formatTripDate(selected.departureDate)} />
              <Metadata label="Duration" value={formatDuration(trip.durationNights)} />
              <Metadata label="Price" value={`${formatPrice(selected.price)} / person`} />
              <Metadata
                label="Availability"
                value={formatAvailability(
                  selected.availability.status,
                  selected.availability.spotsLeft,
                )}
              />
            </div>
          </div>

          <GlassPanel
            variant="tinted"
            radius="panel"
            className="flex flex-wrap items-center justify-between"
            style={{ gap: 'var(--space-4)', padding: 'var(--space-6)' }}
          >
            <Stack gap={1}>
              <Text style={{ fontWeight: 'var(--weight-subheading)', fontSize: 'var(--text-lg)' }}>
                Ready to go?
              </Text>
              <Text variant="small" tone="secondary">
                {`Not yet bookable for the ${formatTripDate(
                  selected.departureDate,
                )} departure — see docs/ROADMAP.md Phase 6.`}
              </Text>
            </Stack>
            <div className="flex flex-wrap items-center" style={{ gap: 'var(--space-3)' }}>
              <Button disabled title="Booking opens once the payments milestone ships">
                Booking opens soon
              </Button>
              <LinkButton href="/trips" variant="secondary">
                ← All trips
              </LinkButton>
            </div>
          </GlassPanel>
        </div>
      </Container>
    </section>
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
