-- Admin identity and expanded read visibility — Phase 4.3.
--
-- Deliberately narrow: this is NOT the future traveller `profiles` table
-- docs/DATABASE.md §2 sketches (full name, avatar, bio, privacy settings,
-- ...). `admin_roles` holds exactly one fact — "this auth.users row may
-- administer content, at this role" — for the small set of people who
-- actually need it. Nobody else gets a row at all; an ordinary traveller
-- (once that system exists, Phase 4.5+) simply has no entry here, which is
-- the correct default (no privilege), not a placeholder waiting to be
-- filled in.
--
-- Role names are exactly three of docs/RBAC.md's existing eight
-- (`content_manager`, `admin`, `super_admin`) — no new role names invented.
-- The other five (traveller, trip_manager, operations_manager,
-- finance_manager, community_manager) have no content-administration
-- capability in that document's own matrix, so this phase gives them none.
--
-- No INSERT/UPDATE/DELETE policy exists for `anon` or `authenticated` —
-- granting or changing a role is a service-role-only operation
-- (scripts/grant-admin-role.ts), never a public or self-service write. That
-- is deliberate: docs/RBAC.md reserves "Manage users/roles" for Admin/Super
-- Admin, and no admin UI for that exists yet (out of scope, Phase 4.3's own
-- brief) — the only safe default until it does is "nobody can write this
-- table except a human running a script with the service-role key."
create table public.admin_roles (
  id uuid primary key references auth.users (id) on delete cascade,
  role text not null check (role in ('content_manager', 'admin', 'super_admin')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create trigger admin_roles_set_updated_at
  before update on public.admin_roles
  for each row
  execute function public.set_updated_at();

alter table public.admin_roles enable row level security;

-- A signed-in admin needs to read their OWN role (to know what the UI
-- should let them do) but never anyone else's — that would leak who else
-- holds privileged access, which docs/SECURITY.md §13's audit-log
-- discipline treats as exactly the kind of fact to keep narrow.
create policy "users can read their own admin role"
  on public.admin_roles
  for select
  to authenticated
  using (id = auth.uid());

-- Reusable by every admin-visibility policy below, and by
-- lib/admin/auth.ts's server-side authorization check — centralizing the
-- lookup so a copy-paste slip across many policies can't silently diverge.
-- No `security definer`: it only ever needs to see the CALLING user's own
-- row, which the policy above already permits them to read; running as the
-- caller (not the function owner) is the more restrictive, safer default.
create function public.current_admin_role()
returns text
language sql
stable
as $$
  select role from public.admin_roles where id = auth.uid();
$$;

-- Expanded read visibility for the admin content list/edit screens —
-- ADDITIONAL permissive policies, not edits to the ones Phase 4.1 already
-- shipped (supabase/migrations/README.md rule 1: never edit an applied
-- migration). Postgres OR's multiple permissive policies for the same
-- command together, so the public "published only" policy on each table
-- keeps working unchanged for anon/authenticated readers with no
-- qualifying role.
--
-- Scoped to exactly what the Phase 4.3 admin UI actually reads: trip core
-- fields, departures, itinerary, inclusions/exclusions. Every other content
-- child table (media, important notes, extras, FAQs, policy sections,
-- accommodation, transport, meeting points) has no admin UI built this
-- phase (see the Phase 4.3 report's explicitly deferred list) and so gets
-- no expanded read policy either — adding one now would be exactly the
-- "table gets a feature merely because the database could support it" this
-- project's own instructions warn against.
create policy "admins can read every trip regardless of status"
  on public.trips
  for select
  to authenticated
  using (public.current_admin_role() in ('content_manager', 'admin', 'super_admin'));

create policy "admins can read every departure regardless of status"
  on public.trip_departures
  for select
  to authenticated
  using (public.current_admin_role() in ('content_manager', 'admin', 'super_admin'));

create policy "admins can read itinerary days of any trip"
  on public.itinerary_days
  for select
  to authenticated
  using (public.current_admin_role() in ('content_manager', 'admin', 'super_admin'));

create policy "admins can read inclusions of any trip"
  on public.trip_inclusions
  for select
  to authenticated
  using (public.current_admin_role() in ('content_manager', 'admin', 'super_admin'));

create policy "admins can read exclusions of any trip"
  on public.trip_exclusions
  for select
  to authenticated
  using (public.current_admin_role() in ('content_manager', 'admin', 'super_admin'));

-- No authenticated/anon INSERT, UPDATE or DELETE policy on any table in
-- this migration or the ones before it. Every admin WRITE — creating a
-- trip, editing its fields, transitioning its content_status, editing a
-- departure — goes through lib/supabase/admin.ts's service-role client,
-- AFTER lib/admin/authorize.ts's own role check, exactly the pattern that
-- client's own header comment and CLAUDE.md's "Which Supabase client?"
-- table already prescribe. RLS is the read boundary here; the write
-- boundary is the application layer, deliberately, rather than
-- reimplementing every lifecycle-transition and cross-table rule
-- (docs/DATABASE.md §12, lib/admin/transitions.ts) a second time as SQL
-- `with check` clauses.
