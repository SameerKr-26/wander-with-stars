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
 * Everything defaults to off except the core public experience, so a new
 * environment is conservative rather than accidentally exposing a half-built
 * module.
 */

export const FEATURES = {
  /** Trip discovery and detail. The core public product — effectively always on. */
  tripDiscovery: true,

  /** Trip communities. docs/ROADMAP.md Phase 9. */
  community: flag('NEXT_PUBLIC_FEATURE_COMMUNITY'),

  /** Editorial stories and travel media. */
  stories: flag('NEXT_PUBLIC_FEATURE_STORIES'),

  /** Traveller accounts: login, dashboard, wishlist. Phase 4. */
  travellerAccounts: flag('NEXT_PUBLIC_FEATURE_ACCOUNTS'),

  /** Creator profiles and portal. Phase 12 — public-facing part only. */
  creators: flag('NEXT_PUBLIC_FEATURE_CREATORS'),

  /** AI trip matcher behind the "Find My Trip" entry point. Phase 11. */
  tripMatcher: flag('NEXT_PUBLIC_FEATURE_TRIP_MATCHER'),
} as const;

export type FeatureName = keyof typeof FEATURES;

/**
 * Reads a public flag.
 *
 * `NEXT_PUBLIC_*` values are inlined at build time, so each name must appear
 * as a literal — a lookup like `process.env[name]` is not substituted and
 * silently returns undefined in the browser.
 */
function flag(name: 'NEXT_PUBLIC_FEATURE_COMMUNITY'): boolean;
function flag(name: 'NEXT_PUBLIC_FEATURE_STORIES'): boolean;
function flag(name: 'NEXT_PUBLIC_FEATURE_ACCOUNTS'): boolean;
function flag(name: 'NEXT_PUBLIC_FEATURE_CREATORS'): boolean;
function flag(name: 'NEXT_PUBLIC_FEATURE_TRIP_MATCHER'): boolean;
function flag(name: string): boolean {
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

  return value === 'true';
}

/** Convenience for reading a flag by name. */
export function isEnabled(feature: FeatureName): boolean {
  return FEATURES[feature];
}
