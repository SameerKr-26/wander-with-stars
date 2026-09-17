import { Stack, Text } from '@/components/ui';
import type { TripAccommodation } from '@/lib/content/types';

/**
 * TripAccommodations — one leg of ACCOMMODATION.
 *
 * Named plural to avoid colliding with the `TripAccommodation` type it
 * renders (same reasoning as components/trips/trip-gallery.tsx's
 * `TripGallery` / `TripMedia`). Renders only the fields a given leg
 * actually has — `name`, `type`, `nights` and `description` are all
 * optional on the type, and a real record may supply any subset. No
 * per-item media yet: no current fixture (or realistic near-term WWS
 * content) supplies it, and rendering it honestly needs the same
 * placeholder treatment trip-gallery.tsx already owns — worth wiring in
 * once a real accommodation photo exists, not before.
 */
export function TripAccommodations({ items }: { items: TripAccommodation[] | undefined }) {
  if (!items || items.length === 0) return null;

  return (
    <Stack gap={3}>
      <Text style={{ fontWeight: 'var(--weight-subheading)' }}>Accommodation</Text>
      <Stack gap={3}>
        {items.map((item, index) => {
          const heading = [item.name, item.type].filter(Boolean).join(' · ');
          const nights =
            item.nights !== undefined
              ? `${item.nights} ${item.nights === 1 ? 'night' : 'nights'}`
              : null;

          return (
            <Stack gap={1} key={index}>
              {heading || nights ? (
                <Text variant="small" style={{ fontWeight: 'var(--weight-label)' }}>
                  {[heading, nights].filter(Boolean).join(' · ')}
                </Text>
              ) : null}
              {item.description ? (
                <Text variant="small" tone="secondary">
                  {item.description}
                </Text>
              ) : null}
            </Stack>
          );
        })}
      </Stack>
    </Stack>
  );
}
