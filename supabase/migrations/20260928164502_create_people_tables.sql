-- Hosts and guides — Phase 4.1, docs/DATABASE.md §3.
--
-- Two separate tables with an identical shape today, matching the existing
-- application-layer decision (`lib/content/types.ts`'s `GuidePreview =
-- HostPreview` type alias, and this project's docs/DATABASE.md note on
-- `trip_guides`): a host organises/owns a trip, a guide leads a specific
-- departure on the ground. The same real person may hold both roles, but
-- the roles stay conceptually — and here, relationally — distinct, so a
-- future divergence (guide certifications, host payout details, ...) needs
-- no migration to separate what was never merged.
--
-- Both are simple reusable people records, each referenced by a single
-- foreign key elsewhere (trips.host_id, trip_departures.guide_id) — not a
-- many-to-many join table, because the current domain model never
-- represents more than one host per trip or more than one guide per
-- departure (`TripPreview.host` and `TripDetail.guide` are both singular).
--
-- `avatar_*` mirrors `TripMedia`'s discriminated shape (kind/src/alt/poster)
-- as plain columns rather than a JSONB blob or a join to trip_media: no
-- real photography exists anywhere in this project yet (every fixture uses
-- `{ kind: 'placeholder' }`), so this is intentionally the simplest shape
-- that can hold a real photo later, not a speculative media pipeline.

create extension if not exists pgcrypto;

create table public.hosts (
  id uuid primary key default gen_random_uuid(),
  name text not null check (btrim(name) <> ''),
  tagline text check (tagline is null or btrim(tagline) <> ''),
  avatar_kind text check (avatar_kind in ('image', 'video', 'placeholder')),
  avatar_src text,
  avatar_alt text,
  avatar_poster text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint hosts_avatar_shape check (
    (avatar_kind is null and avatar_src is null and avatar_alt is null and avatar_poster is null)
    or (avatar_kind = 'placeholder' and avatar_src is null and avatar_poster is null and avatar_alt is null)
    or (avatar_kind = 'image' and avatar_src is not null and avatar_poster is null and avatar_alt is not null)
    or (avatar_kind = 'video' and avatar_src is not null and avatar_poster is not null and avatar_alt is not null)
  )
);

create table public.guides (
  id uuid primary key default gen_random_uuid(),
  name text not null check (btrim(name) <> ''),
  tagline text check (tagline is null or btrim(tagline) <> ''),
  avatar_kind text check (avatar_kind in ('image', 'video', 'placeholder')),
  avatar_src text,
  avatar_alt text,
  avatar_poster text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint guides_avatar_shape check (
    (avatar_kind is null and avatar_src is null and avatar_alt is null and avatar_poster is null)
    or (avatar_kind = 'placeholder' and avatar_src is null and avatar_poster is null and avatar_alt is null)
    or (avatar_kind = 'image' and avatar_src is not null and avatar_poster is null and avatar_alt is not null)
    or (avatar_kind = 'video' and avatar_src is not null and avatar_poster is not null and avatar_alt is not null)
  )
);

-- Shared updated_at trigger — reused by every table in this migration set
-- that represents an editable entity rather than an append/reorder-only
-- child list (docs/DATABASE.md §1: "constraints enforce business invariants
-- where practical" — a stale updated_at is exactly the kind of silent
-- drift a trigger is cheap insurance against).
create function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create trigger hosts_set_updated_at
  before update on public.hosts
  for each row
  execute function public.set_updated_at();

create trigger guides_set_updated_at
  before update on public.guides
  for each row
  execute function public.set_updated_at();

-- RLS — docs/SECURITY.md §5, §15: every protected table gets explicit
-- policies in the same migration that creates it (supabase/migrations/
-- README.md rule 2) — which is also why this policy is not gated on
-- "referenced by a published trip": `trips`/`trip_departures` do not exist
-- until later migrations in this set, and a policy here cannot forward-
-- reference a table that isn't created yet without leaving hosts/guides
-- RLS-enabled-but-policyless (fully exposed via Supabase's default
-- auto-exposed Data API) in the gap between migrations — exactly the
-- "discovered too late" failure mode that rule exists to prevent.
--
-- `using (true)` is deliberate here, not a shortcut: hosts/guides carry no
-- sensitive operational data at all (no cost, no contact details, no
-- personal data beyond a public-facing name/tagline/avatar — the same
-- profile information docs/RBAC.md's Content Manager role is meant to
-- manage as public-facing content). docs/SECURITY.md §5's warning is about
-- `using (true)` on PRIVATE data; this table has none. Read-only either
-- way: no anon/authenticated INSERT, UPDATE or DELETE policy exists, so
-- only the service-role client (lib/supabase/admin.ts, which bypasses RLS)
-- can write.
alter table public.hosts enable row level security;
alter table public.guides enable row level security;

create policy "hosts are publicly readable"
  on public.hosts
  for select
  to anon, authenticated
  using (true);

create policy "guides are publicly readable"
  on public.guides
  for select
  to anon, authenticated
  using (true);
