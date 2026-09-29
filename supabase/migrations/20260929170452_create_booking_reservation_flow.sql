-- Traveller booking & reservation flow — Phase 4.6.
--
-- Phase 4.4 built the durable booking record and the atomic seat-
-- reservation primitive (`bookings_reserve_seats`/`bookings_release_seats`)
-- but no write path ever called them — no booking-creation UI, no Server
-- Action, existed to use them. This migration adds exactly the two things
-- that were missing before a real booking flow could exist safely:
--
--   1. Pending-hold expiry — Phase 4.4 never gave a `pending` booking a
--      lifetime, so a reservation that never converts to `confirmed` would
--      hold its seats forever. `bookings.expires_at` plus
--      `release_expired_booking_holds()` close that gap.
--   2. `create_pending_booking()` — the one atomic entry point a Server
--      Action calls to create a booking AND its participants together, so
--      "a failed reservation must not create a partial booking" is a
--      database guarantee (one function call is one transaction), not an
--      application-layer convention that a crash between two separate
--      inserts could violate.
--
-- Both extend, never replace, Phase 4.4's own trigger architecture —
-- `bookings_before_insert`/`_before_update` still own seat arithmetic and
-- status-transition validity; this migration adds to the FRONT of the
-- insert path (expire stale holds before reserving) and provides the one
-- new way anything is allowed to reach it.

-- ============================================================ expiry --

alter table public.bookings add column expires_at timestamptz;

comment on column public.bookings.expires_at is
  'Set automatically for every pending booking at insert time (see '
  'bookings_before_insert below) — null for confirmed/cancelled/completed '
  'bookings, which no longer hold a time-limited claim on inventory.';

-- Cancels every pending booking whose hold has lapsed. Reuses
-- `bookings_before_update_trigger` (Phase 4.4) rather than duplicating its
-- seat-release logic — a plain status UPDATE through that trigger is
-- already the correct, tested way to release a pending booking's seats.
-- Idempotent by construction: the WHERE clause only ever matches rows
-- still `pending`, so calling this twice in a row (or concurrently) is a
-- no-op the second time for any row the first call already moved to
-- `cancelled` — there is no state this can double-release from.
--
-- Not wired to a scheduler this phase (none exists yet) — called from
-- inside `bookings_before_insert` below so every new booking attempt
-- first reclaims any capacity stale holds were sitting on, which is
-- sufficient correctness without a cron job. The function stays a
-- standalone, independently callable entry point specifically so a future
-- scheduled job (pg_cron, an Edge Function on a timer, ...) can also call
-- it directly without this migration needing to change.
create function public.release_expired_booking_holds()
returns integer
language plpgsql
as $$
declare
  v_count integer;
begin
  with released as (
    update public.bookings
    set status = 'cancelled'
    where status = 'pending'
      and expires_at is not null
      and expires_at < now()
    returning 1
  )
  select count(*) into v_count from released;
  return v_count;
end;
$$;

-- Extends Phase 4.4's own `bookings_before_insert`: expire stale holds
-- FIRST (reclaiming any capacity they were sitting on), then default a new
-- pending booking's `expires_at` when the caller didn't set one, then
-- reserve seats exactly as before. All three steps run inside the same
-- statement's implicit transaction as the row's own insert, so a booking
-- can still never exist without the capacity that justified it having
-- actually been reserved — Phase 4.4's original guarantee, unchanged.
create or replace function public.bookings_before_insert()
returns trigger
language plpgsql
as $$
begin
  if new.status is distinct from 'pending' then
    raise exception 'New bookings must start pending, not "%"', new.status;
  end if;

  perform public.release_expired_booking_holds();

  if new.expires_at is null then
    new.expires_at := now() + interval '30 minutes';
  end if;

  perform public.bookings_reserve_seats(new.trip_departure_id, new.participant_count);
  return new;
end;
$$;

-- A booking leaving `pending` (confirmed or cancelled) no longer holds a
-- time-limited claim — clearing `expires_at` means a future scheduled
-- cleanup job never has to re-check `status` to know whether a row is
-- still relevant to it; `expires_at is not null` alone is a complete filter.
create or replace function public.bookings_before_update()
returns trigger
language plpgsql
as $$
begin
  if new.status is distinct from old.status then
    if not public.booking_status_transition_is_valid(old.status, new.status) then
      raise exception 'Invalid booking status transition: % -> %', old.status, new.status;
    end if;

    if new.status = 'cancelled' then
      perform public.bookings_release_seats(
        old.trip_departure_id,
        old.participant_count,
        old.status = 'confirmed'
      );
      new.expires_at := null;
    elsif new.status = 'confirmed' then
      perform public.bookings_confirm_seats(old.trip_departure_id, old.participant_count);
      new.expires_at := null;
    end if;
  end if;

  return new;
end;
$$;

-- ==================================================== idempotency ------

