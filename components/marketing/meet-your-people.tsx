import { Container, Heading, Section, Stack, Text } from '@/components/ui';
import { getCommunitySnapshot } from '@/lib/content/queries';
import type { CommunitySnapshot, ContentState } from '@/lib/content/types';

import { StarMark } from './section-heading';

/**
 * Meet your people — 06.
 *
 * docs/PRODUCT_REQUIREMENTS.md §12: aggregate, privacy-respecting signals
 * only — never individual profiles. No real aggregation exists yet
 * (queries.ts returns 'empty'), so this renders an honest, data-aware state
 * rather than an invented number — "23 travellers joining" would read as a
 * real metric no matter how it's captioned.
 *
 * Laid out as a horizontal editorial split (statement left, content right)
 * rather than the stacked heading-then-content recipe most other sections
 * use — deliberate rhythm variation (Phase 3.3, Part A).
 *
 * Split into a pure `View` (tested directly against each ContentState) and a
 * Server Component that calls the real query, same pattern as
 * upcoming-experiences.tsx.
 */

export function MeetYourPeopleView({ state }: { state: ContentState<CommunitySnapshot> }) {
  if (state.status === 'ready') {
    const { totalTravellers, soloTravellers, firstInternationalTrips, topCities } = state.data;
    return (
      <div
        className="grid"
        style={{
          gap: 'var(--space-6)',
          gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))',
        }}
      >
        <Stat label="Travellers joining" value={totalTravellers} />
        <Stat label="Travelling solo" value={soloTravellers} />
        <Stat label="First international trip" value={firstInternationalTrips} />
        {topCities.length > 0 ? (
          <Stack gap={1}>
            <Text variant="meta" tone="muted" uppercase>
              Joining from
            </Text>
            <Text variant="small">{topCities.map((c) => c.city).join(', ')}</Text>
          </Stack>
        ) : null}
      </div>
    );
  }

  // 'loading', 'error' and 'empty' all resolve to the same honest message,
  // set at editorial scale rather than as a small caption — there is nothing
  // false to show, only something not yet available, and that's still worth
  // saying with confidence rather than apologising for it.
  return (
    <Stack gap={3}>
      <StarMark />
      <Text
        as="p"
        style={{
          fontSize: 'var(--text-2xl)',
          fontWeight: 'var(--weight-subheading)',
          lineHeight: 'var(--leading-snug)',
        }}
      >
        Real community stats will appear here.
      </Text>
      <Text tone="secondary" className="max-w-[42ch]">
        How many are going, how many are travelling solo, and where people are joining from — once
        departures open.
      </Text>
    </Stack>
  );
}

function Stat({ label, value }: { label: string; value: number }) {
  return (
    <Stack gap={1}>
      <Text
        as="p"
        className="tabular-nums"
        style={{ fontSize: 'var(--text-4xl)', fontWeight: 'var(--weight-display)' }}
      >
        {value}
      </Text>
      <Text variant="meta" tone="muted" uppercase>
        {label}
      </Text>
    </Stack>
  );
}

async function MeetYourPeopleContent() {
  const state = await getCommunitySnapshot();
  return <MeetYourPeopleView state={state} />;
}

export function MeetYourPeople() {
  return (
    <Section spacing="default" style={{ background: 'var(--color-background-secondary)' }}>
      <Container>
        <div
          className="grid grid-cols-1 items-start sm:grid-cols-2"
          style={{ gap: 'var(--space-10)' }}
        >
          <Stack gap={2}>
            <Text variant="label" tone="brand" uppercase as="p">
              Meet your people
            </Text>
            <Heading level="3xl" as="h2" className="max-w-[16ch]">
              You don&apos;t need a group to join a group
            </Heading>
          </Stack>
          <MeetYourPeopleContent />
        </div>
      </Container>
    </Section>
  );
}
