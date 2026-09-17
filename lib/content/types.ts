/**
 * Homepage content contracts.
 *
 * These describe the shape of real WWS content once the Trip/Departure/Media
 * data model exists (docs/ROADMAP.md Phase 5, docs/DATABASE.md). Nothing here
 * is final schema — it is what the UI needs, kept honest about what is
 * genuinely known today versus still open.
 *
 * lib/content/fixtures.ts implements these types with clearly labelled
 * development data. lib/content/queries.ts is the seam that will call
 * Supabase later — components import from queries.ts, never from fixtures.ts
 * directly, so switching the data source is a one-file change.
 */

/* ---------------------------------------------------------------- media */

/**
 * A single piece of trip media.
 *
 * `kind: 'placeholder'` is not a business type — it exists so a section can be
 * built and reviewed before real photography exists, without pretending a
 * gradient is a photo. A placeholder renders as an honest, token-styled
 * atmosphere field, never as invented stock imagery.
 */
export type TripMedia =
  | { kind: 'image'; src: string; alt: string; focalPoint?: 'center' | 'top' | 'bottom' }
  | { kind: 'video'; src: string; poster: string; alt: string }
  | { kind: 'placeholder' };

/* --------------------------------------------------------------- people */

export interface HostPreview {
  name: string;
  avatar?: TripMedia;
  tagline?: string;
}

/**
 * A trip's guide — Phase 3.5C. Host, Guide and Creator (`CreatorExperience`
 * below) are conceptually different roles (the docs/PRODUCT_REQUIREMENTS.md
 * future people model): Host organises/owns the departure, Guide leads
 * day-to-day activities on the ground, Creator is the WWS creator behind
 * the trip concept — the same person may hold more than one of these
 * roles, or not.
 *
 * Today's real data for any of them is identical: a name, and optionally
 * an avatar/tagline. A type alias rather than a second, field-for-field
 * copy of `HostPreview` — reuse without pretending Guide and Host are the
 * same field, and without inventing Guide-specific properties (bios,
 * credentials, certifications) no real WWS content supplies yet. The
 * moment a real Guide-only field exists, that's when this becomes its own
 * interface — not before, and Host is untouched either way since nothing
 * here changes `HostPreview` itself.
 */
export type GuidePreview = HostPreview;

export interface CreatorExperience {
  id: string;
  name: string;
  tagline: string;
  avatar?: TripMedia;
  tripCount?: number;
}

export interface TravellerStory {
  id: string;
  travellerName: string;
  tripTitle?: string;
  quote: string;
  media?: TripMedia;
  /** Only ever set from a genuinely collected, verified rating. */
  rating?: number;
  createdAt: string;
}

/* ----------------------------------------------------------------- trip */

/**
 * Trip style descriptors — docs/UX_INTERACTION_GUIDE.md §7.
 *
 * Presented as a "trip style" descriptor, never as a scientific personality
 * assessment, per that document's explicit instruction. `nature` extends the
 * original five-signal list (Phase 3.4's discovery UX) — no current fixture
 * trip scores it, so selecting it in the UI honestly returns no results
 * rather than one being invented to fill the option out.
 */
export type TravelStyleSignal =
  'adventure' | 'social' | 'party' | 'relaxation' | 'culture' | 'nature';

export type TripStyleScores = Partial<Record<TravelStyleSignal, number>>;

export type AvailabilityStatus = 'open' | 'almost-full' | 'waitlisted' | 'sold-out';

export interface TripAvailability {
  status: AvailabilityStatus;
  /** Only shown when a real count is known — never invented for urgency. */
  spotsLeft?: number;
}

export interface TripPrice {
  amount: number;
  currency: string;
}

/**
 * A previewable trip departure, for cards and listings.
 *
 * Deliberately not the full trip record (docs/DATABASE.md separates trip and
 * departure) — this is the slice a homepage card needs, and it may be
 * refined once the real schema exists.
 */
export interface TripPreview {
  id: string;
  slug: string;
  title: string;
  destination: string;
  country: string;
  departureDate: string;
  durationNights: number;
  price: TripPrice;
  availability: TripAvailability;
  host: HostPreview;
  heroMedia: TripMedia;
  styleScores: TripStyleScores;
  travellerCount?: number;
  /**
   * One short editorial line — the featured-trip treatment needs a
   * descriptive sentence beyond the raw fields. Optional: a real trip record
   * may not have one yet, and the UI must not fabricate a substitute.
   */
  tagline?: string;
}

