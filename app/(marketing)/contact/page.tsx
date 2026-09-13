import type { Metadata } from 'next';

import { Container, Section, Stack, Text } from '@/components/ui';
import { PageHeader } from '@/components/marketing/page-header';

/**
 * /contact.
 *
 * No backend exists to receive a form submission (that would be fabricated
 * functionality — a form that goes nowhere is worse than no form). The one
 * real, working contact channel documented anywhere in this project is the
 * existing WWS Instagram account, referenced in
 * docs/WWS_V2_CHAT_MEMORY.md — a genuine, external, already-live business
 * account, not an invented one. A dedicated contact form is a real gap,
 * stated honestly rather than faked.
 */

export const metadata: Metadata = {
  title: 'Contact — Wander With Stars',
  description: 'Get in touch with Wander With Stars.',
};

const INSTAGRAM_URL = 'https://www.instagram.com/wanderwithstars.co/';

export default function ContactPage() {
  return (
    <>
      <PageHeader eyebrow="Contact" title="Get in touch" />
      <Section spacing="tight">
        <Container width="narrow">
          <Stack gap={5}>
            <Text
              tone="secondary"
              style={{ fontSize: 'var(--text-lg)', lineHeight: 'var(--leading-normal)' }}
            >
              A dedicated contact form is on the way. For now, the fastest way to reach Wander With
              Stars is Instagram.
            </Text>

            <a
              href={INSTAGRAM_URL}
              target="_blank"
              rel="noopener noreferrer"
              className="hover:text-text-brand-strong w-fit"
              style={{
                fontSize: 'var(--text-lg)',
                fontWeight: 'var(--weight-label)',
                color: 'var(--color-text-brand)',
              }}
            >
              @wanderwithstars.co on Instagram →
            </a>

            <Text variant="small" tone="muted">
              Opens in a new tab.
            </Text>
          </Stack>
        </Container>
      </Section>
    </>
  );
}
