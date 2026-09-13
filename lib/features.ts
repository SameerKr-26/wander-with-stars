/**
 * Feature flags — product configuration, NOT security.
 *
 * docs/MODULAR_FEATURE_ARCHITECTURE.md §5: these decide what is *offered*, not
 * what is *permitted*. A disabled flag hides navigation and entry points; it
 * does not protect data. Authorisation stays server-side and in RLS, and a
 * flag must never be the only thing standing between a user and a record.
 *
 * The point of the flag layer is §10: the public shell must look coherent
 * whether zero or ten optional modules are enabled, with no reserved gaps
 * where a disabled feature used to be. Navigation is derived from these, so
 * turning a module off removes its entries rather than leaving a hole.
 *
 * Values are read from the environment so a deployment can ship a subset of
 * the product without a code change — the "public product profile" in §8.
 * A flag's default reflects whether the module's minimum real page exists yet
 * (see lib/navigation/site-navigation.ts's IMPLEMENTED_ROUTES for the other
 * half of that gate) — not whether its full backend does. `community` and
 * `travellerAccounts` still default off: no page exists for either yet.
 */

export const FEATURES = {
  /** Trip discovery and detail. The core public product — effectively always on. */
  tripDiscovery: true,

  /** Trip communities. No public page yet — docs/ROADMAP.md Phase 9. */
  community: flag('NEXT_PUBLIC_FEATURE_COMMUNITY', false),

  /**
   * Editorial stories. Defaults on: /stories is a real minimal page as of
   * Phase 3.3, even though it has no editorial content yet (docs/PRODUCT_REQUIREMENTS.md §6
   * lists it as a core public route, distinct from the full stories/media
   * system built later).
   */
  stories: flag('NEXT_PUBLIC_FEATURE_STORIES', true),

  /** Traveller accounts: login, dashboard, wishlist. No page yet — Phase 4. */
  travellerAccounts: flag('NEXT_PUBLIC_FEATURE_ACCOUNTS', false),

  /**
   * Creator-facing public page. Defaults on for the same reason as `stories`:
   * /creators is a real minimal page as of Phase 3.3. The creator *portal*
   * (auth, applications, dashboard) is separate and still Phase 12, off.
   */
  creators: flag('NEXT_PUBLIC_FEATURE_CREATORS', true),

  /** AI trip matcher behind the "Find My Trip" entry point. Phase 11. */
  tripMatcher: flag('NEXT_PUBLIC_FEATURE_TRIP_MATCHER', false),
} as const;

export type FeatureName = keyof typeof FEATURES;

type PublicFlagName =
  | 'NEXT_PUBLIC_FEATURE_COMMUNITY'
  | 'NEXT_PUBLIC_FEATURE_STORIES'
  | 'NEXT_PUBLIC_FEATURE_ACCOUNTS'
  | 'NEXT_PUBLIC_FEATURE_CREATORS'
  | 'NEXT_PUBLIC_FEATURE_TRIP_MATCHER';

/**
 * Reads a public flag, falling back to `defaultValue` when unset.
 *
 * `NEXT_PUBLIC_*` values are inlined at build time, so each name must appear
 * as a literal — a lookup like `process.env[name]` is not substituted and
 * silently returns undefined in the browser. Explicit `'true'`/`'false'`
 * strings override the default in either direction, so a deployment can both
 * enable something off by default and disable something on by default.
 */
function flag(name: PublicFlagName, defaultValue: boolean): boolean {
  const value =
    name === 'NEXT_PUBLIC_FEATURE_COMMUNITY'
      ? process.env.NEXT_PUBLIC_FEATURE_COMMUNITY
      : name === 'NEXT_PUBLIC_FEATURE_STORIES'
        ? process.env.NEXT_PUBLIC_FEATURE_STORIES
        : name === 'NEXT_PUBLIC_FEATURE_ACCOUNTS'
          ? process.env.NEXT_PUBLIC_FEATURE_ACCOUNTS
          : name === 'NEXT_PUBLIC_FEATURE_CREATORS'
            ? process.env.NEXT_PUBLIC_FEATURE_CREATORS
            : process.env.NEXT_PUBLIC_FEATURE_TRIP_MATCHER;

  if (value === 'true') return true;
  if (value === 'false') return false;
  return defaultValue;
}

/** Convenience for reading a flag by name. */
export function isEnabled(feature: FeatureName): boolean {
  return FEATURES[feature];
}
