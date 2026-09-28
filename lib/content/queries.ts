/**
 * Content access — the seam between UI and data source.
 *
 * Every homepage section imports from HERE, never from fixtures.ts or
 * lib/content/db/ directly. `getUpcomingTrips` and `getTripBySlug` read from
 * fixtures by default, or from Supabase/Postgres when `CONTENT_SOURCE=database`
 * (./db/source.ts — see that file for why fixtures stay the default for now)
 * — either way, the signature and the `ContentState` wrapper stay the same,
 * so no component ever knows which source answered it. `getCreatorExperiences`,
 * `getTravellerStories` and `getCommunitySnapshot` stay fixture-backed
 * unconditionally: no database table exists yet for any of them (out of
 * scope for Phase 4.1's schema).
 */

import { mapTripDetail, mapTripPreview, selectPresentableDeparture } from './db/map';
import { CONTENT_SOURCE } from './db/source';
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

/** Generic, non-leaking message for a genuine query/database failure — see docs/SECURITY.md §2/§6. */
const TRIPS_UNAVAILABLE_MESSAGE = 'Trips could not be loaded right now.';

async function getUpcomingTripsFromDatabase(): Promise<ContentState<TripPreview[]>> {
  let rows;
  try {
    // Dynamic, not a top-level import: `./db/repository` imports `server-only`
    // (via itself and `lib/supabase/server.ts`), which throws unconditionally
    // outside Next's build — a top-level import would break every test and
    // every fixture-mode render that imports this module, even ones that
    // never take this branch. Deferring the import to here means it only
    // ever loads when a database query is actually about to run.
    const { fetchTripPreviewRows } = await import('./db/repository');
    rows = await fetchTripPreviewRows();
  } catch (error) {
    console.error('getUpcomingTrips: database query failed', error);
    return { status: 'error', message: TRIPS_UNAVAILABLE_MESSAGE };
  }

  const trips = rows
    .map((trip) => {
      const departure = selectPresentableDeparture(trip.trip_departures);
      return departure ? mapTripPreview(trip, departure) : null;
    })
    .filter((trip): trip is TripPreview => trip !== null);

  if (trips.length === 0) return { status: 'empty' };
  return { status: 'ready', data: trips };
}

/**
 * Upcoming trip departures for the homepage and /trips/all — the presentable
 * (booking-open/almost-full/sold-out) departure of every publicly visible
 * trip, one card per trip. See ./db/map.ts's `selectPresentableDeparture`
 * for exactly what "presentable" excludes (draft/announced/in-progress/
 * completed departures, and trips with no departure at all).
 */
export async function getUpcomingTrips(): Promise<ContentState<TripPreview[]>> {
  if (CONTENT_SOURCE === 'fixtures') {
    const trips = DEV_UPCOMING_TRIPS;
    if (trips.length === 0) return { status: 'empty' };
    return { status: 'ready', data: trips };
  }
  return getUpcomingTripsFromDatabase();
}

async function getTripBySlugFromDatabase(slug: string): Promise<ContentState<TripDetail>> {
  let row;
  try {
    // See the matching comment in getUpcomingTripsFromDatabase above.
    const { fetchTripDetailRowBySlug } = await import('./db/repository');
    row = await fetchTripDetailRowBySlug(slug);
  } catch (error) {
    console.error(`getTripBySlug(${slug}): database query failed`, error);
    return { status: 'error', message: TRIPS_UNAVAILABLE_MESSAGE };
  }

  if (!row) return { status: 'empty' };

  const departure = selectPresentableDeparture(row.trip_departures);
  // A published trip with no presentable departure yet has nothing to show
  // as a detail page's commercial/logistics data — not broken content, just
  // not ready. Same public outcome as a slug that doesn't exist: a 404, not
  // a page half-rendered around missing price/availability/host fields
  // `TripDetail` requires.
  if (!departure) return { status: 'empty' };

  return { status: 'ready', data: mapTripDetail(row, departure) };
}

/**
 * A single trip's detail content by slug.
 *
 * `'empty'` covers "no trips exist", "this slug doesn't match any trip",
 * "the trip isn't publicly visible" (RLS-hidden: draft/review/approved/
 * archived) and "the trip is published but has no bookable departure yet" —
 * the caller (app/(marketing)/trips/[slug]/page.tsx) treats all of these as
 * a real 404 via `notFound()`, rather than inventing a "coming soon" page
 * for a URL that was never valid.
 */
export async function getTripBySlug(slug: string): Promise<ContentState<TripDetail>> {
  if (CONTENT_SOURCE === 'fixtures') {
    const trip = DEV_TRIP_DETAILS[slug];
    if (!trip) return { status: 'empty' };
    return { status: 'ready', data: trip };
  }
  return getTripBySlugFromDatabase(slug);
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
