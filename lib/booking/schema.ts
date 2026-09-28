/**
 * Hand-maintained row types for the Phase 4.4 booking domain, refining
 * `lib/supabase/database.types.ts` the same way `lib/content/db/schema.ts`
 * and `lib/admin/roles.ts` do for their own tables — see either's header
 * for the full reasoning. Exists specifically for `BookingStatus` and
 * `PaymentStatus`, which generate as plain `string` in the real generated
 * types (CHECK constraints, not Postgres enums).
 */
import type { BookingStatus } from './status';

export interface BookingRow {
  id: string;
  reference: string;
  trip_departure_id: string;
  traveller_id: string | null;
  contact_name: string;
  contact_email: string;
  contact_phone: string | null;
  participant_count: number;
  status: BookingStatus;
  snapshot_trip_title: string;
  snapshot_trip_slug: string;
  snapshot_destination: string;
  snapshot_departure_date: string;
  snapshot_return_date: string | null;
  snapshot_price_amount: number;
  snapshot_price_currency: string;
  created_at: string;
  updated_at: string;
}

export interface BookingParticipantRow {
  id: string;
  booking_id: string;
  full_name: string;
  is_lead: boolean;
  created_at: string;
}

export type PaymentStatus = 'pending' | 'succeeded' | 'failed' | 'refunded';

export interface PaymentRow {
  id: string;
  booking_id: string;
  provider: string;
  provider_reference: string | null;
  amount: number;
  currency: string;
  status: PaymentStatus;
  captured_at: string | null;
  created_at: string;
  updated_at: string;
}
