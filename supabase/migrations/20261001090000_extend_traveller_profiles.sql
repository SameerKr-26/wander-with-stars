-- Traveller profile onboarding — Phase 4.8A.
--
-- Extends the existing `traveller_profiles` table (Phase 4.5) rather than
-- creating a parallel one. `display_name` already exists and IS this
-- phase's "Full name" field — no new column duplicates it, and no
-- identity data is duplicated from `auth.users` either (email stays read
-- only from there, exactly as Phase 4.5's own header explains).
--
-- Every new column is nullable (optional, per the brief) except none are
-- required at the database level — "Full name" (display_name) was already
-- `not null` since Phase 4.5, so the required-field rule this phase adds
-- is enforced the same way it already was: the application layer's Zod
-- schema, not a new NOT NULL constraint that would break if ever applied
-- to an existing row.
--
-- Controlled vocabularies (travel_style, travel_interests,
-- dietary_preference) are enforced with a CHECK constraint against an
-- explicit value list, not a free-text column and not a normalised
-- lookup-table subsystem — the brief's own "do not introduce unnecessary
-- normalisation or a complex preference subsystem" rule. The exact value
-- lists are mirrored in lib/traveller/validation.ts's own exported
-- constants; the two must be kept in sync by inspection, the same
-- discipline lib/booking/status.ts already documents for its own SQL/TS
-- mirror.
--
-- travel_interests is a `text[]`, not a second table: PostgreSQL's array
-- containment operator (`<@`) validates every element against the allowed
-- set in one CHECK, with no join, no junction table, and no new RLS
-- surface — the simplest representation that is still genuinely
-- controlled (an arbitrary string can never sneak in), matching the
-- "controlled representation compatible with the current schema
-- architecture" instruction.
--
-- Deliberately excluded (the brief is explicit): Aadhaar, passport
-- number, PAN, card details, bank information, emergency contacts. None
-- are added "because they might be useful later."
alter table public.traveller_profiles
  add column phone text check (phone is null or btrim(phone) <> ''),
  add column city text check (city is null or btrim(city) <> ''),
  add column travel_style text,
  add column travel_interests text[] not null default '{}',
  add column dietary_preference text;

alter table public.traveller_profiles
  add constraint traveller_profiles_travel_style_check
  check (
    travel_style is null or travel_style in (
      'Adventure', 'Relaxation', 'Backpacking', 'Cultural',
      'Nightlife', 'Luxury', 'Nature', 'Photography'
    )
  );

alter table public.traveller_profiles
  add constraint traveller_profiles_dietary_preference_check
  check (
    dietary_preference is null or dietary_preference in (
      'No preference', 'Vegetarian', 'Vegan', 'Jain', 'Other'
    )
  );

alter table public.traveller_profiles
  add constraint traveller_profiles_travel_interests_check
  check (
    travel_interests <@ array[
      'Beaches', 'Mountains', 'Food', 'Culture',
      'Parties / nightlife', 'Wildlife', 'Photography', 'Road trips'
    ]::text[]
  );

comment on column public.traveller_profiles.phone is
  'Optional phone/WhatsApp number. Free text (validated server-side with a lenient international-friendly pattern, not a DB-level format constraint) — see lib/traveller/validation.ts.';
comment on column public.traveller_profiles.city is
  'Optional home city. Free text, no controlled list — cities are not a small enough set to enumerate.';
comment on column public.traveller_profiles.travel_style is
  'Optional, single-select, controlled vocabulary — see the CHECK constraint above and lib/traveller/validation.ts''s TRAVEL_STYLES.';
comment on column public.traveller_profiles.travel_interests is
  'Optional, multi-select, controlled vocabulary, stored as a text[] validated by the CHECK constraint above — see lib/traveller/validation.ts''s TRAVEL_INTERESTS. Defaults to an empty array, never null, so callers never need a null-check before iterating it.';
comment on column public.traveller_profiles.dietary_preference is
  'Optional, single-select, controlled vocabulary — see the CHECK constraint above and lib/traveller/validation.ts''s DIETARY_PREFERENCES.';

-- No RLS change: the existing own-row select/insert/update policies
-- (Phase 4.5) already cover every column on this table, including these
-- new ones — RLS in PostgreSQL is row-level, not column-level, so a
-- traveller who could already read/write their own profile row can
-- read/write these fields too, and still only their own row.
