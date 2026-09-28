-- trips — the reusable trip PRODUCT/CONTENT, docs/DATABASE.md §3.
--
-- Deliberately holds no departure-specific commercial data (date, price,
-- availability, capacity) — that is `trip_departures`, created in a later
-- migration in this set. This is the core architectural split this phase
-- exists to establish: content describes the journey once; a departure is
-- one scheduled, sellable occurrence of it. Mixing the two here would make
-- "publish the trip" and "open this batch for booking" the same action,
-- which they explicitly are not (a trip can be published while a specific
-- departure is sold out, unavailable, or not yet scheduled).
--
-- `content_status` is the Phase 3.6 content lifecycle already defined in
-- code (`lib/content/ingest/types.ts`'s `ContentStatus`) and documented in
-- docs/DATABASE.md §12 ("Content record") — draft -> review -> approved ->
-- published -> archived. This is intentionally a DIFFERENT enum from
-- `trip_departures.status` (created later): one tracks whether the trip's
-- CONTENT has been reviewed against its source, the other tracks whether a
-- specific departure can be booked. A trip can be `published` while every
-- one of its departures is still `draft`.

create table public.trips (
  id uuid primary key default gen_random_uuid(),

  -- Matches `lib/content/ingest/schema.ts`'s `tripPreviewSchema.slug` regex
  -- exactly (`^[a-z0-9]+(-[a-z0-9]+)*$`) — normalization (lowercasing,
  -- accent-stripping, hyphenation) happens in normalize.ts before content
  -- ever reaches this table; this constraint rejects anything that wasn't
  -- normalized, the same "reject, don't repair" boundary the app layer
  -- already enforces.
  slug text not null unique check (slug ~ '^[a-z0-9]+(-[a-z0-9]+)*$'),

  title text not null check (btrim(title) <> ''),
  destination text not null check (btrim(destination) <> ''),
  country text not null check (btrim(country) <> ''),

  -- `TripPreview.durationNights` — `>= 0` per `tripPreviewSchema`
  -- ("durationNights must be 0 or more"), not `> 0`: the app schema
  -- deliberately allows a same-day departure.
  duration_nights integer not null check (duration_nights >= 0),

  tagline text check (tagline is null or btrim(tagline) <> ''),

  -- Required even in DRAFT content — `draftTripDetailSchema` (Phase 3.7)
  -- makes departureDate/price/availability/host optional but leaves
  -- `overview` required, so this column follows suit rather than being
  -- nullable "just in case."
  overview text not null check (btrim(overview) <> ''),

  -- `TripStyleScores` — `Partial<Record<TravelStyleSignal, number>>`.
  -- Stored as jsonb rather than a normalized table: it is a small,
  -- entirely optional bag of numeric signals with no independent identity
  -- of its own (no row is ever queried, updated or deleted on its own —
  -- only ever read or replaced as a whole alongside the trip), which is
  -- exactly the shape jsonb suits and a join table would over-engineer.
  style_scores jsonb not null default '{}'::jsonb,

  -- Trip-level host (docs/DATABASE.md: "trip_hosts: Trip/creator
  -- association") — nullable because the current domain model never
  -- fabricates a host: the Vietnam draft content has none, and
  -- `draftTripDetailSchema` makes `host` optional for exactly that reason.
  host_id uuid references public.hosts (id) on delete set null,

  -- Phase 3.6/3.7 content lifecycle (docs/DATABASE.md §12) — independent of
  -- any departure's own booking-availability state.
  content_status text not null default 'draft'
    check (content_status in ('draft', 'review', 'approved', 'published', 'archived')),

  -- Provenance — "source/reference metadata where appropriate." Free text
  -- rather than a structured source-table: every ingested trip in this
  -- project so far has exactly one human-readable source description (see
  -- `lib/content/ingest/sources/vietnam-wws-7d6n.ts`'s own `reviewNotes`),
  -- not a catalogue of sources worth normalizing yet.
  source_reference text,
  review_notes text,

  published_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),

  -- A trip cannot claim to be published without a timestamp saying when.
  -- `archived` keeps its `published_at` rather than having it cleared:
  -- per `ContentStatus`'s own definition (lib/content/ingest/types.ts),
  -- archived means "was published, intentionally withdrawn (not deleted)"
  -- — the historical publish date is exactly the fact archiving preserves.
  -- Only a trip that has genuinely never been published (draft/review/
  -- approved) has no such timestamp to be wrong about. Enforced here
  -- rather than left to application discipline alone (docs/DATABASE.md §1:
  -- "constraints enforce business invariants where practical").
  constraint trips_published_at_matches_status check (
    (content_status in ('published', 'archived') and published_at is not null)
    or (content_status in ('draft', 'review', 'approved') and published_at is null)
  )
);

create index trips_content_status_idx on public.trips (content_status);
create index trips_destination_idx on public.trips (destination);
create index trips_host_id_idx on public.trips (host_id) where host_id is not null;

create trigger trips_set_updated_at
  before update on public.trips
  for each row
  execute function public.set_updated_at();

-- RLS — the central public-visibility rule this whole phase exists to
-- enforce: anonymous and authenticated users may read a trip only once it
-- is genuinely `published`. Draft, review, approved and archived rows are
-- invisible to normal queries regardless of any frontend filtering
-- (docs/SECURITY.md §5: "UI hiding is never the security boundary").
-- There is no INSERT/UPDATE/DELETE policy for anon or authenticated at
-- all — every write goes through `lib/supabase/admin.ts`'s service-role
-- client, which bypasses RLS entirely, matching this project's existing,
-- documented pattern for privileged operations.
alter table public.trips enable row level security;

create policy "published trips are publicly readable"
  on public.trips
  for select
  to anon, authenticated
  using (content_status = 'published');
