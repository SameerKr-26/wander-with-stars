import { Container, Separator, Text } from '@/components/ui';

/**
 * Trust / social proof — 03.
 *
 * A single horizontal strip with hairline dividers rather than a boxed
 * 3-column grid — reads as a credibility line directly under the hero, not
 * another "section with a heading" (Phase 3.3, Part A). No traveller counts,
 * ratings or booking numbers: none exist yet, and inventing them would
 * misrepresent the business (CLAUDE.md). Capability statements instead —
 * what WWS actually does, not a number claiming how often it's done it.
 */
const SIGNALS = [
  'Curated group departures',
  'Hosts you can trust',
  'Community before you fly',
] as const;

export function TrustSignals() {
  return (
    <div style={{ paddingBlock: 'var(--space-8)' }}>
      <Container>
        <div
          className="flex flex-col sm:flex-row sm:items-center"
          style={{ gap: 'var(--space-4)' }}
        >
          {SIGNALS.map((signal, index) => (
            <div key={signal} className="flex items-center" style={{ gap: 'var(--space-4)' }}>
              {index > 0 ? (
                <Separator orientation="vertical" className="hidden h-4 sm:block" />
              ) : null}
              <Text
                variant="small"
                tone="secondary"
                style={{ fontWeight: 'var(--weight-emphasis)' }}
              >
                {signal}
              </Text>
            </div>
          ))}
        </div>
      </Container>
    </div>
  );
}
