-- Trip-scoped content — itinerary, media, inclusions/exclusions, traveller
-- notes, extras, FAQs, policy sections. docs/DATABASE.md §3.
--
-- Every table here is scoped to `trip_id`, not a departure: this is the
-- reusable content that describes the trip itself, independent of which
-- specific batch someone books (departure-specific logistics —
-- accommodation, transport, meeting point — are a later migration in this
-- set, scoped to `trip_departure_id` instead, matching the existing
-- docs/DATABASE.md decision for those three tables specifically).
--
-- `itinerary_activities` (named in this phase's brief as a table to
-- evaluate) is deliberately NOT created here: the current domain model has
-- no activities sub-structure under an itinerary day at all —
-- `TripItineraryDay` (lib/content/types.ts) is `{ day, title, summary }`,
-- explicitly documented as "a deliberately flattened stand-in for
-- Itinerary + Activities... without building the itinerary engine (Phase
-- 5)". Creating an empty activities table with nothing in the application
-- layer to populate it would be exactly the "table merely because it
-- sounds useful" this phase's brief says not to build. `itinerary_days`
-- alone matches today's real shape; a future phase that actually
-- introduces per-activity structure is the right time to add it.

-- Shared by every "is this trip's content publicly visible" policy below —
-- centralizing the join instead of repeating
-- `exists (select 1 from trips where id = trip_id and content_status =
-- 'published')` verbatim in eight separate policies, where a copy-paste
-- slip in just one would silently create a visibility bug.
create function public.trip_is_published(p_trip_id uuid)
returns boolean
language sql
stable
as $$
  select exists (
    select 1 from public.trips
    where id = p_trip_id
      and content_status = 'published'
  );
$$;

-- ======================================================== itinerary_days --

create table public.itinerary_days (
  id uuid primary key default gen_random_uuid(),
  trip_id uuid not null references public.trips (id) on delete cascade,
  day_number integer not null check (day_number > 0),
  title text not null check (btrim(title) <> ''),
  summary text not null check (btrim(summary) <> ''),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  -- Mirrors `tripItinerarySchema`'s array-level check in
  -- lib/content/ingest/schema.ts: no duplicate day numbers for one trip.
  -- (Non-decreasing ORDER is an ingestion-time check on the array as
  -- submitted, not a standing constraint a relational table can express —
  -- rows have no inherent order beyond day_number itself, which callers
  -- sort by.)
  unique (trip_id, day_number)
);

create index itinerary_days_trip_id_idx on public.itinerary_days (trip_id);

create trigger itinerary_days_set_updated_at
  before update on public.itinerary_days
  for each row
  execute function public.set_updated_at();

alter table public.itinerary_days enable row level security;

create policy "itinerary days of published trips are publicly readable"
  on public.itinerary_days
  for select
  to anon, authenticated
  using (public.trip_is_published(trip_id));

-- ============================================================ trip_media --

-- One row per image/video, ordered, with at most one flagged as the trip's
-- hero — a single normalized table serves both `TripPreview.heroMedia`
-- (required, singular) and `TripDetail.gallery` (an ordered list), rather
-- than a redundant duplicate column on `trips` for the hero specifically.
create table public.trip_media (
  id uuid primary key default gen_random_uuid(),
  trip_id uuid not null references public.trips (id) on delete cascade,
  kind text not null check (kind in ('image', 'video', 'placeholder')),
  src text,
  alt text,
  poster text,
  focal_point text check (focal_point is null or focal_point in ('center', 'top', 'bottom')),
  is_hero boolean not null default false,
  display_order integer not null default 0,
  created_at timestamptz not null default now(),
  -- Mirrors `tripMediaSchema`'s discriminated union exactly: `alt` is a
  -- required (possibly empty) string for image/video and entirely absent
  -- for placeholder; a placeholder needs neither src nor poster; an image
  -- needs a src; a video needs both src and poster.
  constraint trip_media_shape check (
    (kind = 'placeholder' and src is null and poster is null and alt is null)
    or (kind = 'image' and src is not null and poster is null and alt is not null)
    or (kind = 'video' and src is not null and poster is not null and alt is not null)
  )
);

create index trip_media_trip_id_idx on public.trip_media (trip_id, display_order);
-- At most one hero row per trip.
create unique index trip_media_one_hero_per_trip
  on public.trip_media (trip_id)
  where is_hero;

alter table public.trip_media enable row level security;

create policy "media of published trips is publicly readable"
  on public.trip_media
  for select
  to anon, authenticated
  using (public.trip_is_published(trip_id));

-- ==================================================== inclusions/exclusions --

