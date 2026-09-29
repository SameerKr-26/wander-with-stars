/**
 * Departure-option derivation — Phase 4.4C.
 *
 * Pure, no React, no Supabase — exactly like lib/content/format.ts and
 * lib/content/filters.ts, so components and tests can use it without
 * mounting anything.
 */
import type { TripDetail, TripDepartureOption } from './types';

/**
 * Every selectable public departure for a trip detail page, soonest first.
 *
 * `trip.departures` (`lib/content/db/map.ts`, database mode only) is the
 * real, ordered list when the content layer built one. Every fixture, and
 * any real trip mapped before Phase 4.4C's `departures` field existed, has
 * no such array — in that case this derives the one option that already
 * exists as `TripDetail`'s own top-level `departureDate`/`price`/
 * `availability`/`id` fields. That is reusing data already on the record
 * under a different shape, not inventing a second departure: a trip with
 * one real departure gets exactly one option either way.
 */
export function getDepartureOptions(trip: TripDetail): TripDepartureOption[] {
  if (trip.departures && trip.departures.length > 0) return trip.departures;
  return [
    {
      id: trip.id,
      departureDate: trip.departureDate,
      price: trip.price,
      availability: trip.availability,
    },
  ];
}
