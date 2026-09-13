import { Container, LinkButton, Section, Stack, Text } from '@/components/ui';

/**
 * Final CTA — 12.
 *
 * Points at /trips, the real trip listing (Phase 3.3, Part C). Calm phrasing,
 * no "Buy Now" language, per this milestone's brief.
 */
export function FinalCTA() {
  return (
    <Section spacing="loose">
      <Container width="narrow">
        <Stack gap={5} align="center" className="text-center">
          <Text
            as="h2"
            style={{
              fontFamily: 'var(--font-display)',
              fontSize: 'var(--text-4xl)',
              fontWeight: 'var(--weight-display)',
              letterSpacing: 'var(--tracking-display)',
            }}
          >
            Ready when you are.
          </Text>
          <Text tone="secondary" style={{ fontSize: 'var(--text-lg)' }}>
            Explore the departures open right now, or tell us what you&apos;re looking for.
          </Text>
          <LinkButton href="/trips" variant="primary" size="lg">
            Explore Trips
          </LinkButton>
        </Stack>
      </Container>
    </Section>
  );
}
