/**
 * ⚠️  DEVELOPMENT FIXTURES — NOT REAL WWS DATA.
 *
 * Every value in this file is invented for visual review, not sourced from
 * the business. Names, destinations, dates and prices are placeholders.
 * `heroMedia` is always `{ kind: 'placeholder' }` — never a stock photo
 * standing in for real WWS photography (see lib/content/types.ts).
 *
 * This file is imported ONLY by lib/content/queries.ts. No UI component
 * imports it directly, so replacing it with real Supabase queries later is a
 * change to one file, not a hunt through components.
 *
 * When the Trip/Departure/Media schema exists (docs/ROADMAP.md Phase 5),
 * delete this file's contents and implement queries.ts against Supabase.
 */

import type {
  CommunitySnapshot,
  CreatorExperience,
  TravellerStory,
  TripDetail,
  TripPreview,
} from './types';

export const DEV_UPCOMING_TRIPS: TripPreview[] = [
  {
    id: 'dev-trip-1',
    slug: 'sample-northern-vietnam',
    title: 'Sample Community Trip — Northern Vietnam',
    destination: 'Hanoi & Ha Long Bay',
    country: 'Vietnam',
    departureDate: '2026-11-14',
    durationNights: 6,
    price: { amount: 68000, currency: 'INR' },
    availability: { status: 'open', spotsLeft: 8 },
    host: { name: 'Development Host' },
    heroMedia: { kind: 'placeholder' },
    styleScores: { adventure: 70, social: 85, culture: 60 },
    travellerCount: 14,
  },
  {
    id: 'dev-trip-2',
    slug: 'sample-bali-community',
    title: 'Sample Community Trip — Bali',
    destination: 'Ubud & Canggu',
    country: 'Indonesia',
    departureDate: '2026-12-05',
    durationNights: 5,
    price: { amount: 54000, currency: 'INR' },
    availability: { status: 'almost-full', spotsLeft: 3 },
    host: { name: 'Development Host' },
    heroMedia: { kind: 'placeholder' },
    styleScores: { relaxation: 75, social: 65, culture: 55 },
    travellerCount: 19,
  },
  {
    id: 'dev-trip-3',
    slug: 'sample-georgia-adventure',
    title: 'Sample Community Trip — Georgia',
    destination: 'Tbilisi & Kazbegi',
    country: 'Georgia',
    departureDate: '2027-01-18',
    durationNights: 7,
    price: { amount: 79000, currency: 'INR' },
    availability: { status: 'open' },
    host: { name: 'Development Host' },
    heroMedia: { kind: 'placeholder' },
    styleScores: { adventure: 90, social: 60 },
    travellerCount: 9,
  },
];

/**
 * Detail-page content for each fixture trip, keyed by slug.
 *
 * `overview`, `inclusions`, `exclusions` and `itineraryPreview` are invented
 * for review, same as the trips above — never presented as a real WWS
 * itinerary. The detail page labels this explicitly ("Sample itinerary").
 */
export const DEV_TRIP_DETAILS: Record<string, TripDetail> = Object.fromEntries(
  DEV_UPCOMING_TRIPS.map((trip): [string, TripDetail] => [
    trip.slug,
    {
      ...trip,
      overview:
        'A development preview of a trip detail page. Real overview copy, written per departure, replaces this once trip content is ingested.',
      inclusions: [
        'Accommodation for the trip duration',
        'A dedicated WWS host',
        'Group activities as listed in the itinerary',
      ],
      exclusions: ['International flights', 'Travel insurance', 'Personal expenses'],
      gallery: [{ kind: 'placeholder' }, { kind: 'placeholder' }, { kind: 'placeholder' }],
      itineraryPreview: [
        {
          day: 1,
          title: 'Arrival & welcome',
          summary: 'Group arrives, checks in, and meets the host over dinner.',
        },
        {
          day: 2,
          title: 'Explore the destination',
          summary: 'Full-day group activity — the specific plan depends on the departure.',
        },
        {
          day: 3,
          title: 'Free time & optional activities',
          summary: 'Space to explore independently, with optional group add-ons.',
        },
      ],
    },
  ]),
);

/**
 * Deliberately empty. Real, verified creator records do not exist yet, and
 * inventing plausible-looking creators would misrepresent the business — see
 * docs/PRODUCT_REQUIREMENTS.md §9 and CLAUDE.md's rule against fabricated
 * data. The section this feeds renders its EmptyState with this array.
 */
export const DEV_CREATOR_EXPERIENCES: CreatorExperience[] = [];

/**
 * Deliberately empty — see DEV_CREATOR_EXPERIENCES above. No verified
 * traveller stories exist yet.
 */
export const DEV_TRAVELLER_STORIES: TravellerStory[] = [];

/**
 * Deliberately absent. Real aggregate departure data does not exist yet, and
 * a specific number here would be indistinguishable from a real metric — the
 * one place in this file where even a labelled fixture is not safe, because
 * "23 travellers joining" reads as a claim regardless of a nearby caption.
 * The section this feeds renders an honest empty state instead.
 */
export const DEV_COMMUNITY_SNAPSHOT: CommunitySnapshot | null = null;
