import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { SiteHeader } from '@/components/layout/site-header';
import type { NavItem } from '@/lib/navigation/site-navigation';

/**
 * Header behaviour.
 *
 * next/navigation needs stubbing: usePathname has no router in a unit test.
 * Mocking it also lets active-state be driven directly.
 *
 * As of Phase 3.3, Trips/Stories/Creators/About/Find My Trip are real —
 * "real navigation" below asserts the actual default config renders them, and
 * that Community/Login (no page yet) still don't. "header behaviour, given
 * any items" exercises menu mechanics (open/close/Escape/focus) against
 * injected items, independent of which routes happen to be live, so it stays
 * valid as navigation content keeps changing.
 */
const pathname = vi.hoisted(() => ({ current: '/' }));

vi.mock('next/navigation', () => ({
  usePathname: () => pathname.current,
}));

vi.mock('next/link', () => ({
  default: ({ children, href, ...props }: React.ComponentProps<'a'>) => (
    <a href={href} {...props}>
      {children}
    </a>
  ),
}));

beforeEach(() => {
  pathname.current = '/';
});

describe('landmarks and labelling', () => {
  it('renders a banner', () => {
    render(<SiteHeader />);
    expect(screen.getByRole('banner')).toBeInTheDocument();
  });

  it('always offers a route home from the wordmark', () => {
    render(<SiteHeader />);
    expect(screen.getByRole('link', { name: 'Wander With Stars' })).toHaveAttribute('href', '/');
  });
});

describe('real navigation — Phase 3.3', () => {
  it('renders every implemented destination', () => {
    render(<SiteHeader />);
    const banner = screen.getByRole('banner');

    for (const label of ['Home', 'Trips', 'Stories', 'Creators', 'About']) {
      expect(within(banner).getAllByRole('link', { name: label }).length).toBeGreaterThan(0);
    }
    expect(within(banner).getAllByRole('link', { name: 'Find My Trip' }).length).toBeGreaterThan(0);
  });

  it('renders Home pointing at the real root route', () => {
    render(<SiteHeader />);
    const banner = screen.getByRole('banner');
    expect(within(banner).getAllByRole('link', { name: 'Home' })[0]).toHaveAttribute('href', '/');
  });

  it('marks Home active on "/"', () => {
    pathname.current = '/';
    render(<SiteHeader />);
    expect(screen.getAllByRole('link', { name: 'Home' })[0]).toHaveAttribute(
      'aria-current',
      'page',
    );
  });

  it('does not mark Home active on other pages', () => {
    pathname.current = '/about';
    render(<SiteHeader />);
    expect(screen.getAllByRole('link', { name: 'Home' })[0]).not.toHaveAttribute('aria-current');
  });

  it('never advertises Community or Log in — no page exists for either', () => {
    render(<SiteHeader />);
    const banner = screen.getByRole('banner');
    expect(within(banner).queryByRole('link', { name: 'Community' })).not.toBeInTheDocument();
    expect(within(banner).queryByRole('link', { name: 'Log in' })).not.toBeInTheDocument();
  });

  it('has no dead internal links — every rendered href resolves to an implemented route', () => {
    render(<SiteHeader />);
    const banner = screen.getByRole('banner');
    const hrefs = within(banner)
      .getAllByRole('link')
      .map((link) => link.getAttribute('href'));

    // /trips/[slug] is dynamic and reached from a card, not advertised here,
    // so the only valid hrefs from the header are these exact roots.
    const validRoots = new Set(['/', '/trips', '/stories', '/creators', '/about']);
    for (const href of hrefs) {
      expect(validRoots.has(href ?? '')).toBe(true);
    }
  });

  it('renders a real, populated mobile menu trigger now that destinations exist', () => {
    render(<SiteHeader />);
    expect(screen.getByRole('button', { name: 'Menu' })).toBeInTheDocument();
  });

  it('exposes scroll state for styling', () => {
    render(<SiteHeader />);
    expect(screen.getByRole('banner')).toHaveAttribute('data-scrolled', 'false');
  });
});

/**
 * Behaviour once destinations exist.
 *
 * The navigation module is mocked so these can assert real interaction without
 * waiting for pages to ship, and without adding fake routes to the allowlist.
 */
