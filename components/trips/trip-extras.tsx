import { Container, Section, Stack, Text } from '@/components/ui';
import { formatPrice } from '@/lib/content/format';
import type { TripExtra } from '@/lib/content/types';

/**
 * TripExtras — EXTRAS.
 *
 * Optional add-on costs, explicitly labelled as optional so nothing here
 * reads as part of the trip's base price or its inclusions. Renders
 * nothing when the departure has none.
 */
export function TripExtras({ extras }: { extras: TripExtra[] | undefined }) {
  if (!extras || extras.length === 0) return null;

  return (
    <Section spacing="default">
      <Container width="narrow">
        <Stack gap={4}>
          <Stack gap={1}>
            <Text variant="label" tone="brand" uppercase>
              Optional extras
            </Text>
            <Text variant="small" tone="secondary">
              Not included in the trip price — add these separately if you&apos;d like them.
            </Text>
          </Stack>
          <Stack gap={4}>
            {extras.map((extra, index) => (
              <div
                key={index}
                className="flex flex-wrap items-baseline justify-between"
                style={{ gap: 'var(--space-3)' }}
              >
                <Stack gap={1}>
                  <Text style={{ fontWeight: 'var(--weight-subheading)' }}>{extra.name}</Text>
                  {extra.description ? (
                    <Text variant="small" tone="secondary">
                      {extra.description}
                    </Text>
                  ) : null}
                </Stack>
                {extra.price ? (
                  <Text style={{ fontWeight: 'var(--weight-subheading)' }}>
                    {formatPrice(extra.price)}
                  </Text>
                ) : null}
              </div>
            ))}
          </Stack>
        </Stack>
      </Container>
    </Section>
  );
}
