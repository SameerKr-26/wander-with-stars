import type { Metadata } from 'next';

import { Container, LinkButton, Section, Stack, Text } from '@/components/ui';
import { PageHeader } from '@/components/marketing/page-header';
import { StarMark } from '@/components/marketing/section-heading';

/**
 * /about — product philosophy, not company history.
 *
 * Everything here traces to docs/PRODUCT_REQUIREMENTS.md. No founding date,
 * team size, location or headcount is stated — none of that is documented
 * anywhere in this project, and inventing it would be exactly the kind of
 * fabrication CLAUDE.md forbids. This describes what WWS is building, not
 * who built it or when.
 */

export const metadata: Metadata = {
  title: 'About — Wander With Stars',
  description: 'A social travel platform for curated, creator-led group adventures.',
};

const PILLARS = [
  {
    title: 'Discover',
    body: 'Find a trip by destination, style, or the people you want to travel with.',
  },
  { title: 'Connect', body: 'Meet your group before you fly — not on arrival.' },
  {
    title: 'Experience',
    body: 'Travel with a named host and a group that already knows each other a little.',
  },
  {
    title: 'Remember',
    body: 'The trip becomes part of your travel history, not just a booking record.',
  },
] as const;

export default function AboutPage() {
  return (
    <>
      <PageHeader
        eyebrow="About"
        title="Travel with people, not just packages"
        description="Wander With Stars is a social travel platform: curated group trips built around who you'll travel with, not just where you're going."
      />

      <Section spacing="default">
        <Container width="narrow">
          <Stack gap={4}>
            <Text
              tone="secondary"
              style={{ fontSize: 'var(--text-lg)', lineHeight: 'var(--leading-normal)' }}
            >
              Most travel platforms sell you a destination. WWS starts from a different question:
              who are you actually going with? Every departure is planned for a specific group and a
              fixed date, with a named host, and a community that exists before the trip starts —
              not just after you land.
            </Text>
          </Stack>
        </Container>
      </Section>

      <Section spacing="default" style={{ background: 'var(--color-background-secondary)' }}>
        <Container>
          <div
            className="grid"
            style={{
              gap: 'var(--space-8)',
              gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
            }}
          >
            {PILLARS.map((pillar) => (
              <Stack key={pillar.title} gap={2}>
                <StarMark />
                <Text style={{ fontWeight: 'var(--weight-subheading)' }}>{pillar.title}</Text>
                <Text variant="small" tone="secondary">
                  {pillar.body}
                </Text>
              </Stack>
            ))}
          </div>
        </Container>
      </Section>

      <Section spacing="default">
        <Container>
          <Stack gap={4} align="center" className="text-center">
            <Text
              style={{
                fontSize: 'var(--text-2xl)',
                fontWeight: 'var(--weight-heading)',
                fontFamily: 'var(--font-display)',
              }}
            >
              See what&apos;s open right now
            </Text>
            <LinkButton href="/trips" variant="primary">
              Explore Trips
            </LinkButton>
          </Stack>
        </Container>
      </Section>
    </>
  );
}
