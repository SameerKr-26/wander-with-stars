/**
 * Real WWS trip content — Phase 4.4A, captured directly from the live WWS
 * website (the primary source of truth for trip data, per that phase's
 * instructions), not paraphrased or shortened.
 *
 * Source: https://wander-with-stars.fripo.in/trips/1e2c9ce6-db92-4140-bd85-5477e38c0b08
 * (one of three departure pages sharing packageItineraryId
 * cf2ab2c3-b5f1-4ee3-8b76-17a4386deb48 — content verified identical across
 * all three, only date/price differ), captured 2026-09-28 via read-only
 * Playwright navigation. Full capture: docs/source-material/wws-live/.
 *
 * Ingested through `ingestDraftTripContent`/`draftTripDetailSchema`, the
 * same path the existing Vietnam source uses — not because this trip lacks
 * commercial facts (the live site has real prices and three real departure
 * dates for it), but because the CONTENT this file carries is
 * departure-independent (title, overview, itinerary, inclusions,
 * exclusions), and `tripPreviewSchema`'s single `departureDate`/`price`
 * fields have no way to represent three distinct departures at once. Real
 * departure rows (one per date) are seeded directly into `trip_departures`
 * by `scripts/seed-live-catalogue.ts`, matching Phase 4.1's own trip/
 * departure separation rather than forcing this schema to model
 * departures it was never built for. See that script's header for the
 * full reasoning.
 */

import { ingestDraftTripContent } from '..';
import type { ContentRecord, DraftTripDetail, RawTripInput } from '../types';

/**
 * Field-named raw payload, transcribed verbatim from the live page — see
 * docs/source-material/wws-live/raw/thailand-full-moon-party.txt for the
 * full captured text this maps from.
 */
