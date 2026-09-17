'use client';

import { Container, Heading, Section, Stack, Text } from '@/components/ui';
import type { TripItineraryDay } from '@/lib/content/types';
import { useReveal } from '@/lib/hooks/use-reveal';
import { cn } from '@/lib/utils';

/**
 * TripItinerary — THE JOURNEY.
 *
 * A day-by-day list plus a restrained route-line motif that draws down the
 * left edge as the section enters the viewport (trip-detail.css's
 * `.wws-route*` classes, Phase 3.5 §5D) — revealed once via the shared
 * lib/hooks/use-reveal.ts, the same mechanism journey-entry.tsx uses, not a
 * continuous animation.
 *
 * Reads `TripItineraryDay[]` from lib/content/types.ts — the deliberately
 * flattened stand-in for the real Trip → Departure → Itinerary → Activities
 * hierarchy (docs/DATABASE.md), not a structure hardcoded in this
 * component. Renders nothing (not even the heading) when the trip has no
 * itinerary content — an honest absence, not an empty section shell.
 */
export function TripItinerary({ days }: { days: TripItineraryDay[] }) {
  const [routeRef, visible] = useReveal<HTMLDivElement>();

  if (days.length === 0) return null;

  return (
    <Section spacing="default" style={{ background: 'var(--color-background-secondary)' }}>
      <Container>
        <Stack gap={6}>
          <Stack gap={2}>
            <Text variant="label" tone="brand" uppercase>
              The journey
            </Text>
            <Text tone="secondary" variant="small">
              Sample itinerary — illustrative only. The confirmed day-by-day plan for this departure
              is shared closer to travel.
            </Text>
          </Stack>

          <div
            ref={routeRef}
            className={cn('wws-route flex flex-col', visible && 'wws-route--visible')}
          >
            {days.map((day, index) => (
              <div key={day.day} className="flex" style={{ gap: 'var(--space-5)' }}>
                <div
                  aria-hidden="true"
                  className="flex shrink-0 flex-col items-center"
                  style={{ width: 'var(--space-4)' }}
                >
                  <span
                    className="wws-route-marker shrink-0"
                    style={{
                      width: 'var(--space-2)',
                      height: 'var(--space-2)',
                      borderRadius: 'var(--radius-pill)',
                      background: 'var(--wws-teal-deep)',
                    }}
                  />
                  {index < days.length - 1 ? (
                    <span
                      className="wws-route-line"
                      style={{
                        width: '1px',
                        flex: 1,
                        marginTop: 'var(--space-1)',
                        background: 'var(--color-border-brand)',
                      }}
                    />
                  ) : null}
                </div>
                <TripDay day={day} isLast={index === days.length - 1} />
              </div>
            ))}
          </div>
        </Stack>
      </Container>
    </Section>
  );
}

function TripDay({ day, isLast }: { day: TripItineraryDay; isLast: boolean }) {
  return (
    <div style={{ paddingBottom: isLast ? 0 : 'var(--space-8)' }}>
      <Stack gap={1}>
        <Text variant="label" tone="brand" uppercase style={{ fontFamily: 'var(--font-display)' }}>
          Day {String(day.day).padStart(2, '0')}
        </Text>
        <Heading level="xl" as="h3">
          {day.title}
        </Heading>
        <Text tone="secondary">{day.summary}</Text>
      </Stack>
    </div>
  );
}
