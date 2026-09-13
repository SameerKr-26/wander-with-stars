import { Container, Section, Stack, Text } from '@/components/ui';

/**
 * Cinematic WWS story — 08.
 *
 * The four-chapter concept given directly in this milestone's brief
 * (Discover / Connect / Experience / Remember), grounded in the eight-pillar
 * product loop in docs/PRODUCT_REQUIREMENTS.md §5 — this is the same journey,
 * told as four chapters rather than eight steps for editorial pacing.
 *
 * Each chapter uses an atmosphere panel rather than a photo, for the same
 * reason as the hero: no real trip photography exists yet to place here.
 */

const CHAPTERS = [
  {
    number: '01',
    title: 'Discover',
    body: 'Browse curated departures by destination, style and date — every trip built around a fixed group, not a template.',
  },
  {
    number: '02',
    title: 'Connect',
    body: 'Once you’re confirmed, you meet your group before the trip starts — introductions, logistics, and the people you’ll actually travel with.',
  },
  {
    number: '03',
    title: 'Experience',
    body: 'Travel with a named host and a group that already knows each other a little, in a destination chosen for what it offers together.',
  },
  {
    number: '04',
    title: 'Remember',
    body: 'The trip becomes part of your travel history — memories, photos and a group that stays in touch after you land.',
  },
] as const;

export function CinematicStory() {
  return (
    <Section spacing="loose" style={{ background: 'var(--color-surface-brand-deep)' }}>
      <Container>
        <div className="flex flex-col" style={{ gap: 'var(--space-16)' }}>
          {CHAPTERS.map((chapter) => (
            <Stack key={chapter.number} gap={3} className="max-w-[56ch]">
              <Text
                as="p"
                style={{
                  color: 'var(--color-text-on-brand)',
                  opacity: 0.55,
                  fontSize: 'var(--text-5xl)',
                  fontWeight: 'var(--weight-display)',
                  fontFamily: 'var(--font-display)',
                  lineHeight: 1,
                }}
              >
                {chapter.number}
              </Text>
              <Text
                as="h3"
                style={{
                  color: 'var(--color-text-on-brand)',
                  fontSize: 'var(--text-3xl)',
                  fontWeight: 'var(--weight-heading)',
                  fontFamily: 'var(--font-display)',
                  letterSpacing: 'var(--tracking-heading)',
                  textTransform: 'uppercase',
                }}
              >
                {chapter.title}
              </Text>
              <Text as="p" style={{ color: 'var(--color-text-on-brand)', opacity: 0.85 }}>
                {chapter.body}
              </Text>
            </Stack>
          ))}
        </div>
      </Container>
    </Section>
  );
}