export const THAILAND_FULL_MOON_PARTY_RAW: RawTripInput = {
  id: 'thailand-full-moon-party',
  title: 'Thailand Full Moon Party',
  slug: 'thailand-full-moon-party',

  // The source card/page destination is just "Thailand"; the three actual
  // stops (matching Vietnam's own destination-naming convention) are named
  // here instead, each of which the itinerary below visits by name.
  destination: 'Phuket, Krabi & Koh Phangan',
  country: 'Thailand',

  // Source: "7 days" — no explicit night count, so nights = days − 1,
  // matching every other trip's own convention (7 days here too, 6 nights).
  durationNights: 6,

  overview:
    'Embark on a week-long journey through Thailand, starting with your arrival in Phuket and a scenic transfer to Krabi. Enjoy beach walks, thrilling island tours, and fabulous nightlife experiences including the famous Full Moon Party. Relax on stunning beaches, savor local cuisines, and create lasting memories during this exhilarating trip.',

  // "What's included" — every bullet transcribed, in source order.
  inclusions: [
    'Accommodation: 3 & 4 Star Premium Hotels (Twin Sharing)',
    'Meals: Daily Breakfast + 1 Lunch + 1 Dinner',
    'Airport pick-up and drop transfers.',
    "Krabi's 7 Island Sunset tour with Long Tail Boat.",
    'Overnight Full-Moon Party at Koh Phangan.',
    'Fire show on the beach.',
    'Full Day Phi Phi Island Tour from Speed Boat',
    'Trip Captain.',
    'Transfers to Koh Phangan Full Moon Party',
    'Ferry Transfer from Krabi to Koh Samui and Koh Samui to Phuket',
    'All transportation by A/C Vehicles',
    'Assistance: Full Pre & Post-Trip Assistance',
    'Phuket Old Town Tour',
  ],

  // "What's not included" — every bullet transcribed, in source order.
  exclusions: [
    'International Flights & Visa',
    'Personal Expenses (Shopping, alcohol, optional activities)',
    'Taxis & Transport outside the Itinerary',
    'Tours and Transfers not included in the package.',
    'Meals not mentioned in the program.',
    'Any International Flight and Airport Tax.',
    'Single supplement, early check-in, and late check-out.',
    'Hotel/room upgrade.',
    'Drinks, personal expenses, and any services not clearly mentioned in the program.',
    'Any cost arising due to natural calamities like landslides, roadblocks etc. (to be borne directly by the customer on the spot) or due to changes in government regulations.',
    'Cost arises due to change or delay in flight timings.',
    'National park fees of 7 Island Tour and Phi Phi Island are not included in the package. Customers will have to pay 200THB and THB 400 per person on the spot.',
    'Koh Phangan Full Moon Party Entry THB 240 Per Person',
    '5% GST and 2% TCS',
  ],

  // No WWS photography for this trip in this repository — the source
  // page's own gallery is not cleared for reuse (copyrighted source
  // imagery, out of scope — see docs/source-material/wws-live/README.md).
  heroMedia: { kind: 'placeholder' },
  gallery: [],

  // No genuine style-signal source on the page beyond marketing tone —
  // left empty rather than guessed, same convention as the Vietnam source.
  styleScores: {},

  // "Experience Breakdown" — one entry per day, title and summary
  // transcribed verbatim (bullet lines joined into one paragraph per day,
  // since TripItineraryDay has a single `summary` string, not a list —
  // wording, order and a source typo ("Tranfer", Day 2) preserved exactly,
  // not corrected, per this project's established source-fidelity rule).
  itineraryPreview: [
    {
      day: 1,
      title: 'Fly to Phuket and Phuket Old Town Tour',
      summary:
        'Fly to Phuket and arrive at the airport to begin your Thailand journey. ' +
        'Meet our Trip Captain at Phuket Airport for introductions and trip briefing. ' +
        'Transfer from Phuket to Phuket Hotel. ' +
        'Check-in at the hotel in Phuket, settle into your rooms, and take some time to relax. ' +
        'Visit Phuket Old Town. ' +
        'End the day by Partying at Bangla Walking Street. ' +
        'Overnight Stay in Phuket.',
    },
    {
      day: 2,
      title: '7 Island Sunset Tour Krabi with Long Tail Boat Ride and Dinner',
      summary:
        'Wake up and enjoy breakfast at the hotel. ' +
        'Tranfer from Phuket Hotel to Krabi Hotel. ' +
        'Get ready and head to the pier for the 7 Island Sunset Tour. ' +
        'Visit beautiful islands including Chicken Island, Tup Island, and Poda Island. ' +
        'Enjoy swimming, snorkeling, beach time, and sunset views in the Andaman Sea. ' +
        'Savor a beachside BBQ dinner under the stars. ' +
        'Optional: Experience glowing bioluminescent plankton at night. ' +
        'Return to the hotel with unforgettable island memories. ' +
        'Overnight Stay in Krabi.',
    },
    {
      day: 3,
      title: 'Scenic Transfer to Koh Samui & Unforgettable Full Moon Party Night at Koh Phangan',
      summary:
        'Enjoy breakfast at the hotel and prepare for your transfer to the port. ' +
        'Upon arrival, board your ferry heading towards Koh Samui. ' +
        'Arrive in Koh Samui after a scenic ferry ride and transfer to your hotel. ' +
        'Complete the check-in process and take some time to freshen up. ' +
        'Later in the evening, get ready for the iconic Full Moon Party experience. ' +
        'Board your fixed-time transfer and ferry to Koh Phangan. ' +
        'Arrive at Koh Phangan and enjoy the vibrant Full Moon Party under the bright moonlight. ' +
        'Overnight celebration at the Full Moon Party in Koh Phangan.',
    },
    {
      day: 4,
      title: 'Relaxed Morning in Koh Samui with Evening Fire Show & Beach Club Night',
      summary:
        'After the Full Moon Party in Koh Phangan, board your return ferry and coach to reach Koh Samui. ' +
        'Arrive at the hotel and enjoy breakfast to recharge after the celebrations. ' +
        'Spend the afternoon at leisure, either relaxing at the hotel or exploring nearby areas. ' +
        'In the evening, transfer to the beach to watch an exciting fire show. ' +
        'Enjoy the performance, sip your favorite drinks, and spend the night at a lively beach club. ' +
        'Return to the hotel on your own at your convenience. ' +
        'Overnight stay in Koh Samui.',
    },
    {
      day: 5,
      title: 'Transfer to Phuket with Sunset at Patong Beach & Bangla Walking Street Nightlife',
      summary:
        'Wake up, have breakfast, and get ready for the day. ' +
        'Transfer to Phuket via ferry and van transfers. ' +
        'Reach Phuket by evening and check in to the hotel. ' +
        'Relax for some time and freshen up before heading out. ' +
        'Visit Patong Beach and enjoy the beach vibes, cafés, and market area. ' +
        'At night, head to the famous Bangla Walking Street for clubbing, parties, music, and unforgettable nightlife. ' +
        'Overnight Stay in Phuket.',
    },
    {
      day: 6,
      title: 'Phi Phi Island Tour by Speed Boat and Local lunch followed by departure',
      summary:
        'Wake up to a tropical morning and enjoy breakfast at the hotel. ' +
        'After breakfast, transfer to the pier for your speedboat tour to the Phi Phi Islands. ' +
        'Board the speedboat around 9 AM and begin your island exploration across the Andaman Sea. ' +
        'Cruise through turquoise waters surrounded by scenic limestone cliffs. ' +
        'Visit famous spots including Maya Bay (if Opened), known for its stunning beach and clear waters. ' +
        'Continue to Ton Sai Bay and take a short walk at Monkey Beach. ' +
        'Stop at Phi Phi Don to enjoy lunch at a restaurant. ' +
        'After lunch, relax and swim in the crystal-clear waters. ' +
        'Later, head to Koh Khai Nok for leisure time and optional snorkeling. ' +
        'By evening, return to Phuket and party at Bangla Walking Street. ' +
        'Overnight Stay in Phuket.',
    },
    {
      day: 7,
      title: 'Breakfast and Departure back to India with Airport drop',
      summary:
        'Enjoy your final breakfast at the hotel and take some time to pack your bags. ' +
        'Spend your last few moments with the group - the same people who started as strangers ' +
        'and are now friends with shared memories. ' +
        'Board your transfer to Phuket Airport for your onward journey. ' +
        'Say your goodbyes, exchange contacts, and promise to meet again on another adventure. ' +
        'Your incredible Thailand trip comes to an end as you are dropped at the airport. ' +
        'Head home with unforgettable experiences, countless pictures, and memories that will stay with you for a lifetime.',
    },
  ],

  // No "Know Before You Go"-style notes section on this trip's live page
  // (unlike Vietnam's) — left absent rather than invented.

  // No FAQ or per-trip policy section beyond "Cancellation Policy" and
  // "Terms and Conditions" (a 20-clause boilerplate legal document shared
  // in structure with the other two trips, Thailand-specific in its
  // details — age range 18-33, "Thai laws") appear on the source page;
  // out of scope for this content-ingestion record, same as the Vietnam
  // source (no `policy` field populated here either). See
  // docs/source-material/wws-live/raw/thailand-full-moon-party.txt for the
  // full preserved text.
};

