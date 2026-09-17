import { Badge, Container, Section, Stack, Text } from '@/components/ui';
import { topStyleSignals } from '@/lib/content/format';
import type { TripDetail } from '@/lib/content/types';

/**
 * TripOverview — THE FEELING.
 *
 * A short emotional overview before logistics, per the brief: the real
 * `overview` copy (never invented emotional claims beyond what the data
 * says) plus the trip's style signals, presented as descriptors — "Adventure",
 * "Social" — never as a personality assessment
 * (docs/UX_INTERACTION_GUIDE.md §7). Skips styles entirely when none are
 * scored, rather than inventing one to avoid an empty row.
 */
export function TripOverview({ trip }: { trip: TripDetail }) {
  const topStyles = topStyleSignals(trip.styleScores, 4);

  return (
    <Section spacing="default">
      <Container width="narrow">
        <Stack gap={4}>
          <Text variant="label" tone="brand" uppercase>
            The feeling
          </Text>
          <Text style={{ fontSize: 'var(--text-xl)', lineHeight: 'var(--leading-normal)' }}>
            {trip.overview}
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
        </Stack>
      </Container>
    </Section>
  );
}
