-- Traveller identity — Phase 4.5.
--
-- The `profiles` table docs/DATABASE.md §2 originally sketched (full name,
-- username, avatar, bio, city, date of birth, phone, privacy settings) is
-- NOT what this migration builds. Phase 4.3's `admin_roles` comment already
-- named this moment "Phase 4.5+" for a reason: a traveller profile needs
-- only enough to be a real account, not a finished social profile. Bio,
-- username, city, date of birth and phone are explicitly deferred — none of
-- them are required by anything this phase builds (no dashboard, no
-- checkout, no community), and CLAUDE.md's "do not fabricate functionality"
-- rule applies just as much to unused columns as to unused UI.
--
-- Email is deliberately NOT duplicated here. `auth.users.email` is already
-- the identity authority (Supabase Auth); a second copy would need its own
-- verification-state tracking to stay honest, which this phase's own brief
-- explicitly warns against ("do not duplicate email verification state
-- unnecessarily"). Anything that needs a traveller's email reads
-- `auth.users` (server-side, via the session) instead.
create table public.traveller_profiles (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null unique references auth.users (id) on delete cascade,
  display_name text not null check (btrim(display_name) <> ''),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index traveller_profiles_user_id_idx on public.traveller_profiles (user_id);

create trigger traveller_profiles_set_updated_at
  before update on public.traveller_profiles
  for each row
  execute function public.set_updated_at();

alter table public.traveller_profiles enable row level security;

-- Ownership only — never USING (true). A traveller reads and writes
-- exactly their own row and nothing else: no enumeration, no reading or
-- editing another traveller's profile, matching this phase's explicit RLS
-- brief. `auth.uid()` is the session's own verified identity (from the JWT
-- Supabase Auth issued), never a client-submitted value.
create policy "a traveller can read their own profile"
  on public.traveller_profiles
  for select
  to authenticated
  using (user_id = auth.uid());

-- `with check` (not `using`) on insert: a traveller may create a row for
-- themselves, and the check prevents them from ever inserting one that
-- claims to belong to someone else.
create policy "a traveller can create their own profile"
  on public.traveller_profiles
  for insert
  to authenticated
  with check (user_id = auth.uid());

-- Both `using` and `with check`: a traveller may update only a row they
-- already own, and the update itself can never move `user_id` to point at
-- a different account (re-pointing an existing profile at someone else's
-- identity would be exactly the cross-account write this table's RLS
-- exists to prevent).
create policy "a traveller can update their own profile"
  on public.traveller_profiles
  for update
  to authenticated
  using (user_id = auth.uid())
  with check (user_id = auth.uid());

-- No delete policy. Account deletion is explicitly deferred (Phase 4.5's
-- own brief: "do not build a full account-deletion workflow ... unless it
-- is already straightforward and safe" — it touches auth.users, bookings
-- and payments together, which is exactly the kind of retention/data-policy
-- decision that is not safe to make implicitly here). A traveller_profiles
-- row is orphan-proof either way: `on delete cascade` above means deleting
-- the underlying auth.users row (the one operation this phase does NOT
-- expose to the traveller themselves) removes the profile automatically.
--
-- No admin-wide read policy either. Nothing in this phase's admin
-- workflow (Phase 4.3) reads traveller profiles, and adding one now would
-- be scope creep past what any real admin screen needs today — the same
-- discipline 20260928183648's own header applies to its expanded read
-- policies.
