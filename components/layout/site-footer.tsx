import Link from 'next/link';

import { Container, Separator, Stack, Text } from '@/components/ui';
import { FOOTER_NAV, visibleGroups, type NavContext } from '@/lib/navigation/site-navigation';

/**
 * Site footer — structure only.
 *
 * Semantic regions for brand, navigation, support, legal and social, with no
 * invented marketing copy. Headings are structural labels ("Explore",
 * "Support", "Legal") and links come from the navigation config, so a disabled
 * module removes its entries and an emptied column disappears entirely rather
 * than leaving a gap (docs/MODULAR_FEATURE_ARCHITECTURE.md §10).
 *
 * The social region is a slot rather than a list of icons: no accounts have
 * been confirmed for the platform, and inventing links would be fabrication.
 *
 * Visual treatment stays minimal until the marketing milestone.
 */

export interface SiteFooterProps extends NavContext {
  /** Social links, when the real accounts are known. */
  social?: React.ReactNode;
}

export function SiteFooter({ isAuthenticated = false, social }: SiteFooterProps) {
  const groups = visibleGroups(FOOTER_NAV, { isAuthenticated });
  const year = new Date().getFullYear();

  return (
    <footer
      className="border-border-subtle border-t"
      style={{ background: 'var(--color-surface)' }}
    >
      <Container>
        <div style={{ paddingBlock: 'var(--space-12)' }}>
          <div
            className="grid"
            style={{
              gap: 'var(--space-10)',
              gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))',
            }}
          >
            {/* Brand region. Wordmark as text — the brand asset is pending
                replacement and nothing may depend on it yet. */}
            <Stack gap={3}>
              <Text
                as="p"
                style={{
                  fontFamily: 'var(--font-display)',
                  fontSize: 'var(--text-base)',
                  fontWeight: 'var(--weight-display)',
                  letterSpacing: 'var(--tracking-heading)',
                }}
              >
                Wander With Stars
              </Text>
              {social ? <div>{social}</div> : null}
            </Stack>

            {groups.map((group) => (
              <nav key={group.title} aria-label={group.title}>
                <Stack gap={3}>
                  <Text variant="label" tone="muted" uppercase as="h2">
                    {group.title}
                  </Text>
                  <ul className="flex flex-col" style={{ gap: 'var(--space-2)' }}>
                    {group.items.map((item) => (
                      <li key={item.label}>
                        <Link
                          href={item.href}
                          className="text-text-secondary hover:text-text-brand"
                          style={{ fontSize: 'var(--text-sm)' }}
                        >
                          {item.label}
                        </Link>
                      </li>
                    ))}
                  </ul>
                </Stack>
              </nav>
            ))}
          </div>

          <Separator style={{ marginBlock: 'var(--space-8)' }} />

          <Text variant="meta" tone="muted">
            © {year} Wander With Stars
          </Text>
        </div>
      </Container>
    </footer>
  );
}
