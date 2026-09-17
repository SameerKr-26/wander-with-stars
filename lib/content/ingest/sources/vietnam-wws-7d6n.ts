/**
 * Real WWS trip content — Phase 3.7, the first non-fixture content this
 * pipeline has ingested.
 *
 * Source: `docs/source-material/vietnam/Vietnam X WWS 7D6N  (1).pdf`, the
 * WWS-authored Vietnam brochure PDF (9 pages, read in full before this file
 * was written). Every field below is transcribed from that PDF — nothing is
 * invented, corrected, modernised or fact-checked-and-replaced. Where the
 * source itself is inconsistent, incomplete, or contains what looks like an
 * authoring artifact, that is preserved and called out in a comment rather
 * than silently fixed. See docs/ARCHITECTURE.md §14 for the full
 * page -> field mapping table this file implements.
 *
 * Deliberately NOT run through `ingestTripContent`/`tripDetailSchema`: the
 * PDF supplies no selling price, no confirmed departure date, no
 * availability count, and no named host/creator. Inventing any of those to
 * satisfy that schema is exactly what this phase's instructions forbid.
 * This is ingested through `ingestDraftTripContent`/`draftTripDetailSchema`
 * instead, which accepts exactly that gap and always returns `status:
 * 'draft'` — never `'published'`, never visible to
 * `lib/content/queries.ts`. The record cannot become publishable until a
 * human supplies those four fields and it separately passes
 * `ingestTripContent`.
 */

import { ingestDraftTripContent } from '..';
import type { ContentRecord, DraftTripDetail, RawTripInput } from '../types';

/**
 * Field-named raw payload — see docs/ARCHITECTURE.md §14 for the page
 * reference behind each field. Left as `RawTripInput` (not asserted as
 * `DraftTripDetail`) so it goes through the same normalize -> validate path
 * any other source would.
 */
