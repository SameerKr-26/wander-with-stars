import { Container, LinkButton, Section, Stack, Text } from '@/components/ui';

/**
 * TripDiscoveryCTA — Section J.
 *
 * A restrained closer that now points at the complete catalogue rather than
 * resetting filters: "See every trip" is real navigation to /trips/all, not
 * an in-place reset-and-scroll (that was the previous behaviour — a product
 * decision now reversed; /trips/all is the honest "show me everything"
 * destination, and this is its most natural entry point). No `onClick`, no
 * client state, so this needs no `'use client'` and ships no JS of its own —
 * rendered by the Server Component page rather than inside
 * TripDiscoveryExperience, which no longer has anything to give it.
 */
export function TripDiscoveryCTA() {
  return (
    <Section spacing="default">
      <Container width="narrow">
        <Stack gap={4} align="center" className="text-center">
          <Text
            as="h2"
            style={{
              fontFamily: 'var(--font-display)',
              fontSize: 'var(--text-3xl)',
              fontWeight: 'var(--weight-heading)',
            }}
          >
            Not sure where to start?
          </Text>
          <Text tone="secondary" style={{ fontSize: 'var(--text-lg)' }}>
            Explore the journeys waiting for you.
          </Text>
          <LinkButton href="/trips/all" variant="secondary">
            See every trip
          </LinkButton>
        </Stack>
      </Container>
    </Section>
  );
}
