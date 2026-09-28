import 'server-only';

import type { ContentStatus } from '@/lib/content/ingest/types';
import { createAdminClient } from '@/lib/supabase/admin';
import { createClient } from '@/lib/supabase/server';

import { canTransition } from './transitions';
import type { AdminRole } from './roles';
import type {
  DepartureInput,
  ItineraryDayInput,
  ListLabelInput,
  TripCoreInput,
} from './validation';

/**
 * Server-only admin data access — Phase 4.3.
 *
 * READS use `lib/supabase/server.ts`'s session-aware client, relying on the
 * "admins can read every trip/departure/..." RLS policies added in
 * `supabase/migrations/20260928183648_create_admin_roles_and_read_policies.sql`
 * — least privilege (docs/SECURITY.md §2 rule 7): a read that RLS can
 * authorize correctly doesn't need the service-role client.
 *
 * WRITES use `lib/supabase/admin.ts`'s service-role client: no
 * authenticated write policy exists on any content table (by design — see
 * that migration's header), so a privileged write has no other path. Every
 * exported function here assumes its caller already ran
 * `lib/admin/authorize.ts`'s `requireAdminRole` — this module performs no
 * authorization of its own beyond the one defense-in-depth re-check in
 * `transitionTripStatus` (status transitions are exactly the operation
 * docs/SECURITY.md warns hardest against trusting client-submitted state
 * for).
 */

export interface AdminTripListItem {
  id: string;
  slug: string;
  title: string;
  destination: string;
  contentStatus: ContentStatus;
  updatedAt: string;
}

export async function listTripsForAdmin(): Promise<AdminTripListItem[]> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from('trips')
    .select('id, slug, title, destination, content_status, updated_at')
    .order('updated_at', { ascending: false })
    .returns<
      {
        id: string;
        slug: string;
        title: string;
        destination: string;
        content_status: string;
        updated_at: string;
      }[]
    >();
  if (error) throw error;
  return data.map((row) => ({
    id: row.id,
    slug: row.slug,
    title: row.title,
    destination: row.destination,
    contentStatus: row.content_status as ContentStatus,
    updatedAt: row.updated_at,
  }));
}

export interface AdminTripDetail {
  id: string;
  slug: string;
  title: string;
  destination: string;
  country: string;
  durationNights: number;
  tagline: string | null;
  overview: string;
  hostId: string | null;
  contentStatus: ContentStatus;
  itineraryDays: { id: string; dayNumber: number; title: string; summary: string }[];
  inclusions: { id: string; label: string }[];
  exclusions: { id: string; label: string }[];
  departures: {
    id: string;
    departureDate: string;
    returnDate: string | null;
    priceAmount: number | null;
    priceCurrency: string | null;
    capacity: number | null;
    status: string;
  }[];
}

export async function getTripForAdmin(id: string): Promise<AdminTripDetail | null> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from('trips')
    .select(
      `
        id, slug, title, destination, country, duration_nights, tagline, overview, host_id, content_status,
        itinerary_days ( id, day_number, title, summary ),
        trip_inclusions ( id, label ),
        trip_exclusions ( id, label ),
        trip_departures ( id, departure_date, return_date, price_amount, price_currency, capacity, status )
      `,
    )
    .eq('id', id)
    .maybeSingle();
  if (error) throw error;
  if (!data) return null;

  const row = data as unknown as {
    id: string;
    slug: string;
    title: string;
    destination: string;
    country: string;
    duration_nights: number;
    tagline: string | null;
    overview: string;
    host_id: string | null;
    content_status: string;
    itinerary_days: { id: string; day_number: number; title: string; summary: string }[];
    trip_inclusions: { id: string; label: string }[];
    trip_exclusions: { id: string; label: string }[];
    trip_departures: {
      id: string;
      departure_date: string;
      return_date: string | null;
      price_amount: number | null;
      price_currency: string | null;
      capacity: number | null;
      status: string;
    }[];
  };

  return {
    id: row.id,
    slug: row.slug,
    title: row.title,
    destination: row.destination,
    country: row.country,
    durationNights: row.duration_nights,
    tagline: row.tagline,
    overview: row.overview,
    hostId: row.host_id,
    contentStatus: row.content_status as ContentStatus,
    itineraryDays: [...row.itinerary_days]
      .sort((a, b) => a.day_number - b.day_number)
      .map((d) => ({ id: d.id, dayNumber: d.day_number, title: d.title, summary: d.summary })),
    inclusions: row.trip_inclusions,
    exclusions: row.trip_exclusions,
    departures: row.trip_departures.map((d) => ({
      id: d.id,
      departureDate: d.departure_date,
      returnDate: d.return_date,
      priceAmount: d.price_amount,
      priceCurrency: d.price_currency,
      capacity: d.capacity,
      status: d.status,
    })),
  };
}

export async function listHostsForSelect(): Promise<{ id: string; name: string }[]> {
  const supabase = await createClient();
  const { data, error } = await supabase.from('hosts').select('id, name').order('name');
  if (error) throw error;
  return data;
}

