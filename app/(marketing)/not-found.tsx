import { Container, Heading, LinkButton, Section, Stack, Text } from '@/components/ui';

/**
 * 404 for the public marketing group.
 *
 * A destination this doesn't recognise — most notably an unknown
 * `/trips/[slug]` — reaches this via `notFound()` rather than a fabricated
 * "coming soon" page. Styled with the design system rather than left as
 * Next's bare default, so a wrong link doesn't look like the site is broken.
 */
export default function NotFound() {
  return (
    <Section spacing="loose">
      <Container width="narrow">
        <Stack gap={4} align="center" className="text-center">
          <Text variant="label" tone="brand" uppercase>
            404
          </Text>
          <Heading level="3xl" as="h1">
            This page doesn&apos;t exist
          </Heading>
          <Text tone="secondary">
            The link may be out of date, or the trip you were looking for isn&apos;t open right now.
          </Text>
          <LinkButton href="/trips" variant="primary">
            Explore Trips
          </LinkButton>
        </Stack>
      </Container>
    </Section>
  );
}
