import { Container, Section, Stack, Text } from '@/components/ui';
import type { TripDetail } from '@/lib/content/types';

import { TripAccommodations } from './trip-accommodation';
import { TripImportantNotes } from './trip-important-notes';
import { TripMeeting } from './trip-meeting-point';
import { TripPackingList } from './trip-packing-list';
import { TripTransports } from './trip-transport';

/**
 * TripEssentials — the practical-reference beat between the journey story
 * and the people/commercial sections: accommodation, transport, meeting
 * point and packing list side by side, important notes below.
 *
 * Deliberately ONE section composing five independently-isolated,
 * independently-skippable responsibilities, rather than five separate
 * full-width sections each with their own heading and padding — for a
 * departure with a handful of short facts, five consecutive sections would
 * read as exactly the "section → card → section → card" repetition Phase
 * 3.5B's brief asks to avoid. Each sub-component still renders (or omits)
 * itself independently; this file only arranges them, it doesn't decide
 * what any of them shows.
 *
 * Skips itself entirely when the departure has none of this content yet —
 * never an empty "Before you go" shell.
 */
export function TripEssentials({ trip }: { trip: TripDetail }) {
  const hasGrid =
    (trip.accommodation && trip.accommodation.length > 0) ||
    (trip.transport && trip.transport.length > 0) ||
    trip.meetingPoint !== undefined ||
    (trip.thingsToCarry && trip.thingsToCarry.length > 0);
  const hasNotes = trip.importantNotes && trip.importantNotes.length > 0;

  if (!hasGrid && !hasNotes) return null;

  return (
    <Section spacing="default" style={{ background: 'var(--color-background-secondary)' }}>
      <Container width="narrow">
        <Stack gap={8}>
          <Text variant="label" tone="brand" uppercase>
            Before you go
          </Text>

          {hasGrid ? (
            <div
              className="grid"
              style={{
                gap: 'var(--space-8)',
                gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))',
              }}
            >
              <TripAccommodations items={trip.accommodation} />
              <TripTransports items={trip.transport} />
              <TripMeeting point={trip.meetingPoint} />
              <TripPackingList items={trip.thingsToCarry} />
            </div>
          ) : null}

          <TripImportantNotes notes={trip.importantNotes} />
        </Stack>
      </Container>
    </Section>
  );
}