/**
 * The Phase 4.4A ingest result: `draftTripDetailSchema` validation of
 * `THAILAND_FULL_MOON_PARTY_RAW` above. Expected to succeed with
 * `ok: true` and `record.status === 'draft'` — this file deliberately
 * omits the commercial fields that schema makes optional (real departure
 * data lives in `trip_departures`, not here — see this file's own header).
 */
export const THAILAND_FULL_MOON_PARTY_INGEST = ingestDraftTripContent(THAILAND_FULL_MOON_PARTY_RAW);

export const THAILAND_FULL_MOON_PARTY_RECORD: ContentRecord<DraftTripDetail> | undefined =
  THAILAND_FULL_MOON_PARTY_INGEST.ok
    ? {
        ...THAILAND_FULL_MOON_PARTY_INGEST.record,
        reviewNotes:
          'Phase 4.4A capture from the live WWS website ' +
          '(https://wander-with-stars.fripo.in/trips/1e2c9ce6-db92-4140-bd85-5477e38c0b08). ' +
          'Content transcribed verbatim, including a source typo ("Tranfer", Day 2) preserved ' +
          'rather than corrected. Real commercial data exists for this trip (three departures: ' +
          'Oct 25 ₹49,999, Nov 22 ₹59,999, Dec 22 ₹64,999) and is seeded directly into ' +
          'trip_departures by scripts/seed-live-catalogue.ts, not embedded in this content record. ' +
          'Not publishable until a human reviews and approves it for publication.',
      }
    : undefined;