/**
 * One day of a trip itinerary — the minimum slice for a detail-page preview.
 *
 * docs/DATABASE.md's real hierarchy is
 * Trip → Departure → Itinerary → Activities → Media; this is a deliberately
 * flattened stand-in for Itinerary + Activities, sufficient to establish the
 * page surface without building the itinerary engine (Phase 5).
 */
export interface TripItineraryDay {
  day: number;
  title: string;
  summary: string;
}

/* ------------------------------------------------ commercial / logistics */

/**
 * Phase 3.5A — the additional information layer a traveller needs before
 * booking, beyond the story/itinerary Phase 3.5 already covers. Every field
 * below is optional and every one is new: none of it replaces
 * `TripDetail.inclusions` / `.exclusions` (see that interface's own comment
 * for why those two stay exactly as they are).
 *
 * This does not touch the Trip → Departure → Itinerary → Activities → Media
 * hierarchy (docs/DATABASE.md) — it is a sibling layer describing the
 * commercial/practical side of a departure, not a new position in that
 * chain. A real departure may have several accommodation legs or transport
 * segments, so those are arrays; a meeting point is one place per
 * departure, so it is a single optional object.
 */

/** One leg of a departure's accommodation. `type` is free text ("Boutique hotel", "Homestay") because a fixed enum can't anticipate every real WWS property type. */
export interface TripAccommodation {
  name?: string;
  type?: string;
  description?: string;
  /** Nights at this specific property, when the departure uses more than one. */
  nights?: number;
  media?: TripMedia;
}

/** One leg of a departure's transport (a flight, a transfer, a train...). */
export interface TripTransport {
  mode: string;
  description?: string;
}

/** Where and when a departure actually begins — one per departure. */
export interface TripMeetingPoint {
  location: string;
  time?: string;
  instructions?: string;
}

/**
 * The higher-level grouping Phase 3.5C asks "Traveller Notes" to have —
 * added to the existing `TripImportantNote` rather than a second,
 * near-identical type. Deliberately loose categories (not a rigid
 * enum-per-topic): a real note about "what to expect on arrival" and one
 * about "local etiquette" are both genuinely useful without needing
 * separate top-level fields.
 */
export type TripTravellerNoteCategory =
  'etiquette' | 'weather' | 'connectivity' | 'money' | 'cultural' | 'health' | 'arrival' | 'other';

/**
 * A single flagged note — a visa requirement, a fitness expectation, a
 * climate warning, a local-etiquette tip — distinct from `thingsToCarry` (a
 * plain packing checklist) because a note usually needs a short
 * explanation, not just a label.
 *
 * This is also "Traveller Notes" (Phase 3.5C): rather than add a second,
 * field-for-field-identical array to `TripDetail` for that concept, the
 * optional `category` below is the "higher-level grouping" that
 * distinguishes a practical warning from a traveller-facing context note —
 * both live in `TripDetail.importantNotes`, one array, one type, category
 * optional so nothing here forces every note into a bucket it doesn't need.
 */
export interface TripImportantNote {
  title: string;
  detail: string;
  category?: TripTravellerNoteCategory;
}

export interface TripFAQ {
  question: string;
  answer: string;
}

/**
 * One policy section (cancellation, refund, payment terms, a trip-specific
 * condition). A `title` + `body` pair rather than a bare string so a real
 * policy document can carry real headings — see `TripPolicy` below for why
 * this exists instead of one giant string.
 */
export interface TripPolicySection {
  title: string;
  body: string;
}

/**
 * Booking-relevant policy content, kept as named, structured sections
 * rather than a single block of legal text: a component can render
 * "Cancellation" and "Refund" as their own headed sections, and
 * `additionalTerms` holds whatever trip-specific conditions don't fit the
 * three named ones (e.g. an altitude-trek waiver) without inventing a new
 * top-level field per trip type. Every section is independently optional —
 * a departure might publish a cancellation policy months before a refund
 * policy is finalised.
 */
export interface TripPolicy {
  cancellation?: TripPolicySection;
  refund?: TripPolicySection;
  paymentTerms?: TripPolicySection;
  additionalTerms?: TripPolicySection[];
}