describe('once destinations exist', () => {
  /* Items are injected rather than mocked at the module level: the header
     accepts pre-resolved navigation, so this exercises real interaction
     without adding fake routes to the implemented-route allowlist. */
  const items: NavItem[] = [
    { label: 'Explore Trips', href: '/trips', matchNested: true },
    { label: 'About', href: '/about' },
    { label: 'Find My Trip', href: '/trips', emphasis: 'primary' },
  ];

  function renderWithNav() {
    return render(<SiteHeader items={items} />);
  }

  it('renders a labelled navigation landmark', () => {
    renderWithNav();
    expect(screen.getAllByRole('navigation', { name: 'Primary' }).length).toBeGreaterThan(0);
  });

  describe('mobile menu', () => {
    it('exposes disclosure semantics before opening', () => {
      renderWithNav();
      const trigger = screen.getByRole('button', { name: 'Menu' });

      expect(trigger).toHaveAttribute('aria-expanded', 'false');
      expect(trigger).toHaveAttribute('aria-controls');
    });

    it('does not render the panel while closed, so it adds no stray tab stops', () => {
      renderWithNav();
      const panelId = screen
        .getByRole('button', { name: 'Menu' })
        .getAttribute('aria-controls') as string;

      expect(document.getElementById(panelId)).toBeNull();
    });

    it('opens on click and points at the panel it controls', async () => {
      renderWithNav();
      await userEvent.click(screen.getByRole('button', { name: 'Menu' }));

      const opened = screen.getByRole('button', { name: 'Close' });
      expect(opened).toHaveAttribute('aria-expanded', 'true');

      const panelId = opened.getAttribute('aria-controls') as string;
      expect(document.getElementById(panelId)).toBeInTheDocument();
    });

    it('closes again on a second click', async () => {
      renderWithNav();
      await userEvent.click(screen.getByRole('button', { name: 'Menu' }));
      await userEvent.click(screen.getByRole('button', { name: 'Close' }));

      expect(screen.getByRole('button', { name: 'Menu' })).toHaveAttribute(
        'aria-expanded',
        'false',
      );
    });

    it('closes on Escape and returns focus to the trigger', async () => {
      renderWithNav();
      await userEvent.click(screen.getByRole('button', { name: 'Menu' }));
      await userEvent.keyboard('{Escape}');

      const reclosed = screen.getByRole('button', { name: 'Menu' });
      expect(reclosed).toHaveAttribute('aria-expanded', 'false');
      // Focus must come back, or a keyboard user is dropped at the document top.
      expect(reclosed).toHaveFocus();
    });

    it('is operable by keyboard alone', async () => {
      renderWithNav();
      const trigger = screen.getByRole('button', { name: 'Menu' });

      trigger.focus();
      await userEvent.keyboard('{Enter}');

      expect(screen.getByRole('button', { name: 'Close' })).toHaveAttribute(
        'aria-expanded',
        'true',
      );
    });

    it('reflects menu state on the banner for styling', async () => {
      renderWithNav();
      expect(screen.getByRole('banner')).toHaveAttribute('data-menu-open', 'false');

      await userEvent.click(screen.getByRole('button', { name: 'Menu' }));
      expect(screen.getByRole('banner')).toHaveAttribute('data-menu-open', 'true');
    });
  });

  describe('active route semantics', () => {
    it('marks the current page with aria-current', () => {
      pathname.current = '/about';
      renderWithNav();

      expect(screen.getAllByRole('link', { name: 'About' })[0]).toHaveAttribute(
        'aria-current',
        'page',
      );
    });

    it('leaves other items unmarked', () => {
      pathname.current = '/about';
      renderWithNav();

      expect(screen.getAllByRole('link', { name: 'Explore Trips' })[0]).not.toHaveAttribute(
        'aria-current',
      );
    });

    it('marks a parent item active on a nested route', () => {
      pathname.current = '/trips/vietnam';
      renderWithNav();

      expect(screen.getAllByRole('link', { name: 'Explore Trips' })[0]).toHaveAttribute(
        'aria-current',
        'page',
      );
    });
  });
});
