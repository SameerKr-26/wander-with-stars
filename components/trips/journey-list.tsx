import { JourneyEntry } from './journey-entry';
import type { TripPreview } from '@/lib/content/types';

/**
 * JourneyList — Section 4, "More Journeys".
 *
 * An alternating editorial rhythm (image left / content right, then content
 * left / image right, ...) built from the shared JourneyEntry composition —
 * explicitly not a `[card] [card] [card]` grid. `startIndex` lets a second
 * list (the "More journeys" continuation, once results are large enough)
 * carry the alternation on from where the previous list left off, so two
 * lists never both open on the same side.
 */
export function JourneyList({
  trips,
  heading,
  startIndex = 0,
}: {
  trips: TripPreview[];
  heading?: string | undefined;
  startIndex?: number;
}) {
  if (trips.length === 0) return null;

  return (
    <div className="flex flex-col" style={{ gap: 'var(--space-8)' }}>
      {heading ? (
        <h2
          style={{
            fontFamily: 'var(--font-display)',
            fontSize: 'var(--text-xl)',
            fontWeight: 'var(--weight-subheading)',
          }}
        >
          {heading}
        </h2>
      ) : null}
      <div className="flex flex-col" style={{ gap: 'var(--space-10)' }}>
        {trips.map((trip, index) => (
          <JourneyEntry key={trip.id} trip={trip} reverse={(startIndex + index) % 2 === 1} />
        ))}
      </div>
    </div>
  );
}
