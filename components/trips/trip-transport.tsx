import { Stack, Text } from '@/components/ui';
import type { TripTransport } from '@/lib/content/types';

/**
 * TripTransports — TRANSPORT.
 *
 * Named plural to avoid colliding with the `TripTransport` type (each item
 * is one leg — a flight, a transfer, a train). `mode` is required per leg;
 * `description` is shown only when the record actually has one.
 */
export function TripTransports({ items }: { items: TripTransport[] | undefined }) {
  if (!items || items.length === 0) return null;

  return (
    <Stack gap={3}>
      <Text style={{ fontWeight: 'var(--weight-subheading)' }}>Transport</Text>
      <Stack gap={2}>
        {items.map((item, index) => (
          <Stack gap={1} key={index}>
            <Text variant="small" uppercase style={{ fontWeight: 'var(--weight-label)' }}>
              {item.mode}
            </Text>
            {item.description ? (
              <Text variant="small" tone="secondary">
                {item.description}
              </Text>
            ) : null}
          </Stack>
        ))}
      </Stack>
    </Stack>
  );
}
