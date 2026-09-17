import { Container, Section, Stack, Text } from '@/components/ui';
import type { GuidePreview, HostPreview } from '@/lib/content/types';

/**
 * TripHost + TripGuide + TripCommunity — THE HOST and THE PEOPLE.
 *
 * Shows only host/guide information that actually exists on the record
 * (`HostPreview` / `GuidePreview` — name, and optionally an
 * avatar/tagline no current fixture supplies for either role). No invented
 * biography, credentials or personality. The one non-data-driven line per
 * role is phrased as a general fact about how WWS trips operate, not a
 * specific claim about this person, and only appears when the record has
 * no real tagline to show instead.
 *
 * `travellerCount` is the one honest per-departure community signal that
 * exists today (lib/content/types.ts) — the platform-wide `CommunitySnapshot`
 * (docs/PRODUCT_REQUIREMENTS.md §12) is deliberately not wired in here: it is
 * `null` in the current content layer (lib/content/fixtures.ts), and a
 * fabricated "0 travellers" is exactly the kind of invented number
 * CLAUDE.md forbids. Once real aggregate data exists, it has a home in this
 * same section without a rewrite.
 */
export function TripHost({ host }: { host: HostPreview }) {
  return (
    <Stack gap={2}>
      <Text variant="label" tone="brand" uppercase>
        Your host
      </Text>
      <Text style={{ fontWeight: 'var(--weight-subheading)' }}>{host.name}</Text>
      <Text variant="small" tone="secondary">
        {host.tagline ?? 'WWS hosts travel with the group for the full departure, start to finish.'}
      </Text>
    </Stack>
  );
}

/**
 * TripGuide — Phase 3.5C. Renders nothing when a departure has no separate
 * guide on record (today, every fixture) — never falls back to repeating
 * the host, which would imply a fact ("this host is also your guide") the
 * data doesn't actually state.
 */
export function TripGuide({ guide }: { guide: GuidePreview | undefined }) {
  if (!guide) return null;

  return (
    <Stack gap={2}>
      <Text variant="label" tone="brand" uppercase>
        Your guide
      </Text>
      <Text style={{ fontWeight: 'var(--weight-subheading)' }}>{guide.name}</Text>
      <Text variant="small" tone="secondary">
        {guide.tagline ?? 'Leads the group through each day of activities on the ground.'}
      </Text>
    </Stack>
  );
}

export function TripCommunity({ travellerCount }: { travellerCount?: number | undefined }) {
  return (
    <Stack gap={2}>
      <Text variant="label" tone="brand" uppercase>
        Who&apos;s going
      </Text>
      <Text variant="small" tone="secondary">
        {travellerCount !== undefined
          ? `${travellerCount} travellers have joined this departure so far.`
          : 'Traveller count for this departure isn’t available yet.'}
      </Text>
    </Stack>
  );
}

export function TripPeople({
  host,
  guide,
  travellerCount,
}: {
  host: HostPreview;
  guide?: GuidePreview | undefined;
  travellerCount?: number | undefined;
}) {
  return (
    <Section spacing="default">
      <Container>
        <div
          className="grid"
          style={{
            gap: 'var(--space-8)',
            gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))',
          }}
        >
          <TripHost host={host} />
          <TripGuide guide={guide} />
          <TripCommunity travellerCount={travellerCount} />
        </div>
      </Container>
    </Section>
  );
}
