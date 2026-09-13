import { describe, expect, it } from 'vitest';

import {
  isActive,
  isImplemented,
  PRIMARY_NAV,
  visibleGroups,
  visibleItems,
  type NavGroup,
  type NavItem,
} from '@/lib/navigation/site-navigation';

/**
 * Navigation configuration.
 *
 * These assert two rules the architecture depends on:
 *
 *   1. docs/MODULAR_FEATURE_ARCHITECTURE.md §10 — disabling a module removes
 *      its entries entirely, rather than disabling them or leaving a gap.
 *   2. Production navigation never advertises a route that does not exist.
 *
 * As of Phase 3.3, `/`, `/trips`, `/about`, `/stories`, `/creators` and
 * `/contact` are implemented; `/community` and `/login` are not (no page
 * exists for either yet). Fixtures below use `/community` as the "genuinely
 * unbuilt" example throughout, so these tests stay accurate as more routes
 * ship. Items are built inline rather than imported from the live config,
 * so these describe behaviour rather than whichever flags happen to be set.
 */

const home: NavItem = { label: 'Home', href: '/' };
const unbuilt: NavItem = { label: 'Community', href: '/community' };
const guestOnly: NavItem = { label: 'Log in', href: '/', audience: 'guest' };
const memberOnly: NavItem = { label: 'My trips', href: '/', audience: 'authenticated' };
// 'community' stays off by default, unlike 'creators'/'stories' which are on
// as of Phase 3.3 — using it here keeps this fixture testing a genuinely
// disabled feature regardless of which flags default to true later.
const gated: NavItem = { label: 'Community feature item', href: '/', feature: 'community' };

describe('route existence', () => {
  it('recognises an implemented route', () => {
    expect(isImplemented('/')).toBe(true);
    expect(isImplemented('/trips')).toBe(true);
    expect(isImplemented('/about')).toBe(true);
    expect(isImplemented('/stories')).toBe(true);
    expect(isImplemented('/creators')).toBe(true);
    expect(isImplemented('/contact')).toBe(true);
  });

  it('treats destinations with no page yet as not implemented', () => {
    expect(isImplemented('/community')).toBe(false);
    expect(isImplemented('/login')).toBe(false);
  });

  it('hides items whose page does not exist yet, so no link can 404', () => {
    expect(visibleItems([unbuilt])).toEqual([]);
  });

  it('hides unbuilt destinations even when their feature is enabled', () => {
    // tripDiscovery is always on, but /community has no page — the route
    // gate must fire independently of the feature gate.
    const communityWithAllowedFeature: NavItem = {
      label: 'Community (test)',
      href: '/community',
      feature: 'tripDiscovery',
    };
    expect(visibleItems([communityWithAllowedFeature])).toEqual([]);
  });

  it('is an allowlist, so an unknown route is hidden rather than exposed', () => {
    expect(isImplemented('/anything-not-listed')).toBe(false);
  });

  it('does not expose nested trip detail pages as a navigation root', () => {
    // /trips/[slug] pages exist, but are reached from a trip card, not the
    // nav allowlist — a dynamic path was never meant to be a menu item.
    expect(isImplemented('/trips/sample-northern-vietnam')).toBe(false);
  });
});

describe('visibility rules', () => {
  it('keeps an implemented item with no constraints', () => {
    expect(visibleItems([home])).toEqual([home]);
  });

  it('hides guest-only items from signed-in users', () => {
    expect(visibleItems([guestOnly], { isAuthenticated: true })).toEqual([]);
    expect(visibleItems([guestOnly], { isAuthenticated: false })).toEqual([guestOnly]);
  });

  it('hides authenticated-only items from signed-out visitors', () => {
    expect(visibleItems([memberOnly], { isAuthenticated: false })).toEqual([]);
    expect(visibleItems([memberOnly], { isAuthenticated: true })).toEqual([memberOnly]);
  });

  it('removes disabled-feature items entirely rather than disabling them', () => {
    // `creators` is off by default.
    expect(visibleItems([home, gated])).toEqual([home]);
  });
});

describe('primary navigation config', () => {
  it('treats Find My Trip as a discovery action, not an AI feature', () => {
    const cta = PRIMARY_NAV.find((item) => item.emphasis === 'primary');

    expect(cta?.label).toBe('Find My Trip');
    // Gated on discovery so the CTA exists before the matcher does.
    expect(cta?.feature).toBe('tripDiscovery');
    expect(cta?.href).toBe('/trips');
  });

  it('declares at most one primary action', () => {
    expect(PRIMARY_NAV.filter((item) => item.emphasis === 'primary')).toHaveLength(1);
  });

  it('exposes exactly the routes that are actually implemented, signed out, in the required order', () => {
    // Trips, Stories, Creators and About all have real pages as of Phase 3.3.
    // Community has no page yet; Login is gated on travellerAccounts (off).
    const labels = visibleItems(PRIMARY_NAV).map((item) => item.label);
    expect(labels).toEqual(['Home', 'Trips', 'Stories', 'Creators', 'About', 'Find My Trip']);
  });

  it('includes Home, pointing at the real root route', () => {
    const homeItem = PRIMARY_NAV.find((item) => item.label === 'Home');
    expect(homeItem?.href).toBe('/');
    // No hash anchor, and no feature/audience gate — Home is always available.
    expect(homeItem?.feature).toBeUndefined();
    expect(homeItem?.audience).toBeUndefined();
  });

  it('never exposes Community or Log in — no page exists for either', () => {
    const labels = visibleItems(PRIMARY_NAV, { isAuthenticated: false }).map((item) => item.label);
    expect(labels).not.toContain('Community');
    expect(labels).not.toContain('Log in');
  });
});

describe('footer groups', () => {
  it('drops a group once every item in it is hidden, leaving no empty column', () => {
    const groups: readonly NavGroup[] = [
      { title: 'Explore', items: [gated] },
      { title: 'Support', items: [home] },
    ];

    expect(visibleGroups(groups).map((g) => g.title)).toEqual(['Support']);
  });

  it('keeps a group when at least one item survives', () => {
    const groups: readonly NavGroup[] = [{ title: 'Explore', items: [gated, home] }];

    const result = visibleGroups(groups);
    expect(result).toHaveLength(1);
    expect(result[0]?.items).toEqual([home]);
  });
});

describe('active route matching', () => {
  // Matching is independent of whether a route is implemented — it answers
  // "is this the current page", not "should this be shown".
  const about: NavItem = { label: 'About', href: '/about' };
  const trips: NavItem = { label: 'Explore Trips', href: '/trips', matchNested: true };

  it('matches an exact path', () => {
    expect(isActive(about, '/about')).toBe(true);
    expect(isActive(about, '/contact')).toBe(false);
  });

  it('matches nested routes only when the item opts in', () => {
    expect(isActive(trips, '/trips/vietnam')).toBe(true);
    expect(isActive(about, '/about/team')).toBe(false);
  });

  it('does not treat a shared prefix as a nested route', () => {
    expect(isActive(trips, '/tripsomething')).toBe(false);
  });

  it('matches home only on home, since every path starts with "/"', () => {
    expect(isActive(home, '/')).toBe(true);
    expect(isActive(home, '/trips')).toBe(false);
  });
});
