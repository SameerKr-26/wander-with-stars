import 'server-only';

import type { BookingStatus } from '@/lib/booking/status';
import type { PaymentStatus } from '@/lib/booking/schema';
import { createClient } from '@/lib/supabase/server';

import { groupBookings, pickAuthoritativePayment, type GroupedBookings } from './grouping';

/**
 * Traveller-facing dashboard reads — Phase 4.8.
 *
 * Uses ONLY the session-aware client (`lib/supabase/server.ts`) — never
 * `lib/supabase/admin.ts`. Every read here is something the signed-in
 * traveller is already allowed to see under RLS (`bookings`'s own Phase
 * 4.6 "a traveller can read their own bookings" policy, plus this phase's
 * own migration extending that same ownership rule to
 * `booking_participants` and `payments`), so no service-role escalation is
 * needed or wanted — this is exactly the "ordinary traveller dashboard
 * reads never use the service role" rule this phase's brief states
 * explicitly.
 *
 * Every function additionally takes `travellerId` and re-checks it against
 * the row returned, rather than trusting "RLS already filtered this" alone
 * — this phase's own "every booking detail read must independently verify
 * ownership" requirement. Belt and suspenders: RLS is the real database-
 * level boundary; the explicit check here means a future bug in a policy
 * (or a future admin/service-role caller added carelessly) still can't
 * leak another traveller's booking through this module.
 */

export interface TravellerBookingSummary {
  id: string;
  reference: string;
  status: BookingStatus;
  participantCount: number;
  snapshotTripTitle: string;
  snapshotTripSlug: string;
  snapshotDestination: string;
  snapshotDepartureDate: string;
  snapshotReturnDate: string | null;
  snapshotPriceAmount: number;
  snapshotPriceCurrency: string;
  createdAt: string;
  /** From the authoritative payment record — `null` when no payment attempt exists yet. */
  paymentStatus: PaymentStatus | null;
}

export interface TravellerBookingParticipant {
  id: string;
  fullName: string;
  isLead: boolean;
}

export interface TravellerBookingDetail extends TravellerBookingSummary {
  contactName: string;
  contactEmail: string;
  contactPhone: string | null;
  participants: TravellerBookingParticipant[];
}

interface BookingSummaryRow {
  id: string;
  reference: string;
  status: BookingStatus;
  participant_count: number;
  snapshot_trip_title: string;
  snapshot_trip_slug: string;
  snapshot_destination: string;
  snapshot_departure_date: string;
  snapshot_return_date: string | null;
  snapshot_price_amount: number;
  snapshot_price_currency: string;
  created_at: string;
  traveller_id: string | null;
  payments: { status: PaymentStatus; created_at: string }[] | null;
}

const BOOKING_SUMMARY_COLUMNS =
  'id, reference, status, participant_count, snapshot_trip_title, snapshot_trip_slug, ' +
  'snapshot_destination, snapshot_departure_date, snapshot_return_date, snapshot_price_amount, ' +
  'snapshot_price_currency, created_at, traveller_id, payments ( status, created_at )';

function toSummary(row: BookingSummaryRow): TravellerBookingSummary {
  const authoritativePayment = pickAuthoritativePayment(
    (row.payments ?? []).map((p) => ({ status: p.status, createdAt: p.created_at })),
  );

  return {
    id: row.id,
    reference: row.reference,
    status: row.status,
    participantCount: row.participant_count,
    snapshotTripTitle: row.snapshot_trip_title,
    snapshotTripSlug: row.snapshot_trip_slug,
    snapshotDestination: row.snapshot_destination,
    snapshotDepartureDate: row.snapshot_departure_date,
    snapshotReturnDate: row.snapshot_return_date,
    snapshotPriceAmount: row.snapshot_price_amount,
    snapshotPriceCurrency: row.snapshot_price_currency,
    createdAt: row.created_at,
    paymentStatus: authoritativePayment?.status ?? null,
  };
}

/**
 * Every booking belonging to the signed-in traveller, grouped into
 * upcoming/past/cancelled. `traveller_id = null` (guest bookings) can
 * never match `.eq('traveller_id', travellerId)` for a real uuid, so a
 * guest booking is structurally excluded here before RLS is even
 * consulted — this phase's own "guest bookings must never appear in an
 * authenticated dashboard" requirement, enforced twice.
 */
export async function fetchTravellerBookingGroups(
  travellerId: string,
): Promise<GroupedBookings<TravellerBookingSummary>> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from('bookings')
    .select(BOOKING_SUMMARY_COLUMNS)
    .eq('traveller_id', travellerId)
    .order('snapshot_departure_date', { ascending: true });

  if (error || !data) return { upcoming: [], past: [], cancelled: [] };

  const summaries = (data as unknown as BookingSummaryRow[])
    .filter((row) => row.traveller_id === travellerId)
    .map(toSummary);

  return groupBookings(summaries);
}

interface BookingDetailRow extends BookingSummaryRow {
  contact_name: string;
  contact_email: string;
  contact_phone: string | null;
  booking_participants: { id: string; full_name: string; is_lead: boolean }[] | null;
}

/**
 * A single booking's full detail, for `/dashboard/bookings/[bookingId]`.
 * Returns `null` for a booking that doesn't exist, isn't this traveller's
 * own (RLS already hides it; the `traveller_id` check below is the
 * independent, application-layer confirmation of the same fact), or is a
 * guest booking — indistinguishable from "doesn't exist" on purpose,
 * matching every other "unknown vs. not yours" read in this codebase
 * (`fetchBookableDepartureSummary`, `getTripBySlug`).
 */
export async function fetchTravellerBookingDetail(
  bookingId: string,
  travellerId: string,
): Promise<TravellerBookingDetail | null> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from('bookings')
    .select(
      `${BOOKING_SUMMARY_COLUMNS}, contact_name, contact_email, contact_phone, booking_participants ( id, full_name, is_lead )`,
    )
    .eq('id', bookingId)
    .maybeSingle();

  if (error || !data) return null;

  const row = data as unknown as BookingDetailRow;
  if (row.traveller_id !== travellerId) return null;

  return {
    ...toSummary(row),
    contactName: row.contact_name,
    contactEmail: row.contact_email,
    contactPhone: row.contact_phone,
    participants: (row.booking_participants ?? []).map((p) => ({
      id: p.id,
      fullName: p.full_name,
      isLead: p.is_lead,
    })),
  };
}
