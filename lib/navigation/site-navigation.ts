import { FEATURES, type FeatureName } from '@/lib/features';

/**
 * Navigation as configuration, not markup.
 *
 * docs/MODULAR_FEATURE_ARCHITECTURE.md §3 and §11: navigation must be derived
 * from a definition with visibility rules, so optional modules can be switched
 * off without editing the header, and roles never become permanent product
 * sections. There is no giant navbar component with every possible link
 * hardcoded into it.
 *
 * §10 is the reason this matters visually: the shell must read as coherent
 * whether zero or ten modules are enabled. Items are filtered out entirely
 * rather than rendered disabled or reserved as empty space.
 *
 * Labels use the human language docs/UX_INTERACTION_GUIDE.md §2 asks for —
 * "Find My Trip", not "Search". Nothing here is marketing copy; these are the
 * navigation labels already agreed in docs/ROUTES.md.
 */

/**
 * Routes that actually exist.
 *
 * Production navigation must never advertise a destination that 404s, so an
 * item is hidden until its real page ships. This is the single place to update
 * when one does — add the path here and the item appears in the header and
 * footer automatically.
 *
 * Deliberately an allowlist rather than a blocklist: a route omitted by
 * mistake is hidden, which is harmless, whereas a forgotten blocklist entry
 * ships a broken link to customers.
 *
 * Nested destinations (/trips/[slug]) are reached from inside a page, not from
 * navigation, so only navigable roots belong here.
 */
const IMPLEMENTED_ROUTES: ReadonlySet<string> = new Set<string>([
  '/', // placeholder shell; the real homepage is a later milestone
]);

/** Whether a navigation destination has a real page behind it. */
export function isImplemented(href: string): boolean {
  return IMPLEMENTED_ROUTES.has(href);
}

/** Who an item is for. Authorisation is enforced server-side, never here. */
export type Audience = 'public' | 'authenticated' | 'guest';

export interface NavItem {
  label: string;
  href: string;
  /** Hidden unless this feature is enabled. Omit for always-available items. */
  feature?: FeatureName;
  /** Defaults to 'public'. 'guest' shows only when signed out. */
  audience?: Audience;
  /** Marks the single primary action. At most one. */
  emphasis?: 'primary';
  /** Match nested routes too, e.g. /trips also highlights /trips/vietnam. */
  matchNested?: boolean;
}

/**
 * Primary navigation, in the order agreed in docs/ROUTES.md.
 *
 * These are the agreed destinations, not the currently visible ones. Each
 * item appears once two things are true: its feature is enabled, and its page
 * exists (IMPLEMENTED_ROUTES). Until then it is filtered out entirely rather
 * than rendered as a dead link.
 *
 * "Find My Trip" is a brand-level action, not an AI feature. It is gated on
 * tripDiscovery and points at /trips, so the CTA exists before the matcher
 * does. When tripMatcher ships it can change what happens behind this CTA —
 * a different destination or an interstitial — without a navigation redesign.
 */
export const PRIMARY_NAV: readonly NavItem[] = [
  { label: 'Explore Trips', href: '/trips', feature: 'tripDiscovery', matchNested: true },
  { label: 'Community', href: '/community', feature: 'community', matchNested: true },
  { label: 'Stories', href: '/stories', feature: 'stories', matchNested: true },
  { label: 'About', href: '/about' },
  { label: 'Log in', href: '/login', feature: 'travellerAccounts', audience: 'guest' },
  { label: 'Find My Trip', href: '/trips', feature: 'tripDiscovery', emphasis: 'primary' },
] as const;

/**
 * Footer groups. Structural regions only — the real content arrives with the
 * marketing milestone. Each group disappears entirely when it ends up empty,
 * so a disabled module leaves no gap.
 */
export interface NavGroup {
  /** Region heading. Structural label, not marketing copy. */
  title: string;
  items: readonly NavItem[];
}

export const FOOTER_NAV: readonly NavGroup[] = [
  {
    title: 'Explore',
    items: [
      { label: 'Explore Trips', href: '/trips', feature: 'tripDiscovery' },
      { label: 'Community', href: '/community', feature: 'community' },
      { label: 'Stories', href: '/stories', feature: 'stories' },
      { label: 'Hosts', href: '/hosts', feature: 'creators' },
    ],
  },
  {
    title: 'Support',
    items: [
      { label: 'About', href: '/about' },
      { label: 'FAQ', href: '/faq' },
      { label: 'Contact', href: '/contact' },
    ],
  },
  {
    title: 'Legal',
    items: [
      { label: 'Privacy', href: '/privacy' },
      { label: 'Terms', href: '/terms' },
      { label: 'Refund policy', href: '/refund-policy' },
    ],
  },
] as const;

export interface NavContext {
  /** Whether a user is signed in. Drives 'guest' items only. */
  isAuthenticated?: boolean;
}

/** True when an item should be rendered in the given context. */
export function isVisible(item: NavItem, context: NavContext = {}): boolean {
  /* Never advertise a destination that does not exist yet. */
  if (!isImplemented(item.href)) return false;

  if (item.feature && !FEATURES[item.feature]) return false;

  const audience = item.audience ?? 'public';
  if (audience === 'guest' && context.isAuthenticated) return false;
  if (audience === 'authenticated' && !context.isAuthenticated) return false;

  return true;
}

export function visibleItems(
  items: readonly NavItem[],
  context: NavContext = {},
): readonly NavItem[] {
  return items.filter((item) => isVisible(item, context));
}

/** Groups with no visible items are dropped, so no empty column is rendered. */
export function visibleGroups(
  groups: readonly NavGroup[],
  context: NavContext = {},
): readonly NavGroup[] {
  return groups
    .map((group) => ({ ...group, items: visibleItems(group.items, context) }))
    .filter((group) => group.items.length > 0);
}

/**
 * Whether an item represents the current page.
 *
 * `/` matches only itself — every path starts with it, so prefix matching
 * would mark Home active everywhere.
 */
export function isActive(item: NavItem, pathname: string): boolean {
  if (item.href === '/') return pathname === '/';
  if (pathname === item.href) return true;
  return item.matchNested === true && pathname.startsWith(`${item.href}/`);
}
