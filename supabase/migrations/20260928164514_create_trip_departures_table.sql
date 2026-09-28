-- trip_departures — a specific scheduled, sellable occurrence of a trip.
-- docs/DATABASE.md §3, §12.
--
-- This is the COMMERCIAL side the architecture principle for this phase
-- exists to separate out from `trips`: dates, price, capacity, seats and
-- the departure's own operational status. `status` here is the "Trip
-- departure" state model from docs/DATABASE.md §12 (DRAFT -> PUBLISHED ->
-- BOOKING_OPEN -> ALMOST_FULL -> SOLD_OUT -> IN_PROGRESS -> COMPLETED) —
-- a DIFFERENT enum from `trips.content_status`. A trip can be
-- `published` while every one of its departures sits in `draft`, and a
-- departure can be `booking_open` while a content correction for its trip
-- is still in `review` (docs/DATABASE.md §12's own example).
--
-- `TripAvailability`'s app-facing `status` (`open | almost-full |
-- waitlisted | sold-out`) is deliberately NOT a second column here: it is
-- a simplified display signal derivable from `status` + `capacity` +
-- `seats_reserved` at query time (future work, once `lib/content/queries.ts`
-- actually reads from this table — out of scope this phase), not an
-- independent fact to store and risk drifting out of sync with the
-- capacity numbers it summarizes.

create table public.trip_departures (
  id uuid primary key default gen_random_uuid(),
  trip_id uuid not null references public.trips (id) on delete cascade,

  departure_date date not null,
  -- Nullable: `TripPreview` carries no explicit return date today (only
  -- `durationNights` on the trip), so this is forward-looking storage for
  -- when a departure's actual return date is confirmed, not something the
  -- current domain model requires populated.
  return_date date,

  -- Money is never floating point. Nullable together with currency,
  -- matching `DraftTripDetail`/`draftTripDetailSchema` (Phase 3.7): a
  -- departure can exist — and even be under active review — before a
  -- price has been set, and this phase must never fabricate one.
  price_amount numeric(12, 2) check (price_amount is null or price_amount > 0),
  price_currency char(3) check (price_currency is null or price_currency ~ '^[A-Z]{3}$'),

  capacity integer check (capacity is null or capacity > 0),
  seats_reserved integer not null default 0 check (seats_reserved >= 0),
  seats_confirmed integer not null default 0 check (seats_confirmed >= 0),

  guide_id uuid references public.guides (id) on delete set null,

  status text not null default 'draft' check (
    status in ('draft', 'published', 'booking_open', 'almost_full', 'sold_out', 'in_progress', 'completed')
  ),

  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),

  constraint trip_departures_price_pair check (
    (price_amount is null and price_currency is null)
    or (price_amount is not null and price_currency is not null)
  ),
  constraint trip_departures_return_after_departure check (
    return_date is null or return_date >= departure_date
  ),
  constraint trip_departures_seats_within_capacity check (
    capacity is null or (seats_reserved <= capacity and seats_confirmed <= capacity)
  ),
  -- Confirmed seats are a subset of reserved seats (a seat is reserved
  -- before, or at the same time as, it is confirmed) — not two
  -- independent counters that could silently disagree.
  constraint trip_departures_confirmed_within_reserved check (seats_confirmed <= seats_reserved)
);

create index trip_departures_trip_id_idx on public.trip_departures (trip_id);
create index trip_departures_departure_date_idx on public.trip_departures (departure_date);
create index trip_departures_status_idx on public.trip_departures (status);
create index trip_departures_guide_id_idx on public.trip_departures (guide_id) where guide_id is not null;

create trigger trip_departures_set_updated_at
  before update on public.trip_departures
  for each row
  execute function public.set_updated_at();

-- RLS — "Do not treat 'published' as equivalent to 'available'": a
-- departure is publicly visible only when it is genuinely announced
-- (status is anything but the internal `draft` state) AND its parent
-- trip's content is itself published. Either condition failing hides the
-- row from anon/authenticated — a `booking_open` departure under a still-
-- `draft` trip is exactly the "accidental access to administrative/draft
-- content" this phase's security requirements call out.
alter table public.trip_departures enable row level security;

create policy "non-draft departures of published trips are publicly readable"
  on public.trip_departures
  for select
  to anon, authenticated
  using (
    status <> 'draft'
    and public.trip_is_published(trip_id)
  );
