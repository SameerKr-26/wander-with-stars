import Link from 'next/link';

import { Container, Section, Separator, Stack, Text } from '@/components/ui';

import { EditorialStatement } from './section-heading';

/**
 * Why WWS — 09.
 *
 * Product principles, directly from docs/PRODUCT_REQUIREMENTS.md — no
 * numerical claims, per this milestone's explicit instruction.
 *
 * Presented as a numbered editorial list rather than a symmetric icon grid —
 * echoes the chapter numbering in cinematic-story.tsx as a small recurring
 * signature detail, and reads as a flowing list rather than another grid of
 * boxes (Phase 3.3, Part A).
 *
 * This is an introduction, not the destination: "Read our story →" leads to
 * the real /about page, which is where the fuller philosophy lives. Main
 * navigation stays real page links throughout — this is a homepage teaser,
 * not a substitute for visiting /about.
 */
const PRINCIPLES = [
  {
    title: 'Curated groups',
    body: 'Every departure is planned for a specific group, not sold as a generic package.',
  },
  {
    title: 'Community before departure',
    body: 'You meet your group before you fly, not on arrival.',
  },
  {
    title: 'Trusted hosts',
    body: 'A named host travels with every group, from arrival to departure.',
  },
  {
    title: 'Transparent trip information',
    body: 'Inclusions, exclusions and policies are stated clearly before you book.',
  },
  {
    title: 'Social travel',
    body: 'Built for people who want the destination and the company that comes with it.',
  },
] as const;

export function WhyWWS() {
  return (
    <Section spacing="default">
      <Container>
        <div className="flex flex-col" style={{ gap: 'var(--space-10)' }}>
          <EditorialStatement eyebrow="Why WWS" title="Travel with people, not just packages" />

          <div className="flex flex-col">
            {PRINCIPLES.map((item, index) => (
              <div key={item.title}>
                <div
                  className="flex flex-col sm:flex-row sm:items-baseline"
                  style={{ gap: 'var(--space-4)', paddingBlock: 'var(--space-5)' }}
                >
                  <Text
                    as="span"
                    className="shrink-0 tabular-nums"
                    style={{
                      fontFamily: 'var(--font-display)',
                      fontSize: 'var(--text-sm)',
                      fontWeight: 'var(--weight-label)',
                      color: 'var(--color-text-muted)',
                      width: '3ch',
                    }}
                  >
                    {String(index + 1).padStart(2, '0')}
                  </Text>
                  <Stack gap={1} className="sm:w-[28ch] sm:shrink-0">
                    <Text style={{ fontWeight: 'var(--weight-subheading)' }}>{item.title}</Text>
                  </Stack>
                  <Text variant="small" tone="secondary" className="max-w-[48ch]">
                    {item.body}
                  </Text>
                </div>
                {index < PRINCIPLES.length - 1 ? <Separator /> : null}
              </div>
            ))}
          </div>

          <Link
            href="/about"
            className="hover:text-text-brand-strong w-fit"
            style={{
              color: 'var(--color-text-brand)',
              fontWeight: 'var(--weight-label)',
              fontSize: 'var(--text-sm)',
            }}
          >
            Read our story →
          </Link>
        </div>
      </Container>
    </Section>
  );
}