-- A client-generated key, one per booking-review session (see
-- lib/booking/*'s own docs for the full contract) — NOT a distributed
-- idempotency system: a single nullable, uniquely-indexed column
-- `create_pending_booking` below checks before inserting. A caller that
-- never supplies one (any direct SQL, or a future internal tool) simply
-- gets ordinary, non-deduplicated inserts — this is strictly additive.
alter table public.bookings add column idempotency_key uuid;

create unique index bookings_idempotency_key_unique
  on public.bookings (idempotency_key)
  where idempotency_key is not null;

-- ============================================== booking creation --------

-- The one atomic entry point for creating a booking with its participants.
-- Re-validates the departure itself (bookable status, published trip)
-- INSIDE this function rather than trusting the caller already did —
-- defense in depth against a race between an application-layer check and
-- this insert, and the one place server-derived pricing actually happens:
-- price/currency/dates/title/slug/destination are read from `trips`/
-- `trip_departures` HERE, never accepted as parameters, so nothing the
-- browser submits can influence the commercial snapshot.
--
-- Raises a distinguishable 'BOOKING_ERROR: <code>' message for every
-- expected rejection reason, so the calling application layer
-- (lib/booking/repository.ts) can show a traveller-friendly message
-- without ever parsing or displaying a raw Postgres error.
--
-- Called only via the service-role client (lib/supabase/admin.ts), after
-- an application-layer check — bookings/booking_participants have no
-- `anon`/`authenticated` INSERT policy (Phase 4.4's own deliberate RLS
-- stance, unchanged by this phase), so this function's inserts rely on
-- that same bypass, exactly like every existing admin write in
-- lib/admin/repository.ts. Not `security definer`: it never needs to run
-- as anyone other than its caller, and the service-role client already has
-- the privilege this needs.
create function public.create_pending_booking(
  p_trip_departure_id uuid,
  p_traveller_id uuid,
  p_contact_name text,
  p_contact_email text,
  p_contact_phone text,
  p_participants jsonb,
  p_idempotency_key uuid
)
returns public.bookings
language plpgsql
as $$
declare
  v_departure record;
  v_trip record;
  v_participant_count integer;
  v_existing public.bookings;
  v_booking public.bookings;
  v_participant record;
begin
  -- Idempotent replay: the same key returns the same booking rather than
  -- creating a second one or erroring — a double-click/retry is a no-op,
  -- not a duplicate.
  if p_idempotency_key is not null then
    select * into v_existing from public.bookings where idempotency_key = p_idempotency_key;
    if found then
      return v_existing;
    end if;
  end if;

  v_participant_count := coalesce(jsonb_array_length(p_participants), 0);
  if v_participant_count < 1 then
    raise exception 'BOOKING_ERROR: NO_PARTICIPANTS';
  end if;

  select id, departure_date, return_date, price_amount, price_currency, status, trip_id
    into v_departure
    from public.trip_departures
    where id = p_trip_departure_id
    for update;
  if not found then
    raise exception 'BOOKING_ERROR: DEPARTURE_NOT_FOUND';
  end if;

  if v_departure.status not in ('booking_open', 'almost_full') then
    raise exception 'BOOKING_ERROR: DEPARTURE_NOT_BOOKABLE';
  end if;

  select id, slug, title, destination, content_status
    into v_trip
    from public.trips
    where id = v_departure.trip_id;
  if not found or v_trip.content_status is distinct from 'published' then
    raise exception 'BOOKING_ERROR: TRIP_NOT_PUBLISHED';
  end if;

  -- The insert itself: status/expires_at/reference are all trigger-owned
  -- (Phase 4.4 + the expiry extension above); seat reservation happens as
  -- part of the same statement via `bookings_before_insert`, so
  -- insufficient capacity raises here and this entire function — including
  -- the participant inserts below — rolls back with it.
  insert into public.bookings (
    trip_departure_id, traveller_id, contact_name, contact_email, contact_phone,
    participant_count, snapshot_trip_title, snapshot_trip_slug, snapshot_destination,
    snapshot_departure_date, snapshot_return_date, snapshot_price_amount,
    snapshot_price_currency, idempotency_key
  ) values (
    p_trip_departure_id, p_traveller_id, p_contact_name, p_contact_email, p_contact_phone,
    v_participant_count, v_trip.title, v_trip.slug, v_trip.destination,
    v_departure.departure_date, v_departure.return_date, v_departure.price_amount,
    v_departure.price_currency, p_idempotency_key
  )
  returning * into v_booking;

  for v_participant in select * from jsonb_to_recordset(p_participants) as t(full_name text, is_lead boolean)
  loop
    insert into public.booking_participants (booking_id, full_name, is_lead)
    values (v_booking.id, v_participant.full_name, coalesce(v_participant.is_lead, false));
  end loop;

  return v_booking;
end;
$$;

-- ================================================================ RLS --

-- The narrowest read policy the Phase 4.6 brief authorizes: a signed-in
-- traveller may read their OWN bookings (e.g. revisiting the confirmation
-- page after a refresh) — never another traveller's, never a guest
-- booking (traveller_id is null for those; `auth.uid() = traveller_id` can
-- never match a null). No corresponding policy for `booking_participants`
-- or `payments` — nothing built this phase reads either back, and adding
-- an unused policy would be exactly the "table gets a feature merely
-- because it's possible" this project's conventions warn against. Guest
-- bookings remain reachable only via the creation call's own direct
-- return value (lib/booking/actions.ts) — never a "reference alone grants
-- access" read path.
create policy "a traveller can read their own bookings"
  on public.bookings
  for select
  to authenticated
  using (auth.uid() = traveller_id);
