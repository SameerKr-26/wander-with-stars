import { Stack, Text } from '@/components/ui';
import type { TripMeetingPoint } from '@/lib/content/types';

/**
 * TripMeeting — MEETING / PICKUP.
 *
 * Named `TripMeeting` rather than `TripMeetingPoint` to avoid colliding
 * with the type of the same name — there is exactly one meeting point per
 * departure, so (unlike accommodation/transport) this takes a single
 * object, not an array. Renders nothing when the departure has none yet.
 */
export function TripMeeting({ point }: { point: TripMeetingPoint | undefined }) {
  if (!point) return null;

  return (
    <Stack gap={1}>
      <Text style={{ fontWeight: 'var(--weight-subheading)' }}>Meeting point</Text>
      <Text variant="small">{point.location}</Text>
      {point.time ? (
        <Text variant="small" tone="secondary">
          {point.time}
        </Text>
      ) : null}
      {point.instructions ? (
        <Text variant="small" tone="secondary">
          {point.instructions}
        </Text>
      ) : null}
    </Stack>
  );
}
