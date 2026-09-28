/**
 * Real WWS trip content — Phase 4.4A, captured directly from the live WWS
 * website, not paraphrased or shortened. See
 * lib/content/ingest/sources/thailand-full-moon-party.ts's header for the
 * shared reasoning (ingestDraftTripContent, departure data seeded
 * separately) — this file follows the identical pattern.
 *
 * Source: https://wander-with-stars.fripo.in/trips/c3e9c5cf-61a4-49a9-95fb-29e2e1820793
 * (packageItineraryId e14a6dff-681b-44f9-a26c-275abcc0854b), captured
 * 2026-09-28. Full capture: docs/source-material/wws-live/.
 *
 * This is also the real content behind the previously-fabricated
 * "Sample Community Trip — Bali" placeholder in lib/content/fixtures.ts —
 * that file stays fixture-only (its own header: "NOT REAL WWS DATA"), not
 * edited by this phase; this file is the real, database-bound replacement,
 * consistent with "do NOT bypass the existing architecture" and "do not
 * create a second parallel trip content model."
 */

import { ingestDraftTripContent } from '..';
import type { ContentRecord, DraftTripDetail, RawTripInput } from '../types';

export const BALI_NEW_YEAR_SPECIAL_RAW: RawTripInput = {
  id: 'bali-new-year-special',
  title: 'BALI New Year Special 8N/9D with Gili T & Nusa Penida',
  slug: 'bali-new-year-special',

  // The actual stops the itinerary visits, matching Vietnam/Thailand's own
  // destination-naming convention (not just the country name).
  destination: 'Ubud, Gili Trawangan & Seminyak/Kuta',
  country: 'Indonesia',

  // Source: "9 days" (8N/9D is in the title itself) — 8 nights.
  durationNights: 8,

  overview:
    'Welcome 2027 in true island style! Explore the tropical magic of Bali, Gili T & Nusa Penida, ' +
    'meet like-minded travellers, chase breathtaking sunsets, experience iconic adventures and ' +
    'celebrate New Year surrounded by your new travel tribe. ✨🏝️🥂',

  // "What's included" — every bullet transcribed, in source order.
  inclusions: [
    'Accommodation: 3 & 4 Star Hotels (Twin Sharing)- 2N Ubud, 2N Gili, 4N Seminyak/Kuta.',
    'Meals: Daily Breakfast + 2 Lunch',
    'Airport Pick Up & Drop at Bali',
    '60 Minutes ATV Ride',
    'Cretya Club Entry',
    'Bali Swing Tickets',
    'Round trip Speed Boat Transfer to Gili T',
    'Uluwatu Temple Entry',
    'Kecak Dance Entry Tickets',
    'One Way Transfer to Finns Beach Club (Entry Excluded)',
    'Nusa Penida West Full Day Tour with Kellingking Beach',
    'AC Van or Bus Transfers',
    'Trip Captain',
    'Tanah Lot Temple',
    'Snorkelling at Gili T',
    'Speed Boat Transfer to Nusa Penida',
  ],

  // "What's not included" — every bullet transcribed, in source order.
  exclusions: [
    'Round Trip International Flights',
    'Visa Charges (Approx $40)',
    'Cidomo Transfer in Gilli T',
    'Harbour Tax for Speed Boat Transfers',
    'Bali Tourist Tax',
    '5% GST & 2% TCS',
    'Finns Club Entry Charges',
    'Taxis & Transport outside the Itinerary',
    'Travel Insurance (Recommended).',
    'Meals not mentioned in the program.',
    'Scuba Diving Charges',
    'Any cost arising due to natural calamities like landslides, roadblocks etc. (to be borne directly by the customer on the spot)',
    'Cost arises due to change or delay in flight timings.',
    'Single supplement, early check-in, and late check-out.',
    'Hotel/room upgrade charges',
    'Personal Expenses (Shopping, alcohol, optional activities etc.)',
  ],

  // No WWS photography for this trip in this repository — see
  // docs/source-material/wws-live/README.md.
  heroMedia: { kind: 'placeholder' },
  gallery: [],

  // No genuine style-signal source on the page beyond marketing tone.
  styleScores: {},

  // "Experience Breakdown" — day titles preserved exactly as rendered,
  // including their "| <date>" suffix (the source's own formatting, not
  // added here). Bullet lines (and each day's trailing "Overnight Stay" /
  // "Meals" / "Note" line, where present) are joined into one paragraph
  // per day, matching TripItineraryDay's single-string `summary` field.
  itineraryPreview: [
    {
      day: 1,
      title: 'Arrival in Bali and Transfer to Ubud | 26 Dec',
      summary:
        'Arrival in Bali: Meet our Trip Captain at the airport. ' +
        "Transfer to Ubud: Drive through Bali's beautiful countryside. " +
        'Explore Ubud: Enjoy the greenery, rice fields and peaceful surroundings. ' +
        'Hotel Check-In: Check in and relax after your flight. ' +
        'Free Time: Explore nearby cafés, walk around or spend time with the group. ' +
        'Evening at Leisure: Enjoy a relaxed evening and your first Bali sunset. ' +
        'Overnight Stay: Ubud.',
    },
    {
      day: 2,
      title: 'UBUD Adventure: ATV Rides, Bali Swing and Cretya Club | 27 Dec',
      summary:
        'Breakfast: Start your day with breakfast at the hotel. ' +
        'ATV Ride: Enjoy an exciting ATV ride through jungle trails, muddy tracks and forest paths. ' +
        "Adventure Time: Experience the thrill of riding through Bali's natural surroundings. " +
        'Cretya Ubud: Relax by the pool and enjoy views of the famous rice terraces. ' +
        "Bali Swing: Experience the famous swing over Bali's green valleys. " +
        'Evening at Leisure: Return to the hotel and relax after a fun-filled day. ' +
        'Overnight Stay: Ubud. Meals: Breakfast and Lunch.',
    },
    {
      day: 3,
      title: 'Transfer from Ubud to Gili T in Speed Boat | 28 Dec',
      summary:
        'Breakfast: Start the day with breakfast at the hotel. ' +
        'Check-Out: Check out from your Ubud hotel and head towards the harbor. ' +
        'Speedboat to Gili Trawangan: Enjoy a scenic speedboat ride to the tropical island. ' +
        'Island Check-In: Arrive, check into your hotel and relax by the beach. ' +
        'Explore Gili T: Walk around the island, explore beach cafés or enjoy the laid-back atmosphere. ' +
        'Island Evening: Watch the sunset and spend a relaxed evening with your group. ' +
        'Overnight Stay: Gili Trawangan. Meals: Breakfast.',
    },
    {
      day: 4,
      title: 'Gili Island: Snorkeling, Sunset & Night Party | 29 Dec',
      summary:
        'Breakfast: Start your day with a relaxed breakfast at the hotel. ' +
        'Snorkeling: Explore the clear waters around Gili T and discover vibrant marine life. ' +
        'Beach Time: Relax, swim and enjoy the beautiful island surroundings. ' +
        'Sunset: Watch the stunning sunset over the ocean. ' +
        'Island Evening: Enjoy dinner, beach cafés and the lively Gili T atmosphere. ' +
        "Gili T Nightlife: Party the night away with your group at the island's popular night spots. " +
        'Overnight Stay: Gili Trawangan. Meals: Breakfast. ' +
        'Note: Scuba Diving is optional and chargeable extra.',
    },
    {
      day: 5,
      title: 'Gili T to Bali & Finns Beach Club Experience | 30 Dec',
      summary:
        'Breakfast: Enjoy breakfast at the hotel before checking out from Gili T. ' +
        'Speedboat to Bali: Take a scenic speedboat ride back to Bali. ' +
        'Arrival in Bali: Continue towards Seminyak / Kuta with a comfortable transfer. ' +
        'Hotel Check-In: Check in, freshen up and take some time to relax. ' +
        'Finns Beach Club Experience: Head to Finns Beach Club and enjoy the beachside setting, music, pools and lively atmosphere. ' +
        'Sunset & Good Vibes: Spend the afternoon soaking up the tropical views and enjoy the beautiful Bali sunset with your group. ' +
        'Evening in Seminyak / Kuta: Return after Finns and enjoy the vibrant cafés, restaurants and nightlife at your own pace. ' +
        'Overnight Stay: Seminyak / Kuta. Meals: Breakfast. ' +
        'Note: Finns Beach Club entry charges are not included. Entry is generally free on regular days, ' +
        'but special charges may apply during the New Year period.',
    },
    {
      day: 6,
      title: "Bali Leisure Day & New Year's Eve | 31 Dec",
      summary:
        'Breakfast: Start your day with breakfast at the hotel. ' +
        'Morning at Leisure: Enjoy free time to relax, explore Seminyak / Kuta / Canggu, visit cafés, shop or spend time at the beach. ' +
        'Get Ready for NYE: Return to the hotel, freshen up and get ready for the biggest night of the trip. ' +
        "New Year's Eve Experience: Head out with your group and experience Bali's exciting New Year's Eve celebrations. " +
        'Party Across Bali: Choose from different clubs, beach parties and NYE events around Seminyak / Kuta. ' +
        'Countdown to 2027: Celebrate midnight, dance with your travel tribe and welcome the New Year in true Bali style. ' +
        'Overnight Stay: Seminyak / Kuta. Meals: Breakfast. ' +
        "Note: New Year's Eve entry charges apply at clubs and events and are not included in the package. " +
        "Charges may vary depending on the venue and New Year's Eve event.",
    },
    {
      day: 7,
      title: 'Welcome 2027, Tanah Lot, Uluwatu Sunset & Kecak Dance | 1 Jan',
      summary:
        'Welcome 2027: Wake up to the first morning of the New Year after an unforgettable night of celebrations. ' +
        'Relax & Recharge: Enjoy a slow morning at the hotel with your group. ' +
        'Free Afternoon: Take some time to relax, explore nearby places or enjoy the hotel. ' +
        "Tanah Lot Temple: Visit one of Bali's most iconic temples and enjoy the beautiful coastal views. " +
        'Uluwatu Sunset: Head to the famous Uluwatu Temple and watch the sunset from the dramatic cliffs overlooking the ocean. ' +
        'Kecak Dance: Experience the traditional Kecak Dance with the stunning Uluwatu sunset as your backdrop. ' +
        'Return to Hotel: Head back to Seminyak / Kuta after an evening filled with culture and breathtaking views. ' +
        'Overnight Stay: Seminyak / Kuta. Meals: Breakfast.',
    },
    {
      day: 8,
      title: 'Nusa Penida West Day Tour & Island Adventure | 2 Jan',
      summary:
        'Breakfast: Start your day with breakfast at the hotel. ' +
        'Transfer to Nusa Penida: Head to the harbor and take a speedboat to Nusa Penida. ' +
        'West Island Tour: Explore the stunning western side of Nusa Penida and its famous viewpoints. ' +
        "Island Highlights: Visit iconic spots such as Kelingking Beach, Broken Beach and Angel's Billabong. " +
        'Lunch: Enjoy lunch during the island tour. ' +
        'Scenic Views: Take in the dramatic cliffs, turquoise waters and beautiful coastal landscapes. ' +
        'Return to Bali: Take the speedboat back to Bali and return to your hotel. ' +
        'Overnight Stay: Seminyak / Kuta. Meals: Breakfast and Lunch.',
    },
    {
      day: 9,
      title: 'Goodbye Bali, New Year Memories & Return to India | 3 Jan',
      summary:
        'Breakfast: Enjoy your final breakfast at the hotel. ' +
        'Last Morning in Bali: Take some time to relax, pack your bags and enjoy your last moments with the group. ' +
        'Happy New Year Memories: Look back on the adventures, celebrations, island experiences and friendships made throughout the trip. ' +
        'Group Memories: Capture your final pictures and say goodbye to your new travel tribe. ' +
        'Airport Transfer: Transfer to the airport for your return journey to India. ' +
        'Fly Back Home: Depart Bali with a heart full of memories and stories to share. ' +
        'Meals: Breakfast. Trip Ends: Bali Airport.',
    },
  ],

  // No "Know Before You Go"-style notes section on this trip's live page.
  // No FAQ, and "Cancellation Policy"/"Terms and Conditions" are out of
  // scope for this content-ingestion record — see this file's own header
  // and docs/source-material/wws-live/raw/bali-new-year-special.txt, which
  // also documents this page's own Terms & Conditions copy-paste error
  // (referring to "Vietnam"/"Vietnamese" throughout a Bali trip page) —
  // preserved there verbatim, not corrected, and not carried into this
  // record since no `policy` field is populated here at all.
};

export const BALI_NEW_YEAR_SPECIAL_INGEST = ingestDraftTripContent(BALI_NEW_YEAR_SPECIAL_RAW);

export const BALI_NEW_YEAR_SPECIAL_RECORD: ContentRecord<DraftTripDetail> | undefined =
  BALI_NEW_YEAR_SPECIAL_INGEST.ok
    ? {
        ...BALI_NEW_YEAR_SPECIAL_INGEST.record,
        reviewNotes:
          'Phase 4.4A capture from the live WWS website ' +
          '(https://wander-with-stars.fripo.in/trips/c3e9c5cf-61a4-49a9-95fb-29e2e1820793). ' +
          'Content transcribed verbatim. Real commercial data exists for this trip (one departure: ' +
          'Dec 26 2026 – Jan 3 2027, ₹68,999) and is seeded directly into trip_departures by ' +
          'scripts/seed-live-catalogue.ts, not embedded in this content record. Not publishable ' +
          'until a human reviews and approves it for publication.',
      }
    : undefined;
