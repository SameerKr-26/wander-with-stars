import { Container, Section, Stack, Text } from '@/components/ui';
import type { TripDetail } from '@/lib/content/types';

/**
 * TripLogistics — practical trip information, visually secondary to the
 * story above it (small labels, a plain two-column list — no dense
 * specification table). Reads directly from `TripDetail.inclusions` /
 * `.exclusions`; renders nothing when a departure has neither, rather than
 * an empty "Good to know" shell.
 */
export function TripLogistics({ trip }: { trip: TripDetail }) {
  const hasInclusions = trip.inclusions.length > 0;
  const hasExclusions = trip.exclusions.length > 0;

  if (!hasInclusions && !hasExclusions) return null;

  return (
    <Section spacing="default">
      <Container width="narrow">
        <Stack gap={6}>
          <Text variant="label" tone="brand" uppercase>
            Good to know
          </Text>
          <div
            className="grid"
            style={{
              gap: 'var(--space-6)',
              gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))',
            }}
          >
            {hasInclusions ? (
              <Stack gap={2}>
                <Text style={{ fontWeight: 'var(--weight-subheading)' }}>Included</Text>
                <ul className="flex flex-col" style={{ gap: 'var(--space-1)' }}>
                  {trip.inclusions.map((item) => (
                    <Text as="li" key={item} variant="small" tone="secondary">
                      {item}
                    </Text>
                  ))}
                </ul>
              </Stack>
            ) : null}

            {hasExclusions ? (
              <Stack gap={2}>
                <Text style={{ fontWeight: 'var(--weight-subheading)' }}>Not included</Text>
                <ul className="flex flex-col" style={{ gap: 'var(--space-1)' }}>
                  {trip.exclusions.map((item) => (
                    <Text as="li" key={item} variant="small" tone="secondary">
                      {item}
                    </Text>
                  ))}
                </ul>
              </Stack>
            ) : null}
          </div>
        </Stack>
      </Container>
    </Section>
  );
}
