import { Container, Section, Stack, Text } from '@/components/ui';

/**
 * Travel passport teaser — 11.
 *
 * Concept only — docs/PRODUCT_REQUIREMENTS.md §11. No authenticated passport
 * exists (Phase 4+), so this is informational, not actionable: an em dash
 * stands in for "no data yet" rather than a fabricated number, and there is
 * no CTA button, because signup/login are not implemented routes yet and a
 * button with nowhere to go is a dead end this milestone explicitly forbids.
 *
 * A plain editorial band, not a GlassPanel — the homepage already uses glass
 * for the hero panel; a second "floating card" this close to the closing CTA
 * reads as one more box rather than a distinct moment (Phase 3.3, Part A).
 */
const FIELDS = ['Destinations', 'Trips', 'Memories', 'Badges'] as const;

export function TravelPassportTeaser() {
  return (
    <Section spacing="default">
      <Container>
        <div
          className="flex flex-col items-start justify-between lg:flex-row lg:items-center"
          style={{ gap: 'var(--space-10)' }}
        >
          <Stack gap={2} className="max-w-[42ch]">
            <Text variant="label" tone="brand" uppercase>
              Travel passport
            </Text>
            <Text
              as="h2"
              style={{
                fontFamily: 'var(--font-display)',
                fontSize: 'var(--text-2xl)',
                fontWeight: 'var(--weight-heading)',
              }}
            >
              Your WWS travel history, in one place
            </Text>
            <Text variant="small" tone="secondary">
              Every completed trip builds your passport — destinations, memories and badges, once
              you have an account.
            </Text>
          </Stack>

          <div className="flex flex-wrap" style={{ gap: 'var(--space-8)' }}>
            {FIELDS.map((label) => (
              <Stack key={label} gap={1}>
                <Text
                  as="p"
                  className="text-text-muted"
                  style={{ fontSize: 'var(--text-3xl)', fontWeight: 'var(--weight-display)' }}
                >
                  —
                </Text>
                <Text variant="meta" tone="muted" uppercase>
                  {label}
                </Text>
              </Stack>
            ))}
          </div>
        </div>
      </Container>
    </Section>
  );
}
