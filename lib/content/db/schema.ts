/**
 * Hand-maintained row types, refining the Phase 4.1 schema
 * (`supabase/migrations/`) beyond what `lib/supabase/database.types.ts` can
 * express.
 *
 * As of Phase 4.2A, `database.types.ts` is real, generated output (`npm run
 * db:types:local`) — no longer a placeholder — so this file is NOT a
 * stand-in for it anymore. It still exists, deliberately, for one reason:
 * every CHECK-constrained status/kind/category column (`trips.content_status`,
 * `trip_departures.status`, `trip_media.kind`, `trip_policy_sections.kind`,
 * `trip_important_notes.category`) generates as plain `string`/
 * `string | null` in the real output, because a Postgres CHECK constraint
 * is not a real enum type the generator can introspect. `lib/content/db/map.ts`
 * relies on these being literal unions (`AVAILABILITY_BY_DEPARTURE_STATUS`'s
 * `Partial<Record<TripDepartureStatus, ...>>`, `mapMedia`'s discriminated
 * `kind` switch) for real exhaustiveness checking — that's what this file
 * still provides. `lib/content/db/repository.ts` pins each query's result to
 * one of these with `.returns<T>()`, layered on top of the now-correctly-typed
 * client rather than replacing it.
 */

export interface HostRow {
  id: string;
  name: string;
  tagline: string | null;
  avatar_kind: 'image' | 'video' | 'placeholder' | null;
  avatar_src: string | null;
  avatar_alt: string | null;
  avatar_poster: string | null;
}

export type GuideRow = HostRow;

export interface TripMediaRow {
  id: string;
  kind: 'image' | 'video' | 'placeholder';
  src: string | null;
  alt: string | null;
  poster: string | null;
  focal_point: 'center' | 'top' | 'bottom' | null;
  is_hero: boolean;
  display_order: number;
}

export interface ItineraryDayRow {
  day_number: number;
  title: string;
  summary: string;
}

export interface TripInclusionRow {
  label: string;
  display_order: number;
}

export type TripExclusionRow = TripInclusionRow;

export interface TripImportantNoteRow {
  title: string;
  detail: string;
  category:
    | 'etiquette'
    | 'weather'
    | 'connectivity'
    | 'money'
    | 'cultural'
    | 'health'
    | 'arrival'
    | 'other'
    | null;
  display_order: number;
}

export interface TripExtraRow {
  name: string;
  price_amount: number | null;
  price_currency: string | null;
  description: string | null;
  display_order: number;
}

export interface TripFaqRow {
  question: string;
  answer: string;
  display_order: number;
}

export interface TripPolicySectionRow {
  kind: 'cancellation' | 'refund' | 'payment_terms' | 'additional';
  title: string;
  body: string;
  display_order: number;
}

export interface TripAccommodationRow {
  name: string | null;
  type: string | null;
  description: string | null;
  nights: number | null;
}

export interface TripTransportRow {
  mode: string;
  description: string | null;
  display_order: number;
}

export interface TripMeetingPointRow {
  location: string;
  meeting_time: string | null;
  instructions: string | null;
}

/** A departure's `status` — docs/DATABASE.md §12's "Trip departure" state model. */
export type TripDepartureStatus =
  'draft' | 'published' | 'booking_open' | 'almost_full' | 'sold_out' | 'in_progress' | 'completed';

export interface TripDepartureRow {
  id: string;
  departure_date: string;
  return_date: string | null;
  price_amount: number | null;
  price_currency: string | null;
  capacity: number | null;
  seats_reserved: number;
  seats_confirmed: number;
  status: TripDepartureStatus;
  guides: GuideRow | null;
  trip_accommodation: TripAccommodationRow[];
  trip_transport: TripTransportRow[];
  // To-one, not to-many: a unique constraint on trip_departure_id
  // (supabase/migrations/20260928164518_create_departure_logistics_tables.sql)
  // makes PostgREST return a single row or null here, never an array.
  trip_meeting_points: TripMeetingPointRow | null;
}

export interface TripRow {
  id: string;
  slug: string;
  title: string;
  destination: string;
  country: string;
  duration_nights: number;
  tagline: string | null;
  overview: string;
  style_scores: Record<string, number>;
  hosts: HostRow | null;
  trip_media: TripMediaRow[];
  trip_departures: TripDepartureRow[];
}

/** `TripRow` plus every content child only the detail page needs. */
export interface TripDetailRow extends TripRow {
  itinerary_days: ItineraryDayRow[];
  trip_inclusions: TripInclusionRow[];
  trip_exclusions: TripExclusionRow[];
  trip_important_notes: TripImportantNoteRow[];
  trip_extras: TripExtraRow[];
  trip_faqs: TripFaqRow[];
  trip_policy_sections: TripPolicySectionRow[];
}