/** An optional add-on cost — a private room upgrade, an excursion — never one of the trip's own inclusions/exclusions. */
export interface TripExtra {
  name: string;
  price?: TripPrice;
  description?: string;
}

/**
 * Full trip detail — what `/trips/[slug]` needs beyond a card.
 *
 * Extends TripPreview rather than duplicating it, since everything a card
 * shows is also true on the detail page. `gallery` and `itineraryPreview` are
 * the two fields with no card equivalent; both are safe to leave empty until
 * real media and itinerary data exist.
 *
 * `inclusions` / `exclusions` deliberately stay plain `string[]` rather than
 * becoming `TripInclusion[]` / `TripExclusion[]` objects (Phase 3.5A asked
 * for that shape): the existing flat-list convention already works, is
 * already wired into components/trips/trip-logistics.tsx, and Phase 3.5A is
 * explicit that this pass must not touch that page or its current
 * behaviour. If a real inclusion ever needs its own description beyond a
 * one-line label, that is the moment to introduce those richer types — not
 * before real content demands it.
 *
 * Every field added below this comment is new in Phase 3.5A and optional,
 * so every existing fixture in lib/content/fixtures.ts remains valid
 * without modification.
 */
export interface TripDetail extends TripPreview {
  overview: string;
  inclusions: string[];
  exclusions: string[];
  gallery: TripMedia[];
  itineraryPreview: TripItineraryDay[];

  /** A departure may use more than one property across its nights. */
  accommodation?: TripAccommodation[];
  /** A departure may combine several transport legs. */
  transport?: TripTransport[];
  meetingPoint?: TripMeetingPoint;
  /** A plain packing checklist — no per-item description needed, unlike `importantNotes`. */
  thingsToCarry?: string[];
  /** Practical notes and traveller-facing context alike — see the type's own comment. */
  importantNotes?: TripImportantNote[];
  faqs?: TripFAQ[];
  policy?: TripPolicy;
  extras?: TripExtra[];
  /**
   * The person leading activities on the ground, distinct from `host` —
   * Phase 3.5C. Omitted (not a fallback to `host`) when a departure has no
   * separate guide on record, which today is every fixture: nothing here
   * invents a guide by assuming the host always doubles as one.
   */
  guide?: GuidePreview;
}

/* ----------------------------------------------------------- discovery */

/** Bucketed so the filter reads as a real choice, not a raw slider value. */
export type DurationBucket = 'short' | 'medium' | 'long';

/**
 * Bucketed in the trip's own currency. A genuine limitation, not an
 * oversight: every current fixture trip is priced in INR, so absolute
 * rupee thresholds are honest for now. Multi-currency budget filtering
 * needs real conversion or a currency-aware UI, deferred until more than
 * one currency actually appears in the data.
 */
export type BudgetBucket = 'budget' | 'mid' | 'premium';

/**
 * Trip discovery filter state — /trips (Phase 3.4).
 *
 * Deliberately a flat, serialisable shape: every field can become a URL
 * search param or a Supabase query predicate later without restructuring the
 * UI that reads it. `lib/content/filters.ts` is the only place that
 * interprets this shape; components only ever set and read it.
 */
export interface TripFilters {
  /** Matched against title, destination and country — see filterTrips(). */
  query: string;
  /** Empty means "all styles" — never a hidden implicit filter. */
  styles: TravelStyleSignal[];
  /** One of the departure months actually present in the data, or null for "any". */
  month: string | null;
  duration: DurationBucket | null;
  budget: BudgetBucket | null;
}

/* ------------------------------------------------------------ community */

/**
 * Aggregate, privacy-respecting departure/community signals —
 * docs/PRODUCT_REQUIREMENTS.md §12. Individual profiles are never part of
 * this shape; only counts.
 */
export interface CommunitySnapshot {
  totalTravellers: number;
  soloTravellers: number;
  firstInternationalTrips: number;
  topCities: { city: string; count: number }[];
}

/* -------------------------------------------------------------- loading */

/**
 * A section's data state. Every content-driven section is built against this
 * rather than assuming data is always present — so a real Supabase query that
 * is slow, empty, or fails renders correctly on day one.
 */
export type ContentState<T> =
  | { status: 'loading' }
  | { status: 'error'; message: string }
  | { status: 'empty' }
  | { status: 'ready'; data: T };
