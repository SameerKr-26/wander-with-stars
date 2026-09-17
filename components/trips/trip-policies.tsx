import { Container, Section, Stack, Text } from '@/components/ui';
import type { TripPolicy, TripPolicySection } from '@/lib/content/types';

/**
 * TripPolicies — CANCELLATION / REFUND / PAYMENT / TERMS.
 *
 * A clearly separate reference area (a muted background sets it apart from
 * the editorial sections above it), not woven into the cinematic page:
 * real commercial/legal terms, rendered only when `TripDetail.policy`
 * actually supplies them. Every section of `TripPolicy` is independently
 * optional, so this renders exactly the subset that exists — never a
 * "Cancellation policy coming soon" placeholder standing in for real WWS
 * terms. Same native `<details>` disclosure as TripFAQs, for the same
 * accessibility/no-JS reasons.
 */
export function TripPolicies({ policy }: { policy: TripPolicy | undefined }) {
  if (!policy) return null;

  const sections: TripPolicySection[] = [
    ...(policy.cancellation ? [policy.cancellation] : []),
    ...(policy.refund ? [policy.refund] : []),
    ...(policy.paymentTerms ? [policy.paymentTerms] : []),
    ...(policy.additionalTerms ?? []),
  ];

  if (sections.length === 0) return null;

  return (
    <Section spacing="tight" style={{ background: 'var(--color-background-secondary)' }}>
      <Container width="narrow">
        <Stack gap={4}>
          <Text variant="label" tone="brand" uppercase>
            Terms &amp; policies
          </Text>
          <div className="flex flex-col">
            {sections.map((section, index) => (
              <details key={index} className="wws-disclosure-item">
                <summary className="wws-disclosure-summary">
                  <Text as="span" style={{ fontWeight: 'var(--weight-subheading)' }}>
                    {section.title}
                  </Text>
                  <span aria-hidden="true" className="wws-disclosure-icon">
                    +
                  </span>
                </summary>
                <Text tone="secondary" variant="small" style={{ paddingTop: 'var(--space-3)' }}>
                  {section.body}
                </Text>
              </details>
            ))}
          </div>
        </Stack>
      </Container>
    </Section>
  );
}