export const VIETNAM_WWS_7D6N_RAW: RawTripInput = {
  // Page 1 (cover): "VIETNAM" + "6N/7D". Combined rather than using either
  // alone — the bare destination name is not a usable trip title, and
  // nothing here is added that the cover doesn't already state.
  id: 'vietnam-wws-7d6n',
  title: 'Vietnam 6N/7D',
  slug: 'vietnam-6n7d',

  // Page 2's "Destination and Travel Plan": the three overnight stops.
  destination: 'Ho Chi Minh City, Da Nang & Hanoi',
  country: 'Vietnam',

  // Page 3: "Duration: 7 Days, 6 Nights".
  durationNights: 6,

  // Composed from pages 2-3 (route, team, meals, accommodation, transfers)
  // — every clause below restates a fact the source states elsewhere on
  // this same PDF; nothing here is a new claim.
  overview:
    'A 7-day, 6-night group trip across Vietnam: 1 night in Ho Chi Minh City, ' +
    '3 nights in Da Nang (including Hoi An and Ba Na Hills), and 2 nights in ' +
    'Hanoi (including Ha Long Bay), returning on Day 7 from Hanoi. Includes ' +
    'domestic flights HCMC to Da Nang and Da Nang to Hanoi, 3 & 4 star hotel ' +
    'stays on a twin-sharing basis, daily breakfast plus 2 lunches, and a ' +
    'Trip Leader with local English-speaking guides throughout.',

  // No price, departureDate, availability or host anywhere in the source —
  // left absent (not present as keys at all) rather than set to a
  // placeholder value. draftTripDetailSchema accepts their absence;
  // tripDetailSchema (the strict, publishable schema) still requires them.

  // Page 8, "Inclusions": every bullet transcribed, in source order.
  // "Activities & Tour" was a sub-heading over ten named items on the
  // source page — flattened into individual strings here since
  // `inclusions` is a flat list (matching TripDetail's own documented
  // convention), not a re-authoring of the list itself.
  inclusions: [
    'Domestic Flight from HCMC to DaNang and DaNang to Hanoi',
    'Accommodation: 3 & 4 Star Premium Hotels (Twin Sharing)',
    'Meals: Daily Breakfast + 2 Lunch',
    'Airport Pick Up & Drop at all destinations within Vietnam',
    'Visit to Cafe Apartments',
    'Bui Vien Walking Street',
    'Cu Chi Tunnel Tour',
    'Visit to Ba Na Hills & Golden Hands Bridge',
    'Coconut Basket Boat Ride',
    'Hoi An Ancient Town Heritage Walk',
    'Hoi An Lantern Boat Ride',
    'Halong Bay Cruise with Lunch',
    'Kayaking & Caving',
    'Hanoi Train Street Tour',
    'Local Taxes & Entry Fees Included',
    'Trip Leader & Expert Local English Speaking Guides',
    'Assistance: Full Pre & Post-Trip Assistance',
    'Transfers: Premium Bus or Van Transfers for Activities & Tours',
  ],

  // Page 8, "Exclusions": every bullet transcribed, in source order.
  // The visa-fee figure is a legal/pricing-sensitive claim from the
  // source, not independently verified or updated — flagged again in this
  // record's `reviewNotes` below and in the Phase 3.7 report.
  exclusions: [
    'International Flights',
    'Visa Fees (E-Visa for Indians: ₹2900)',
    'Personal Expenses (Shopping, alcohol, optional activities)',
    'Taxis & Transport outside the Itinerary',
    'Tips for Guide and Driver Extra',
    'Tours not included in the package.',
    'Meals not mentioned in the program.',
    'Any International Flight and Airport Tax.',
    'Single supplement, early check-in, and late check-out.',
    'Hotel/room upgrade.',
    'Drinks, personal expenses, and any services not clearly mentioned in the program.',
    'Any cost arising due to natural calamities like landslides, roadblocks etc. (to be borne directly by the customer on the spot)',
    'Cost arises due to change or delay in flight timings.',
    'Travel Insurance.',
  ],

  // No real WWS photography for this trip exists yet, and the PDF's own
  // images are stock/licensed for the brochure, not cleared for reuse as
  // production trip media — see docs/ARCHITECTURE.md §14's media-mapping
  // note. `placeholder` is the type built for exactly this gap; `gallery`
  // stays empty rather than populated with anything extracted from the PDF.
  heroMedia: { kind: 'placeholder' },
  gallery: [],

  // No genuine signal in the source for any of these (adventure/social/
  // party/relaxation/culture/nature) — left empty rather than guessed.
  styleScores: {},

  // Pages 4-7, "Itinerary": one entry per day, title from the source's own
  // day heading (with the "Day N:" prefix removed since `day` is already a
  // separate field), summary the source's paragraph text verbatim aside
  // from the pipeline's own whitespace collapsing.
  itineraryPreview: [
    {
      day: 1,
      title: 'Fly to HCMC, Explore Cafe Apartments & Bui Vien Walking Street',
      summary:
        'Fly from India to Ho Chi Minh City. On arrival, enjoy a group airport pickup and ' +
        'transfer to the hotel. Check in and settle down. In the evening, attend a group ' +
        'briefing with the trip leader, followed by an exploration of HCMC’s vibrant ' +
        'streets. Visit the War Remnants Museum and the iconic Central Post Office. Later, ' +
        'head to the Café Apartments to try the famous egg coffee, enjoy a city bus ' +
        'tour(Optional), and end the night at Bui Vien Walking Street to experience the ' +
        'city’s party and club culture. Late-night return to hotel. Overnight stay in HCMC.',
    },
    {
      day: 2,
      title: 'Cu Chi Tunnels & Flight to Da Nang (Included)',
      summary:
        'Wake up to breakfast at the hotel and get ready for an exciting day ahead. Travel ' +
        'in a private AC van with a professional guide to explore the legendary Cu Chi ' +
        'Tunnels. Walk through the tunnel network, understand its historical significance, ' +
        'and witness live demonstrations. You’ll also have the optional opportunity to ' +
        'fire an AK-47. Return to Ho Chi Minh City by afternoon and enjoy time exploring the ' +
        'local markets, soaking in the energy of the streets, and indulging in authentic ' +
        'Vietnamese coffee. Later, transfer to HCMC Airport to catch your flight to Da Nang. ' +
        'Upon arrival, enjoy airport pickup and hotel transfer. Overnight stay in Da Nang.',
    },
    {
      day: 3,
      title: 'Hoi An Ancient Town & Coconut Boat Ride',
      summary:
        'Wake up late after the last few hectic days and enjoy a relaxed breakfast at the ' +
        'hotel. Spend your morning unwinding at Da Nang Beach, soaking in the sun and ' +
        'refreshing coastal breeze. In the afternoon, a private AC van with a local guide ' +
        'will take the group for the famous Coconut Basket Boat Ride. After this, we will ' +
        'head to the enchanting Hoi An Ancient Town, a UNESCO World Heritage Site known for ' +
        'its lantern-lit streets, preserved architecture, and artistic charm. Enjoy a ' +
        'leisurely cycling experience around the old town and countryside lanes before ' +
        'exploring Hoi An at your own pace—shopping for souvenirs, discovering aesthetic ' +
        'cafés, or strolling through its scenic alleys. As evening falls, witness the ' +
        'magical Lantern Lighting and enjoy a serene Lantern Boat Ride on the Thu Bon River. ' +
        'Then we will head back to Da Nang for the night.',
    },
    {
      day: 4,
      title: 'Explore Ba Na Hills – Cable Cars, Golden Hands Bridge, Fantasy Park and more',
      // The trailing "Y" mid-paragraph and the "You'll... Y" break are exactly
      // as they appear in the source PDF (page 5) — preserved verbatim as a
      // likely leftover authoring artifact in the original document, not
      // corrected or removed here.
      summary:
        'Wake up and enjoy breakfast at the hotel before getting ready for an exciting ' +
        'full-day excursion to Ba Na Hills. Our private AC van will take the group to the ' +
        'mountain base, where you’ll board the world-famous Ba Na Hills Cable Car. At the ' +
        'top, we will visit the iconic Golden Hand Bridge, a must-visit landmark perfect for ' +
        'photos and panoramic views. From there, you’ll explore the charming French ' +
        'Village, complete with European-style architecture, street performances, and a ' +
        'lively theme-park atmosphere that makes Ba Na Hills feel like the Disneyland of ' +
        'Vietnam. Y A buffet lunch will be arranged for the group, After a memorable day ' +
        'exploring the magical Ba Na Hills, we will descend by cable car and return to Da ' +
        'Nang in our private AC van, arriving by late evening or night. You can then relax ' +
        'at the hotel or explore the city at your own pace. In the Night You can Enjoy the ' +
        'Dragon Fire show at Dragon Bridge.',
    },
    {
      day: 5,
      // The source titles this day "... & Club Night" but its body text
      // (page 6) only describes the Hanoi Train Street visit — no club
      // activity is actually described. Preserved as titled; no club-night
      // content has been invented to match the title.
      title: 'Hanoi Arrival (Da Nang to Hanoi Flight Included) – Iconic Train Street & Club Night',
      summary:
        'Start your morning with breakfast at the hotel before checking out and heading to ' +
        'the airport for your flight to Hanoi, the cultural capital of Vietnam. Upon ' +
        'arrival, a private AC van will pick up the group and transfer you to the hotel for ' +
        'check-in and a short rest. In the late afternoon, we will head out to explore the ' +
        'iconic Hanoi Train Street, a narrow residential lane where cafés line the ' +
        'railway track and trains pass just inches away—perfect for unique photos, ' +
        'coffee breaks, and experiencing the city’s raw, authentic energy.',
    },
    {
      day: 6,
      title: 'Halong Bay Cruise Adventure, Kayaking & Caving',
      summary:
        'Wake up early, enjoy a wholesome breakfast at the hotel, and board your AC van for ' +
        'a scenic drive towards the iconic Halong Bay. The route takes you through peaceful ' +
        'northern landscapes, setting a calm start to the day. Upon arrival, step onto your ' +
        'cruise and watch the emerald waters and limestone cliffs unfold around you. Settle ' +
        'on the deck, enjoy the breeze, and capture the stunning views as the boat glides ' +
        'deeper into the bay. A delicious buffet lunch is served onboard, offering fresh ' +
        'Vietnamese dishes and seafood with beautiful ocean backdrops. After lunch, the ' +
        'adventure begins—kayaking through calm waters and limestone formations, ' +
        'followed by exploring a magnificent cave filled with unique rock formations and ' +
        'natural chambers. Spend the rest of the cruise relaxing on the deck and enjoying ' +
        'the serene beauty of Halong Bay. By late afternoon, the boat returns to the pier, ' +
        'and you’ll head back to Hanoi in your comfortable van. Reach the hotel by ' +
        'night—content, relaxed, and carrying unforgettable memories of Vietnam’s ' +
        'most breathtaking natural wonder.',
    },
    {
      day: 7,
      title: 'The Trip Ends, But the Story Lives On',
      summary:
        'Wake up to your final morning in Vietnam and enjoy a peaceful breakfast at the ' +
        'hotel before checking out. A private AC van will arrive to take you to the ' +
        'airport, marking the last ride together with the group. As the journey comes to ' +
        'an end, the memories of beaches, lanterns, boat rides, mountains, late-night ' +
        'talks, laughter, and all the little moments you shared begin to feel even more ' +
        'precious. What started as a trip with strangers has now turned into a bond that ' +
        'feels like family. At the airport, the goodbyes are emotional—but they carry ' +
        'warmth, gratitude, and the promise of staying connected. With hugs, photos, and ' +
        'one last smile, you part ways knowing that this adventure may be ending, but the ' +
        'friendships and memories will last far longer than the trip itself. Safe travels, ' +
        'until the next time. 💛✨',
    },
  ],

  // Page 2 gives per-city nights; page 3/8 gives the star rating and
  // twin-sharing basis. No specific property name is given for any leg, so
  // none is invented — `description` carries the city, `type` the rating.
  accommodation: [
    { description: 'Ho Chi Minh City', type: '3 & 4 Star Premium Hotel (Twin Sharing)', nights: 1 },
    { description: 'Da Nang', type: '3 & 4 Star Premium Hotel (Twin Sharing)', nights: 3 },
    { description: 'Hanoi', type: '3 & 4 Star Premium Hotel (Twin Sharing)', nights: 2 },
  ],

  // Page 8's "Domestic Flight", "Transfers" and "Airport Pick Up & Drop"
  // lines, plus the itinerary's own Day 2/Day 5 flight mentions.
  transport: [
    { mode: 'Domestic flight', description: 'Ho Chi Minh City to Da Nang' },
    { mode: 'Domestic flight', description: 'Da Nang to Hanoi' },
    { mode: 'Private AC van / premium bus', description: 'Transfers for activities and tours' },
    {
      mode: 'Airport transfer',
      description: 'Pick-up and drop at all destinations within Vietnam',
    },
  ],

  // "Know Before You Go" (page 2) and "Did You Know?" (page 3) list eleven
  // destination facts in total. Only the three below are genuinely
  // practical traveller guidance rather than marketing trivia — the rest
  // (Café Apartments' history, the Ba Na Hills cable-car record, the Hoi
  // An lantern counts, Ha Long Bay's island count, Sơn Đoòng, the egg-coffee
  // origin story, and Bia Hoi pricing) are not imported as content here; see
  // docs/ARCHITECTURE.md §14 for the full accept/reject list.
  importantNotes: [
    {
      title: 'Dragon Bridge fire show is weekly, not nightly',
      detail:
        'Da Nang’s Dragon Bridge breathes fire only on weekends (page 2 of the source) — ' +
        'worth knowing when planning the Day 4 evening in Da Nang.',
      category: 'other',
    },
    {
      title: 'Hanoi Train Street: trains pass very close to cafes',
      detail:
        'Hanoi’s Train Street is a narrow residential lane where trains pass just inches ' +
        'from cafes and homes — stay alert and follow local/guide instructions when a ' +
        'train is due.',
      category: 'other',
    },
    {
      title: 'Scooters outnumber pedestrians on the streets',
      detail:
        'Vietnam’s streets have more scooters than people. Take extra care crossing roads, ' +
        'and follow the group/guide’s lead.',
      category: 'other',
    },
  ],

  // No FAQ, cancellation/refund/payment-terms, packing list, meeting point,
  // guide name, or host/creator anywhere in the source — left absent
  // rather than filled with invented content.
};

