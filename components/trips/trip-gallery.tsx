import { Container, ImageFrame, Section, Stack, Text } from '@/components/ui';
import type { TripMedia as TripMediaItem } from '@/lib/content/types';

/**
 * TripGallery — the reusable media presentation structure for
 * Trip → Media (docs/DATABASE.md's hierarchy). Named `TripGallery` rather
 * than `TripMedia` to avoid colliding with the `TripMedia` type it renders.
 *
 * Every tile goes through the same honest placeholder treatment as the hero
 * and cards elsewhere — no invented photography, no stock imagery standing
 * in for real WWS media. Renders nothing when the gallery is empty.
 */
export function TripGallery({ gallery }: { gallery: TripMediaItem[] }) {
  if (gallery.length === 0) return null;

  return (
    <Section spacing="default">
      <Container>
        <Stack gap={4}>
          <Text variant="label" tone="brand" uppercase>
            Gallery
          </Text>
          <div
            className="grid"
            style={{
              gap: 'var(--space-4)',
              gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))',
            }}
          >
            {gallery.map((media, index) => (
              <ImageFrame
                key={index}
                src={media.kind === 'image' ? media.src : undefined}
                alt={media.kind === 'image' ? media.alt : ''}
                ratio="card"
              >
                {media.kind !== 'image' ? <PlaceholderTile /> : null}
              </ImageFrame>
            ))}
          </div>
        </Stack>
      </Container>
    </Section>
  );
}

function PlaceholderTile() {
  return (
    <div
      className="absolute inset-0 flex items-end"
      style={{
        background: 'linear-gradient(135deg, var(--wws-teal-core), var(--wws-teal-deep) 80%)',
        padding: 'var(--space-3)',
      }}
    >
      <span
        style={{
          color: 'var(--wws-white)',
          fontSize: 'var(--text-xs)',
          fontWeight: 'var(--weight-label)',
          letterSpacing: 'var(--tracking-label)',
          textTransform: 'uppercase',
          opacity: 0.85,
        }}
      >
        Photography pending
      </span>
    </div>
  );
}
