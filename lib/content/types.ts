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
 * assessment, per that document's explicit instruction.
 */
export type TravelStyleSignal = 'adventure' | 'social' | 'party' | 'relaxation' | 'culture';

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

/**
 * Full trip detail — what `/trips/[slug]` needs beyond a card.
 *
 * Extends TripPreview rather than duplicating it, since everything a card
 * shows is also true on the detail page. `gallery` and `itineraryPreview` are
 * the two fields with no card equivalent; both are safe to leave empty until
 * real media and itinerary data exist.
 */
export interface TripDetail extends TripPreview {
  overview: string;
  inclusions: string[];
  exclusions: string[];
  gallery: TripMedia[];
  itineraryPreview: TripItineraryDay[];
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