-- `TripDetail.inclusions` / `.exclusions` stay plain string lists at the
-- application layer by deliberate, documented choice (lib/content/types.ts:
-- "the existing flat-list convention already works... If a real inclusion
-- ever needs its own description beyond a one-line label, that is the
-- moment to introduce those richer types — not before"). One row per
-- label, ordered, is the direct relational equivalent — not a richer
-- structure the domain model doesn't ask for yet.

create table public.trip_inclusions (
  id uuid primary key default gen_random_uuid(),
  trip_id uuid not null references public.trips (id) on delete cascade,
  label text not null check (btrim(label) <> ''),
  display_order integer not null default 0,
  created_at timestamptz not null default now()
);

create table public.trip_exclusions (
  id uuid primary key default gen_random_uuid(),
  trip_id uuid not null references public.trips (id) on delete cascade,
  label text not null check (btrim(label) <> ''),
  display_order integer not null default 0,
  created_at timestamptz not null default now()
);

create index trip_inclusions_trip_id_idx on public.trip_inclusions (trip_id, display_order);
create index trip_exclusions_trip_id_idx on public.trip_exclusions (trip_id, display_order);

alter table public.trip_inclusions enable row level security;
alter table public.trip_exclusions enable row level security;

create policy "inclusions of published trips are publicly readable"
  on public.trip_inclusions
  for select
  to anon, authenticated
  using (public.trip_is_published(trip_id));

create policy "exclusions of published trips are publicly readable"
  on public.trip_exclusions
  for select
  to anon, authenticated
  using (public.trip_is_published(trip_id));

-- ===================================================== trip_important_notes --

-- Also "Traveller Notes" (docs/DATABASE.md: Phase 3.5C/3.6) — practical
-- warnings and traveller-facing context notes share this one table,
-- distinguished by the nullable `category`, matching
-- `TripImportantNote`/`TripTravellerNoteCategory` in lib/content/types.ts
-- exactly (not a second, near-identical table for "notes" vs "warnings").
create table public.trip_important_notes (
  id uuid primary key default gen_random_uuid(),
  trip_id uuid not null references public.trips (id) on delete cascade,
  title text not null check (btrim(title) <> ''),
  detail text not null check (btrim(detail) <> ''),
  category text check (
    category is null
    or category in ('etiquette', 'weather', 'connectivity', 'money', 'cultural', 'health', 'arrival', 'other')
  ),
  display_order integer not null default 0,
  created_at timestamptz not null default now()
);

create index trip_important_notes_trip_id_idx on public.trip_important_notes (trip_id, display_order);

alter table public.trip_important_notes enable row level security;

create policy "important notes of published trips are publicly readable"
  on public.trip_important_notes
  for select
  to anon, authenticated
  using (public.trip_is_published(trip_id));

-- =============================================================== trip_extras --

-- Optional add-on costs — docs/DATABASE.md: "trip_extras: trip_id, name,
-- price_amount, price_currency, description." `price_amount` is nullable:
-- `TripExtra.price` is itself optional in lib/content/types.ts (an extra
-- can be named without a price yet known).
create table public.trip_extras (
  id uuid primary key default gen_random_uuid(),
  trip_id uuid not null references public.trips (id) on delete cascade,
  name text not null check (btrim(name) <> ''),
  -- Money is never floating point — numeric(12,2) matches trip_departures'
  -- own price column later in this migration set.
  price_amount numeric(12, 2) check (price_amount is null or price_amount > 0),
  price_currency char(3) check (price_currency is null or price_currency ~ '^[A-Z]{3}$'),
  description text check (description is null or btrim(description) <> ''),
  display_order integer not null default 0,
  created_at timestamptz not null default now(),
  -- A price without a currency (or vice versa) is a malformed `TripPrice` —
  -- `tripPriceSchema` requires both together whenever price exists at all.
  constraint trip_extras_price_pair check (
    (price_amount is null and price_currency is null)
    or (price_amount is not null and price_currency is not null)
  )
);

create index trip_extras_trip_id_idx on public.trip_extras (trip_id, display_order);

alter table public.trip_extras enable row level security;

create policy "extras of published trips are publicly readable"
  on public.trip_extras
  for select
  to anon, authenticated
  using (public.trip_is_published(trip_id));

-- ================================================================= trip_faqs --

create table public.trip_faqs (
  id uuid primary key default gen_random_uuid(),
  trip_id uuid not null references public.trips (id) on delete cascade,
  question text not null check (btrim(question) <> ''),
  answer text not null check (btrim(answer) <> ''),
  display_order integer not null default 0,
  created_at timestamptz not null default now()
);

create index trip_faqs_trip_id_idx on public.trip_faqs (trip_id, display_order);

alter table public.trip_faqs enable row level security;

create policy "faqs of published trips are publicly readable"
  on public.trip_faqs
  for select
  to anon, authenticated
  using (public.trip_is_published(trip_id));

-- ==================================================== trip_policy_sections --

-- Cancellation/refund/payment-terms/additional-terms — docs/DATABASE.md:
-- "this table's rows need a stricter publication gate than most other trip
-- content... a future RLS policy... should require an elevated
-- role/approval." No role/approval system exists yet in this phase (RBAC
-- roles are explicitly out of scope — docs/RBAC.md has no backing tables),
-- so this migration applies the SAME baseline rule as every other content
-- table (visible only once the trip is published, no anon/authenticated
-- write at all) rather than inventing a fake elevated-role check that
-- would just be theatre. The stricter gate stays a documented requirement
-- for whenever RBAC roles actually exist (see docs/DATABASE.md's own note,
-- left unchanged) — not something this migration pretends to solve.
--
-- `kind` mirrors `TripPolicy`'s four named slots. `cancellation`, `refund`
-- and `paymentTerms` are each singular in the app type (at most one
-- section per kind); `additionalTerms` is an array. The partial unique
-- index below enforces exactly that asymmetry: at most one row per
-- (trip_id, kind) for the three singular kinds, any number of
-- `additional` rows.
create table public.trip_policy_sections (
  id uuid primary key default gen_random_uuid(),
  trip_id uuid not null references public.trips (id) on delete cascade,
  kind text not null check (kind in ('cancellation', 'refund', 'payment_terms', 'additional')),
  title text not null check (btrim(title) <> ''),
  body text not null check (btrim(body) <> ''),
  display_order integer not null default 0,
  created_at timestamptz not null default now()
);

create index trip_policy_sections_trip_id_idx on public.trip_policy_sections (trip_id, display_order);
create unique index trip_policy_sections_one_per_named_kind
  on public.trip_policy_sections (trip_id, kind)
  where kind <> 'additional';

alter table public.trip_policy_sections enable row level security;

create policy "policy sections of published trips are publicly readable"
  on public.trip_policy_sections
  for select
  to anon, authenticated
  using (public.trip_is_published(trip_id));
