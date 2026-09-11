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
 * Note on current state: no public page exists beyond "/", so navigation is
 * legitimately empty and the header renders only the wordmark. Tests below are
 * split between what must hold now, and what must hold once destinations ship
 * — the latter driven through a mocked navigation config rather than by
 * inventing routes.
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

describe('current state — nothing is advertised that does not exist', () => {
  it('renders no navigation links, because no public page exists yet', () => {
    render(<SiteHeader />);
    const banner = screen.getByRole('banner');
    // Only the wordmark link.
    expect(within(banner).getAllByRole('link')).toHaveLength(1);
  });

  it('renders no empty navigation landmark', () => {
    render(<SiteHeader />);
    expect(screen.queryByRole('navigation', { name: 'Primary' })).not.toBeInTheDocument();
  });

  it('renders no menu button that would open onto nothing', () => {
    render(<SiteHeader />);
    expect(screen.queryByRole('button', { name: 'Menu' })).not.toBeInTheDocument();
  });

  it('exposes no link to an unbuilt destination', () => {
    render(<SiteHeader />);
    for (const href of ['/trips', '/community', '/stories', '/about', '/login', '/explore']) {
      expect(document.querySelector(`a[href="${href}"]`)).toBeNull();
    }
  });

  it('still exposes scroll state for styling', () => {
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