/**
 * The Phase 3.7 ingest result: `draftTripDetailSchema` validation of
 * `VIETNAM_WWS_7D6N_RAW` above. Expected (and asserted by
 * tests/unit/content-ingest.test.ts) to succeed with `ok: true` and
 * `record.status === 'draft'` — the source has everything that schema
 * requires except the four commercial fields it deliberately makes
 * optional. If this ever fails, the raw payload above has drifted from
 * what the schema expects; it should not be "fixed" by inventing the
 * commercial fields to make it pass `ingestTripContent` instead.
 */
export const VIETNAM_WWS_7D6N_INGEST = ingestDraftTripContent(VIETNAM_WWS_7D6N_RAW);

/**
 * The record itself, for anything that wants the `ContentRecord` shape
 * directly rather than re-deriving it from the ingest result. `undefined`
 * only if ingestion unexpectedly failed — callers that need this to
 * always exist should assert via `VIETNAM_WWS_7D6N_INGEST.ok` first (see
 * the test file above), not use this constant blindly.
 */
export const VIETNAM_WWS_7D6N_RECORD: ContentRecord<DraftTripDetail> | undefined =
  VIETNAM_WWS_7D6N_INGEST.ok
    ? {
        ...VIETNAM_WWS_7D6N_INGEST.record,
        reviewNotes:
          'Phase 3.7 import from docs/source-material/vietnam/Vietnam X WWS 7D6N (1).pdf. ' +
          'No price, departure date, availability or host in the source — all four left ' +
          'absent, not invented. The visa-fee figure in exclusions (₹2900) is a verbatim ' +
          'source claim, not independently verified. Day 4’s itinerary text preserves a ' +
          'stray "Y" from the source PDF. Day 5’s title references a "Club Night" the body ' +
          'text does not describe — both are source inconsistencies, not transcription ' +
          'errors introduced here. Not publishable until a human supplies the missing ' +
          'commercial fields and the record separately passes tripDetailSchema.',
      }
    : undefined;
