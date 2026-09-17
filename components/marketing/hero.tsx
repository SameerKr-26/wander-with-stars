import { Container, GlassPanel, Heading, LinkButton, Stack, Text } from '@/components/ui';

import { AtmosphereField } from './atmosphere-field';
import { Highlight } from './highlight';
import { StarMark } from './section-heading';

/**
 * Hero — 02.
 *
 * Editorial composition rather than a centred banner: oversized left-aligned
 * type over an atmosphere field, with a single floating glass panel carrying
 * the CTAs. Full-bleed, sized to its content rather than forced to 100vh.
 *
 * CTA targets: both point at /trips (Phase 3.3, Part C) — the real trip
 * listing now that it exists. Earlier this pointed at in-page anchors, since
 * /trips didn't exist yet; that workaround is gone now that it does.
 *
 * No 'use client': LinkButton renders a plain <a> under the hood, so this
 * section needs no client JS for its CTAs.
 */
export function Hero() {
  return (
    <section className="relative overflow-hidden" aria-label="Wander With Stars">
      <AtmosphereField variant="hero" />

      <Container>
        <div
          className="relative flex flex-col justify-center"
          style={{
            minHeight: 'min(88svh, 820px)',
            paddingBlock: 'var(--space-24)',
            gap: 'var(--space-10)',
          }}
        >
          <Stack gap={4} className="max-w-[18ch] sm:max-w-[20ch]">
            <Text variant="label" tone="brand" uppercase as="p">
              <StarMark /> Wander With Stars
            </Text>

            <Heading
              level="hero"
              as="h1"
              style={{ color: 'var(--color-text-primary)', textWrap: 'balance' }}
            >
              Your next
              <br />
              <Highlight>adventure.</Highlight>
            </Heading>

            <Text variant="lead" tone="secondary" className="max-w-[46ch]">
              Curated group trips, built around the people you&apos;ll travel with — not just the
              places you&apos;ll go.
            </Text>
          </Stack>

          <GlassPanel
            variant="default"
            radius="panel"
            className="flex max-w-[420px] flex-col"
            style={{ gap: 'var(--space-4)' }}
          >
            <Text variant="small" tone="secondary">
              Your people are part of the experience.
            </Text>
            <div className="flex flex-wrap" style={{ gap: 'var(--space-3)' }}>
              <LinkButton href="/trips" variant="primary">
                Find My Trip
              </LinkButton>
              <LinkButton href="/trips" variant="secondary">
                Explore Trips
              </LinkButton>
            </div>
          </GlassPanel>
        </div>
      </Container>
    </section>
  );
}
