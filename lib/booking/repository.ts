import 'server-only';

import { createAdminClient } from '@/lib/supabase/admin';
import { createClient } from '@/lib/supabase/server';

import type { BookingCreateInput } from './validation';

/**
 * Server-only booking data access — Phase 4.6.
 *
 * READS (`fetchBookableDepartureSummary`) use the session-aware client —
 * the same public RLS policies that already let `/trips/[slug]` read
 * published trips/departures cover this too, so a display-only read needs
 * no elevated privilege (docs/SECURITY.md §2 rule 7, the same reasoning
 * `lib/admin/repository.ts`'s own header gives for its reads).
 *
 * WRITES (`createPendingBooking`) use the service-role client: `bookings`/
 * `booking_participants` have no `anon`/`authenticated` INSERT policy at
 * all (Phase 4.4's deliberate RLS stance, unchanged) — exactly the
 * "every current access path is the service-role client only, after an
 * application-layer authorization check" pattern that migration's own RLS
 * comment prescribes, reusing Phase 4.3's `lib/admin/` precedent rather
 * than inventing a second one. The "application-layer authorization check"
 * here is simply: a guest may always attempt a booking; an authenticated
 * traveller's `traveller_id` is derived from their own session
 * server-side, never accepted as a parameter a caller could forge (see
 * `app/booking/[departureId]/actions.ts`, the only caller).
 */

export interface BookableDepartureSummary {
  tripId: string;
  tripTitle: string;
  tripSlug: string;
  destination: string;
  durationNights: number;
  departureDate: string;
  returnDate: string | null;
  priceAmount: number;
  priceCurrency: string;
  status: string;
  seatsLeft: number | null;
}

interface DepartureSummaryRow {
  departure_date: string;
  return_date: string | null;
  price_amount: number | null;
  price_currency: string | null;
  status: string;
  capacity: number | null;
  seats_reserved: number;
  trips: {
    id: string;
    title: string;
    slug: string;
    destination: string;
    duration_nights: number;
  } | null;
}

/**
 * Display-only context for `/booking/[departureId]` — NOT the authoritative
 * price/availability check a booking submission relies on (that happens a
 * second time, authoritatively, inside `create_pending_booking` itself).
 * Returns `null` for a departure that doesn't exist, or whose trip RLS
 * hides from the current (possibly anonymous) reader — indistinguishable
 * from "doesn't exist" on purpose, matching `getTripBySlug`'s own
 * "unknown vs. hidden" convention (`lib/content/queries.ts`).
 */
export async function fetchBookableDepartureSummary(
  tripDepartureId: string,
): Promise<BookableDepartureSummary | null> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from('trip_departures')
    .select(
      'departure_date, return_date, price_amount, price_currency, status, capacity, seats_reserved, trips ( id, title, slug, destination, duration_nights )',
    )
    .eq('id', tripDepartureId)
    .maybeSingle<DepartureSummaryRow>();

  if (error || !data || !data.trips || data.price_amount === null || data.price_currency === null) {
    return null;
  }

  const seatsLeft =
    data.capacity !== null ? Math.max(data.capacity - data.seats_reserved, 0) : null;

  return {
    tripId: data.trips.id,
    tripTitle: data.trips.title,
    tripSlug: data.trips.slug,
    destination: data.trips.destination,
    durationNights: data.trips.duration_nights,
    departureDate: data.departure_date,
    returnDate: data.return_date,
    priceAmount: data.price_amount,
    priceCurrency: data.price_currency,
    status: data.status,
    seatsLeft,
  };
}

export type BookingCreationErrorCode =
  | 'DEPARTURE_NOT_FOUND'
  | 'DEPARTURE_NOT_BOOKABLE'
  | 'TRIP_NOT_PUBLISHED'
  | 'NO_PARTICIPANTS'
  | 'INSUFFICIENT_CAPACITY'
  | 'UNKNOWN';

