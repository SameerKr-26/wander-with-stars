import { Button, Container, GlassPanel, LinkButton, Section, Stack, Text } from '@/components/ui';

/**
 * TripBookingCTA — READY TO GO?
 *
 * The honest closing state: no fake checkout, no invented "reserve your
 * spot" flow. `Booking opens soon` mirrors the same disabled state
 * TripHero shows near the top of the page — one true statement about
 * booking readiness, not two different ones. The architecture (a single,
 * isolated component) makes swapping this for a real booking CTA later a
 * one-file change.
 */
export function TripBookingCTA() {
  return (
    <Section spacing="default">
      <Container>
        <GlassPanel
          variant="tinted"
          radius="panel"
          className="flex flex-wrap items-center justify-between"
          style={{ gap: 'var(--space-4)', padding: 'var(--space-6)' }}
        >
          <Stack gap={1}>
            <Text style={{ fontWeight: 'var(--weight-subheading)', fontSize: 'var(--text-lg)' }}>
              Ready to go?
            </Text>
            <Text variant="small" tone="secondary">
              Not yet bookable — see docs/ROADMAP.md Phase 6.
            </Text>
          </Stack>
          <div className="flex flex-wrap items-center" style={{ gap: 'var(--space-3)' }}>
            <Button disabled title="Booking opens once the payments milestone ships">
              Booking opens soon
            </Button>
            <LinkButton href="/trips" variant="secondary">
              ← All trips
            </LinkButton>
          </div>
        </GlassPanel>
      </Container>
    </Section>
  );
}