export async function createTrip(input: TripCoreInput): Promise<string> {
  const admin = createAdminClient();
  const { data, error } = await admin
    .from('trips')
    .insert({
      slug: input.slug,
      title: input.title,
      destination: input.destination,
      country: input.country,
      duration_nights: input.durationNights,
      tagline: input.tagline ?? null,
      overview: input.overview,
      host_id: input.hostId ?? null,
      content_status: 'draft',
    })
    .select('id')
    .single();
  if (error) throw error;
  return (data as { id: string }).id;
}

/**
 * Updates only the trip's core content fields. Deliberately never touches
 * `content_status` — status transitions are `transitionTripStatus`'s job
 * alone, so "save" can never accidentally publish (Phase 4.3's own
 * "Save/Publish semantics" requirement).
 */
export async function updateTripCore(id: string, input: TripCoreInput): Promise<void> {
  const admin = createAdminClient();
  const { error } = await admin
    .from('trips')
    .update({
      slug: input.slug,
      title: input.title,
      destination: input.destination,
      country: input.country,
      duration_nights: input.durationNights,
      tagline: input.tagline ?? null,
      overview: input.overview,
      host_id: input.hostId ?? null,
    })
    .eq('id', id);
  if (error) throw error;
}

/**
 * The one place a trip's `content_status` ever changes. Re-validates the
 * transition against `canTransition` even though every caller already
 * checked it via `requireAdminRole` + the admin UI's own button set — this
 * is the actual enforcement point, not a redundant formality: nothing
 * about a Server Action's form submission guarantees the browser actually
 * respected which buttons it was shown.
 *
 * `published_at` follows `trips_published_at_matches_status`'s CHECK
 * constraint exactly: set once, on the transition INTO `published`; never
 * cleared on the way to `archived` (archived keeps its publish history —
 * see that constraint's own migration comment).
 */
export async function transitionTripStatus(
  id: string,
  role: AdminRole,
  from: ContentStatus,
  to: ContentStatus,
): Promise<void> {
  if (!canTransition(role, from, to)) {
    throw new Error(`Role "${role}" may not move a trip from "${from}" to "${to}".`);
  }

  const admin = createAdminClient();
  const { error } = await admin
    .from('trips')
    .update({
      content_status: to,
      ...(to === 'published' ? { published_at: new Date().toISOString() } : {}),
    })
    .eq('id', id)
    .eq('content_status', from); // Optimistic guard: fails silently-safe if another admin already moved it.
  if (error) throw error;
}

export async function addItineraryDay(tripId: string, input: ItineraryDayInput): Promise<void> {
  const admin = createAdminClient();
  const { error } = await admin.from('itinerary_days').insert({
    trip_id: tripId,
    day_number: input.dayNumber,
    title: input.title,
    summary: input.summary,
  });
  if (error) throw error;
}

export async function deleteItineraryDay(dayId: string): Promise<void> {
  const admin = createAdminClient();
  const { error } = await admin.from('itinerary_days').delete().eq('id', dayId);
  if (error) throw error;
}

export async function addInclusion(tripId: string, input: ListLabelInput): Promise<void> {
  const admin = createAdminClient();
  const { error } = await admin
    .from('trip_inclusions')
    .insert({ trip_id: tripId, label: input.label });
  if (error) throw error;
}

export async function deleteInclusion(rowId: string): Promise<void> {
  const admin = createAdminClient();
  const { error } = await admin.from('trip_inclusions').delete().eq('id', rowId);
  if (error) throw error;
}

export async function addExclusion(tripId: string, input: ListLabelInput): Promise<void> {
  const admin = createAdminClient();
  const { error } = await admin
    .from('trip_exclusions')
    .insert({ trip_id: tripId, label: input.label });
  if (error) throw error;
}

export async function deleteExclusion(rowId: string): Promise<void> {
  const admin = createAdminClient();
  const { error } = await admin.from('trip_exclusions').delete().eq('id', rowId);
  if (error) throw error;
}

/**
 * Creates a departure under `tripId`. Never writes to `trips` — the
 * trip/departure separation Phase 4.1 established (`docs/DATABASE.md` §3)
 * means a departure write is always scoped to `trip_departures` and its own
 * logistics tables alone, never the trip content row itself.
 */
export async function createDeparture(tripId: string, input: DepartureInput): Promise<void> {
  const admin = createAdminClient();
  const { error } = await admin.from('trip_departures').insert({
    trip_id: tripId,
    departure_date: input.departureDate,
    return_date: input.returnDate ?? null,
    price_amount: input.priceAmount ?? null,
    price_currency: input.priceCurrency ?? null,
    capacity: input.capacity ?? null,
    status: input.status,
  });
  if (error) throw error;
}

/** Updates one departure's own fields only — see `createDeparture`'s comment on the trip/departure boundary. */
export async function updateDeparture(departureId: string, input: DepartureInput): Promise<void> {
  const admin = createAdminClient();
  const { error } = await admin
    .from('trip_departures')
    .update({
      departure_date: input.departureDate,
      return_date: input.returnDate ?? null,
      price_amount: input.priceAmount ?? null,
      price_currency: input.priceCurrency ?? null,
      capacity: input.capacity ?? null,
      status: input.status,
    })
    .eq('id', departureId);
  if (error) throw error;
}

export async function deleteDeparture(departureId: string): Promise<void> {
  const admin = createAdminClient();
  const { error } = await admin.from('trip_departures').delete().eq('id', departureId);
  if (error) throw error;
}
