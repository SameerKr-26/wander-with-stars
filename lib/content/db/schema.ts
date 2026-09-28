/**
 * Hand-authored row types for the Phase 4.1 schema (`supabase/migrations/`).
 *
 * NOT `lib/supabase/database.types.ts` — that file is the real generated
 * source of truth once a database is reachable (`npm run db:types`), and
 * stays the committed Phase 1 placeholder (`Tables: Record<string, never>`)
 * until then; hand-editing it would contradict its own "regenerated, never
 * hand-edited" header and make a future real generation silently overwrite
 * work no diff would explain. These types exist so `lib/content/db/` can be
 * strongly typed against the schema this project actually migrated
 * (mirrored column-for-column from each `supabase/migrations/*.sql` file)
 * without waiting on that generation step. Every query in
 * `lib/content/db/repository.ts` pins its result to one of these with
 * `.returns<T>()`, rather than trusting the placeholder `Database` generic
 * on the client itself.
 *
 * Delete this file once `npm run db:types` has run against a real database
 * and `repository.ts` is updated to use the generated types directly.
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
  price_amount: number | null;
  price_currency: string | null;
  capacity: number | null;
  seats_reserved: number;
  seats_confirmed: number;
  status: TripDepartureStatus;
  guides: GuideRow | null;
  trip_accommodation: TripAccommodationRow[];
  trip_transport: TripTransportRow[];
  trip_meeting_points: TripMeetingPointRow[];
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
