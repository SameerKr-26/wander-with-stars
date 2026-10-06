import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { SiteHeader } from '@/components/layout/site-header';
import type { NavItem } from '@/lib/navigation/site-navigation';

/**
 * Header behaviour.
 *
 * next/navigation needs stubbing: usePathname has no router in a unit test.
 * Mocking it also lets active-state be driven directly. useRouter/push/
 * refresh are stubbed too — AccountMenu's logged-in "Log out" control
 * (Phase 4.8A) calls both.
 *
 * As of Phase 3.3, Trips/Stories/Creators/About/Find My Trip are real —
 * "real navigation" below asserts the actual default config renders them,
 * and that Community still doesn't (no page yet). "Log in" is no longer in
 * that category: Phase 4.8A's AccountMenu renders it unconditionally,
 * independent of `PRIMARY_NAV`/`IMPLEMENTED_ROUTES` (see
 * lib/navigation/site-navigation.ts's own comment on removing the item
 * that used to live there, which never actually rendered). "header
 * behaviour, given any items" exercises menu mechanics (open/close/Escape/
 * focus) against injected items, independent of which routes happen to be
 * live, so it stays valid as navigation content keeps changing.
 *
 * `@/lib/supabase/client` is mocked because AccountMenu's logged-in state
 * imports it for its "Log out" action — createClient() would otherwise
 * eagerly validate NEXT_PUBLIC_* env vars at module load (lib/env/client.ts),
 * which this unit test's environment never sets. The same reasoning
 * `tests/unit/payment-repository.test.ts` already documents for mocking
 * `@/lib/payments/env`.
 */
const pathname = vi.hoisted(() => ({ current: '/' }));
const routerPush = vi.fn();
const routerRefresh = vi.fn();
const signOut = vi.fn().mockResolvedValue({ error: null });

vi.mock('next/navigation', () => ({
  usePathname: () => pathname.current,
  useRouter: () => ({ push: routerPush, refresh: routerRefresh }),
}));

vi.mock('next/link', () => ({
  default: ({ children, href, onClick, ...props }: React.ComponentProps<'a'>) => (
    <a href={href} onClick={onClick} {...props}>
      {children}
    </a>
  ),
}));

vi.mock('@/lib/supabase/client', () => ({
  createClient: () => ({ auth: { signOut } }),
}));

