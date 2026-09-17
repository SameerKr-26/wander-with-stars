import { Container, Heading, Section, Stack, Text } from '@/components/ui';
import type { TripItineraryDay } from '@/lib/content/types';

/**
 * TripFirst24Hours — the emotional-rhythm moment for arrival day.
 *
 * Phase 3.5 §9 asks for an arrive → meet → explore → eat → rest breakdown,
 * but that needs richer source data (timed sub-activities) than
 * `TripItineraryDay` carries today — a title and one summary paragraph
 * (lib/content/types.ts). Rather than invent times or events to fill that
 * shape out, this renders day one's real content in a distinct, larger
 * editorial treatment than the plain itinerary list further down the page.
 * Once activity-level data exists, a moment-by-moment breakdown belongs
 * here without changing anything else on the page. Renders nothing when
 * there is no first day to show — never a placeholder invented to fill the
 * section out.
 */
export function TripFirst24Hours({ day }: { day: TripItineraryDay | undefined }) {
  if (!day) return null;

  return (
    <Section spacing="default">
      <Container width="narrow">
        <Stack gap={3}>
          <Text variant="label" tone="brand" uppercase>
            Your first 24 hours
          </Text>
          <Heading level="2xl" as="h2">
            {day.title}
          </Heading>
          <Text
            tone="secondary"
            style={{ fontSize: 'var(--text-lg)', lineHeight: 'var(--leading-normal)' }}
          >
            {day.summary}
          </Text>
        </Stack>
      </Container>
    </Section>
  );
}
