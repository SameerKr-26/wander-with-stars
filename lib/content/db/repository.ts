import 'server-only';

import { createClient } from '@/lib/supabase/server';

import type { TripDetailRow, TripRow } from './schema';

/**
 * Server-only Supabase data access for trip content (Phase 4.2).
 *
 * Uses `lib/supabase/server.ts`'s existing `createClient()` — the anon-key
 * client acting as the current (usually anonymous) session — never
 * `lib/supabase/admin.ts`. Every query below relies on the Phase 4.1 RLS
 * policies to restrict rows to what that session may legitimately see;
 * nothing here re-filters `content_status` or departure `status` in
 * JavaScript, because the database is the authority on visibility, not this
 * file (docs/SECURITY.md §5).
 *
 * `.returns<T>()` pins each query's result to a hand-authored row shape
 * (`./schema.ts`) with literal-typed status/kind/category columns the real,
 * generated `Database` type (Phase 4.2A) cannot express — see that file's
 * header for why.
 */

const HOST_FIELDS = 'id, name, tagline, avatar_kind, avatar_src, avatar_alt, avatar_poster';

const TRIP_MEDIA_FIELDS = 'id, kind, src, alt, poster, focal_point, is_hero, display_order';

const TRIP_DEPARTURE_FIELDS = `
  id, departure_date, price_amount, price_currency, capacity, seats_reserved, seats_confirmed, status,
  guides ( ${HOST_FIELDS} ),
  trip_accommodation ( name, type, description, nights ),
  trip_transport ( mode, description, display_order ),
  trip_meeting_points ( location, meeting_time, instructions )
`;

const TRIP_PREVIEW_FIELDS = `
  id, slug, title, destination, country, duration_nights, tagline, style_scores,
  hosts ( ${HOST_FIELDS} ),
  trip_media ( ${TRIP_MEDIA_FIELDS} ),
  trip_departures ( ${TRIP_DEPARTURE_FIELDS} )
`;

const TRIP_DETAIL_FIELDS = `
  ${TRIP_PREVIEW_FIELDS},
  overview,
  itinerary_days ( day_number, title, summary ),
  trip_inclusions ( label, display_order ),
  trip_exclusions ( label, display_order ),
  trip_important_notes ( title, detail, category, display_order ),
  trip_extras ( name, price_amount, price_currency, description, display_order ),
  trip_faqs ( question, answer, display_order ),
  trip_policy_sections ( kind, title, body, display_order )
`;

/**
 * Every publicly visible trip and its visible departures, for discovery /
 * homepage listing. `lib/content/db/map.ts`'s `selectPresentableDeparture`
 * and `mapTripPreview` decide which of these actually become a card — a
 * trip with no presentable departure yet (announced but not bookable, or
 * none at all) is a legitimate result here and simply produces no card.
 */
export async function fetchTripPreviewRows(): Promise<TripRow[]> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from('trips')
    .select(TRIP_PREVIEW_FIELDS)
    .returns<TripRow[]>();

  if (error) throw error;
  return data;
}

/**
 * One trip by slug, with every content child the detail page can render.
 * Returns `null` when the slug matches no row the current session may see
 * at all — either it genuinely doesn't exist, or RLS hid it (draft, review,
 * approved or archived) — `lib/content/queries.ts` treats both the same
 * way `getTripBySlug` already documents.
 */
export async function fetchTripDetailRowBySlug(slug: string): Promise<TripDetailRow | null> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from('trips')
    .select(TRIP_DETAIL_FIELDS)
    .eq('slug', slug)
    .maybeSingle()
    .returns<TripDetailRow>();

  if (error) throw error;
  return data;
}
