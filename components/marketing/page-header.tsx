import type { ReactNode } from 'react';

import { Container, Heading, Section, Stack, Text } from '@/components/ui';

/**
 * Consistent header for the minimal public pages (/trips, /about, /stories,
 * /creators, /contact) — Part D's "consistent page header" requirement.
 *
 * Deliberately smaller than the homepage Hero (`level="4xl"` vs `"hero"`):
 * these are utility/content pages, not the cinematic entry point, and using
 * the same oversized treatment everywhere would flatten the homepage's own
 * impact rather than create rhythm.
 */
export function PageHeader({
  eyebrow,
  title,
  description,
}: {
  eyebrow?: string;
  /** A plain string, or a heading with one accent word (e.g. via `Highlight`). */
  title: ReactNode;
  description?: string;
}) {
  return (
    <Section spacing="tight">
      <Container>
        <Stack gap={3} className="max-w-[62ch]">
          {eyebrow ? (
            <Text variant="label" tone="brand" uppercase as="p">
              {eyebrow}
            </Text>
          ) : null}
          <Heading level="4xl" as="h1">
            {title}
          </Heading>
          {description ? (
            <Text variant="lead" tone="secondary">
              {description}
            </Text>
          ) : null}
        </Stack>
      </Container>
    </Section>
  );
}