beforeEach(() => {
  pathname.current = '/';
  routerPush.mockClear();
  routerRefresh.mockClear();
  signOut.mockClear();
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

  it('never advertises Community — no page exists for it', () => {
    render(<SiteHeader />);
    const banner = screen.getByRole('banner');
    expect(within(banner).queryByRole('link', { name: 'Community' })).not.toBeInTheDocument();
  });

  it('has no dead internal links — every rendered href resolves to an implemented route', () => {
    render(<SiteHeader />);
    const banner = screen.getByRole('banner');
    const hrefs = within(banner)
      .getAllByRole('link')
      .map((link) => link.getAttribute('href'));

    // /trips/[slug] is dynamic and reached from a card, not advertised here.
    // /login and /signup come from AccountMenu's logged-out control
    // (Phase 4.8A), rendered unconditionally — not from PRIMARY_NAV.
    const validRoots = new Set([
      '/',
      '/trips',
      '/stories',
      '/creators',
      '/about',
      '/login',
      '/signup',
    ]);
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

/**
 * Global account access — Phase 4.8A.
 *
 * `account` drives AccountMenu entirely; `isAuthenticated` is derived from
 * it (components/layout/site-header.tsx), so these tests pass the
 * account-level session summary the same way
 * app/(marketing)/layout.tsx's own `getTravellerSession()` call does.
 */
describe('account access (Phase 4.8A)', () => {
  const account = { displayName: 'Jane Traveller', email: 'jane@example.test' };

  it('1. shows Log in (and Sign up) when logged out', () => {
    render(<SiteHeader />);
    const banner = screen.getByRole('banner');
    expect(within(banner).getByRole('link', { name: 'Log in' })).toHaveAttribute('href', '/login');
    expect(within(banner).getByRole('link', { name: 'Sign up' })).toHaveAttribute(
      'href',
      '/signup',
    );
  });

  it('does not show the account control or Log in at the same time as the other', () => {
    render(<SiteHeader account={account} />);
    const banner = screen.getByRole('banner');
    expect(within(banner).queryByRole('link', { name: 'Log in' })).not.toBeInTheDocument();
  });

  it('2. shows a profile/account control when logged in', () => {
    render(<SiteHeader account={account} />);
    expect(
      screen.getByRole('button', { name: `Account menu for ${account.displayName}` }),
    ).toBeInTheDocument();
  });

  it('3. the account dropdown opens correctly, showing name and email', async () => {
    render(<SiteHeader account={account} />);
    const trigger = screen.getByRole('button', { name: `Account menu for ${account.displayName}` });
    expect(trigger).toHaveAttribute('aria-expanded', 'false');

    await userEvent.click(trigger);

    expect(trigger).toHaveAttribute('aria-expanded', 'true');
    const menu = screen.getByRole('menu', { name: 'Account' });
    expect(menu).toBeInTheDocument();
    // Scoped to the menu panel: Avatar's own internal sr-only name span
    // (hidden from assistive tech, but still real DOM text) also contains
    // this exact string, which would otherwise make this query ambiguous.
    expect(within(menu).getByText(account.displayName)).toBeInTheDocument();
    expect(within(menu).getByText(account.email)).toBeInTheDocument();
  });

  it('closes again on a second click', async () => {
    render(<SiteHeader account={account} />);
    const trigger = screen.getByRole('button', { name: `Account menu for ${account.displayName}` });
    await userEvent.click(trigger);
    await userEvent.click(trigger);
    expect(trigger).toHaveAttribute('aria-expanded', 'false');
  });

  it('closes on Escape and returns focus to the trigger', async () => {
    render(<SiteHeader account={account} />);
    const trigger = screen.getByRole('button', { name: `Account menu for ${account.displayName}` });
    await userEvent.click(trigger);
    await userEvent.keyboard('{Escape}');

    expect(trigger).toHaveAttribute('aria-expanded', 'false');
    expect(trigger).toHaveFocus();
  });

  it('4. My Trips points at /dashboard', async () => {
    render(<SiteHeader account={account} />);
    await userEvent.click(
      screen.getByRole('button', { name: `Account menu for ${account.displayName}` }),
    );
    expect(screen.getByRole('menuitem', { name: 'My Trips' })).toHaveAttribute(
      'href',
      '/dashboard',
    );
  });

  it('5. Profile points at /dashboard/profile', async () => {
    render(<SiteHeader account={account} />);
    await userEvent.click(
      screen.getByRole('button', { name: `Account menu for ${account.displayName}` }),
    );
    expect(screen.getByRole('menuitem', { name: 'Profile' })).toHaveAttribute(
      'href',
      '/dashboard/profile',
    );
  });

  it('6. Log out signs the traveller out and redirects to /login', async () => {
    render(<SiteHeader account={account} />);
    await userEvent.click(
      screen.getByRole('button', { name: `Account menu for ${account.displayName}` }),
    );
    await userEvent.click(screen.getByRole('menuitem', { name: 'Log out' }));

    expect(signOut).toHaveBeenCalledTimes(1);
    expect(routerPush).toHaveBeenCalledWith('/login');
    expect(routerRefresh).toHaveBeenCalledTimes(1);
  });

  it('does not create header overflow or crowd navigation: the account control renders once, at every viewport (no responsive duplicate)', () => {
    render(<SiteHeader account={account} />);
    expect(
      screen.getAllByRole('button', { name: `Account menu for ${account.displayName}` }),
    ).toHaveLength(1);
  });
});
