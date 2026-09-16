import { Container, Heading, Section, Stack, Text } from '@/components/ui';

/**
 * TripDiscoveryHero — compact editorial hero for /trips.
 *
 * Deliberately shorter than the homepage hero (docs/WWS_VISUAL_IDENTITY.md's
 * cinematic treatment belongs to the homepage's first impression; a listing
 * page's job is to get out of the way of the content). No atmosphere field,
 * no glass panel — just the statement, sized with `spacing="tight"` and no
 * forced min-height, so discovery controls sit close beneath it.
 *
 * Static and server-rendered: nothing here is interactive.
 */
export function TripDiscoveryHero() {
  return (
    <Section spacing="tight">
      <Container>
        <Stack gap={3} className="max-w-[36ch]">
          <Heading level="4xl" as="h1" style={{ textWrap: 'balance' }}>
            Find your next
            <br />
            adventure.
          </Heading>
          <Text variant="lead" tone="secondary">
            Discover trips built around experiences, people and moments.
          </Text>
        </Stack>
      </Container>
    </Section>
  );
}
