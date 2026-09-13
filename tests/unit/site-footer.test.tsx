import { render, screen, within } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

import { SiteFooter } from '@/components/layout/site-footer';

vi.mock('next/link', () => ({
  default: ({ children, href, ...props }: React.ComponentProps<'a'>) => (
    <a href={href} {...props}>
      {children}
    </a>
  ),
}));

/**
 * Footer — no dead internal links.
 *
 * Every link the footer renders must resolve to an implemented route.
 * Mirrors the equivalent check in site-header.test.tsx; the footer draws from
 * the same lib/navigation/site-navigation.ts, so this catches a route being
 * added to one and not the other.
 */
describe('SiteFooter', () => {
  it('renders only implemented destinations', () => {
    render(<SiteFooter />);
    const contentinfo = screen.getByRole('contentinfo');
    const hrefs = within(contentinfo)
      .getAllByRole('link')
      .map((link) => link.getAttribute('href'));

    const validRoots = new Set(['/', '/trips', '/stories', '/creators', '/about', '/contact']);
    for (const href of hrefs) {
      expect(validRoots.has(href ?? '')).toBe(true);
    }
  });

  it('never renders Community — no page exists yet', () => {
    render(<SiteFooter />);
    expect(screen.queryByRole('link', { name: 'Community' })).not.toBeInTheDocument();
  });

  it('drops the Legal group entirely — none of its pages exist yet', () => {
    render(<SiteFooter />);
    expect(screen.queryByRole('navigation', { name: 'Legal' })).not.toBeInTheDocument();
  });

  it('renders the Support group with About and Contact, now real', () => {
    render(<SiteFooter />);
    const support = screen.getByRole('navigation', { name: 'Support' });
    expect(within(support).getByRole('link', { name: 'About' })).toHaveAttribute('href', '/about');
    expect(within(support).getByRole('link', { name: 'Contact' })).toHaveAttribute(
      'href',
      '/contact',
    );
  });
});
