-- Departure-scoped logistics — accommodation, transport, meeting point.
-- docs/DATABASE.md §3, already explicitly scoped to `trip_departure_id`
-- there (not `trip_id`): unlike the trip-content tables in the earlier
-- migration, these three genuinely vary per scheduled batch — a specific
-- departure's confirmed hotel, flight and meeting arrangements, not a
-- description of the trip product in the abstract.

-- Shared by every policy below: a departure's logistics are visible
-- exactly when the departure itself would be (non-draft status, parent
-- trip published) — the same rule `trip_departures`' own SELECT policy
-- encodes, centralized here so it isn't retyped, and risks drifting, three
-- more times.
create function public.trip_departure_is_visible(p_departure_id uuid)
returns boolean
language sql
stable
as $$
  select exists (
    select 1
    from public.trip_departures d
    where d.id = p_departure_id
      and d.status <> 'draft'
      and public.trip_is_published(d.trip_id)
  );
$$;

-- ==================================================== trip_accommodation --

-- One row per accommodation leg (docs/DATABASE.md: "a departure may use
-- more than one property"). `type` is free text ("Boutique hotel",
-- "3 & 4 Star Premium Hotel") — a fixed enum can't anticipate every real
-- WWS property type, matching `TripAccommodation.type` in
-- lib/content/types.ts exactly.
create table public.trip_accommodation (
  id uuid primary key default gen_random_uuid(),
  trip_departure_id uuid not null references public.trip_departures (id) on delete cascade,
  name text check (name is null or btrim(name) <> ''),
  type text check (type is null or btrim(type) <> ''),
  description text check (description is null or btrim(description) <> ''),
  nights integer check (nights is null or nights > 0),
  media_id uuid references public.trip_media (id) on delete set null,
  display_order integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index trip_accommodation_departure_id_idx
  on public.trip_accommodation (trip_departure_id, display_order);

create trigger trip_accommodation_set_updated_at
  before update on public.trip_accommodation
  for each row
  execute function public.set_updated_at();

alter table public.trip_accommodation enable row level security;

create policy "accommodation of visible departures is publicly readable"
  on public.trip_accommodation
  for select
  to anon, authenticated
  using (public.trip_departure_is_visible(trip_departure_id));

-- ========================================================= trip_transport --

-- One row per transport leg — "a departure may combine several: a flight,
-- a transfer, a train" (docs/DATABASE.md).
create table public.trip_transport (
  id uuid primary key default gen_random_uuid(),
  trip_departure_id uuid not null references public.trip_departures (id) on delete cascade,
  mode text not null check (btrim(mode) <> ''),
  description text check (description is null or btrim(description) <> ''),
  display_order integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index trip_transport_departure_id_idx
  on public.trip_transport (trip_departure_id, display_order);

create trigger trip_transport_set_updated_at
  before update on public.trip_transport
  for each row
  execute function public.set_updated_at();

alter table public.trip_transport enable row level security;

create policy "transport of visible departures is publicly readable"
  on public.trip_transport
  for select
  to anon, authenticated
  using (public.trip_departure_is_visible(trip_departure_id));

-- ==================================================== trip_meeting_points --

-- Exactly one per departure (docs/DATABASE.md: "not one-to-many — a
-- departure has exactly one meeting point today"), enforced with a unique
-- constraint on `trip_departure_id` rather than a plain foreign key, so
-- the one-to-one cardinality is a real database invariant and not just an
-- application convention nobody has broken yet.
create table public.trip_meeting_points (
  id uuid primary key default gen_random_uuid(),
  trip_departure_id uuid not null unique references public.trip_departures (id) on delete cascade,
  location text not null check (btrim(location) <> ''),
  -- `meeting_time`, not `time`: avoids the built-in `time` type name as a
  -- column identifier entirely rather than relying on it being merely a
  -- non-reserved keyword. Free text, matching `TripMeetingPoint.time`
  -- (lib/content/types.ts) — a human-readable instruction ("7:00 AM at the
  -- lobby"), not a `time` value to compute with.
  meeting_time text check (meeting_time is null or btrim(meeting_time) <> ''),
  instructions text check (instructions is null or btrim(instructions) <> ''),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create trigger trip_meeting_points_set_updated_at
  before update on public.trip_meeting_points
  for each row
  execute function public.set_updated_at();

alter table public.trip_meeting_points enable row level security;

create policy "meeting point of visible departures is publicly readable"
  on public.trip_meeting_points
  for select
  to anon, authenticated
  using (public.trip_departure_is_visible(trip_departure_id));
