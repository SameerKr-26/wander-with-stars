/**
 * Content access — the seam between UI and data source.
 *
 * Every homepage section imports from HERE, never from fixtures.ts directly.
 * Today these functions return development fixtures. Once the Trip/Departure
 * schema exists (docs/ROADMAP.md Phase 5), each function's body becomes a
 * Supabase query against `lib/supabase/server.ts` — the signature and the
 * `ContentState` wrapper stay the same, so no component changes.
 *
 * Each function is `async` already, even though returning a fixture needs no
 * await, so call sites are already written against the shape a real query
 * will have.
 */

import type {
  CommunitySnapshot,
  ContentState,
  CreatorExperience,
  TravellerStory,
  TripDetail,
  TripPreview,
} from './types';
import {
  DEV_COMMUNITY_SNAPSHOT,
  DEV_CREATOR_EXPERIENCES,
  DEV_TRAVELLER_STORIES,
  DEV_TRIP_DETAILS,
  DEV_UPCOMING_TRIPS,
} from './fixtures';

/**
 * Upcoming trip departures for the homepage.
 *
 * Future implementation: select published trip_departures joined to trips,
 * ordered by start_date, limited to a small count — see docs/DATABASE.md §3.
 */
export async function getUpcomingTrips(): Promise<ContentState<TripPreview[]>> {
  const trips = DEV_UPCOMING_TRIPS;
  if (trips.length === 0) return { status: 'empty' };
  return { status: 'ready', data: trips };
}

/**
 * A single trip's detail content by slug.
 *
 * `'empty'` covers both "no trips exist" and "this slug doesn't match any
 * trip" — the caller (app/(marketing)/trips/[slug]/page.tsx) treats either as
 * a real 404 via `notFound()`, rather than inventing a "coming soon" page for
 * a URL that was never valid.
 *
 * Future implementation: select one trip_departure by slug, joined to its
 * trip, itinerary and media — docs/DATABASE.md §3.
 */
export async function getTripBySlug(slug: string): Promise<ContentState<TripDetail>> {
  const trip = DEV_TRIP_DETAILS[slug];
  if (!trip) return { status: 'empty' };
  return { status: 'ready', data: trip };
}

/** Featured creator-led experiences. Empty until verified creator records exist. */
export async function getCreatorExperiences(): Promise<ContentState<CreatorExperience[]>> {
  const creators = DEV_CREATOR_EXPERIENCES;
  if (creators.length === 0) return { status: 'empty' };
  return { status: 'ready', data: creators };
}

/** Verified traveller stories. Empty until real, verified stories exist. */
export async function getTravellerStories(): Promise<ContentState<TravellerStory[]>> {
  const stories = DEV_TRAVELLER_STORIES;
  if (stories.length === 0) return { status: 'empty' };
  return { status: 'ready', data: stories };
}

/**
 * Aggregate, privacy-respecting community signals for "Meet your people".
 * `null` today because no real aggregation exists — never backfilled with an
 * invented number.
 */
export async function getCommunitySnapshot(): Promise<ContentState<CommunitySnapshot>> {
  if (!DEV_COMMUNITY_SNAPSHOT) return { status: 'empty' };
  return { status: 'ready', data: DEV_COMMUNITY_SNAPSHOT };
}