export interface SafeBookingResult {
  reference: string;
  status: string;
  participantCount: number;
  snapshotTripTitle: string;
  snapshotDestination: string;
  snapshotDepartureDate: string;
  snapshotReturnDate: string | null;
  snapshotPriceAmount: number;
  snapshotPriceCurrency: string;
  expiresAt: string | null;
  createdAt: string;
}

export type CreateBookingResult =
  { ok: true; booking: SafeBookingResult } | { ok: false; errorCode: BookingCreationErrorCode };

interface CreatePendingBookingParams extends BookingCreateInput {
  /** Derived server-side from the session — never accepted from the client directly. */
  travellerId: string | null;
}

const KNOWN_ERROR_CODES: readonly BookingCreationErrorCode[] = [
  'DEPARTURE_NOT_FOUND',
  'DEPARTURE_NOT_BOOKABLE',
  'TRIP_NOT_PUBLISHED',
  'NO_PARTICIPANTS',
];

/**
 * Creates a pending booking with its participants, atomically, via the
 * `create_pending_booking` Postgres function
 * (`supabase/migrations/20260929170452_*.sql`) — one RPC call is one
 * transaction, so "a failed reservation must not create a partial
 * booking" is a database guarantee, not an application-layer promise a
 * crash between two separate inserts could break.
 *
 * Every rejection the function can raise maps to a known
 * `BookingCreationErrorCode`; anything else (a raw Postgres error, a
 * connectivity failure) collapses to `'UNKNOWN'` — this function never
 * lets a raw SQL error message reach its caller (docs/SECURITY.md: never
 * expose raw database errors).
 */
export async function createPendingBooking(
  params: CreatePendingBookingParams,
): Promise<CreateBookingResult> {
  const supabase = createAdminClient();

  // `p_traveller_id`/`p_contact_phone` are genuinely nullable at the SQL
  // level (uuid/text params with no `not null`), but `supabase gen types`
  // has no way to see that from a plain parameter declaration — it always
  // types generated RPC args as non-null. The casts below are that codegen
  // gap, not a claim these values can't actually be null at runtime.
  const { data, error } = await supabase.rpc('create_pending_booking', {
    p_trip_departure_id: params.tripDepartureId,
    p_traveller_id: params.travellerId as unknown as string,
    p_contact_name: params.contactName,
    p_contact_email: params.contactEmail,
    p_contact_phone: (params.contactPhone ?? null) as unknown as string,
    p_participants: params.participants.map((p) => ({
      full_name: p.fullName,
      is_lead: p.isLead ?? false,
    })),
    p_idempotency_key: params.idempotencyKey,
  });

  if (error || !data) {
    const message = error?.message ?? '';
    const matchedCode = KNOWN_ERROR_CODES.find((code) => message.includes(code));
    if (matchedCode) return { ok: false, errorCode: matchedCode };
    if (message.toLowerCase().includes('not enough capacity')) {
      return { ok: false, errorCode: 'INSUFFICIENT_CAPACITY' };
    }
    return { ok: false, errorCode: 'UNKNOWN' };
  }

  const row = data as {
    reference: string;
    status: string;
    participant_count: number;
    snapshot_trip_title: string;
    snapshot_destination: string;
    snapshot_departure_date: string;
    snapshot_return_date: string | null;
    snapshot_price_amount: number;
    snapshot_price_currency: string;
    expires_at: string | null;
    created_at: string;
  };

  return {
    ok: true,
    booking: {
      reference: row.reference,
      status: row.status,
      participantCount: row.participant_count,
      snapshotTripTitle: row.snapshot_trip_title,
      snapshotDestination: row.snapshot_destination,
      snapshotDepartureDate: row.snapshot_departure_date,
      snapshotReturnDate: row.snapshot_return_date,
      snapshotPriceAmount: row.snapshot_price_amount,
      snapshotPriceCurrency: row.snapshot_price_currency,
      expiresAt: row.expires_at,
      createdAt: row.created_at,
    },
  };
}
