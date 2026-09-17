import { Container, Section, Stack, Text } from '@/components/ui';
import type { TripFAQ } from '@/lib/content/types';

/**
 * TripFAQs — FAQ.
 *
 * Native `<details>`/`<summary>` disclosures (see the shared comment in
 * trip-detail.css's disclosure section) — full accessibility, zero client
 * JS. Renders nothing when there are no real FAQ entries; never a generic
 * filler question invented to populate the section.
 */
export function TripFAQs({ faqs }: { faqs: TripFAQ[] | undefined }) {
  if (!faqs || faqs.length === 0) return null;

  return (
    <Section spacing="default">
      <Container width="narrow">
        <Stack gap={4}>
          <Text variant="label" tone="brand" uppercase>
            Frequently asked
          </Text>
          <div className="flex flex-col">
            {faqs.map((faq, index) => (
              <details key={index} className="wws-disclosure-item">
                <summary className="wws-disclosure-summary">
                  <Text as="span" style={{ fontWeight: 'var(--weight-subheading)' }}>
                    {faq.question}
                  </Text>
                  <span aria-hidden="true" className="wws-disclosure-icon">
                    +
                  </span>
                </summary>
                <Text tone="secondary" style={{ paddingTop: 'var(--space-3)' }}>
                  {faq.answer}
                </Text>
              </details>
            ))}
          </div>
        </Stack>
      </Container>
    </Section>
  );
}
