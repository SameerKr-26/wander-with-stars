-- Development seed data — Phase 5.
--
-- Deliberately minimal, and deliberately fake-looking: every row here
-- exists to exercise the schema and RLS policies just created, not to look
-- like real WWS content. Nothing resembling a real traveller count,
-- review, booking or testimonial is seeded (this phase's own instructions
-- are explicit on that point) — every label below says "Seed Smoke-Test"
-- precisely so nobody mistakes it for business data if it ever leaks into
-- a screenshot or a query result.
--
-- The real, source-backed Vietnam draft content
-- (lib/content/ingest/sources/vietnam-wws-7d6n.ts) is NOT inserted here:
-- hand-transcribing its full itinerary text into SQL risks introducing
-- silent transcription errors in exactly the source-fidelity this project
-- has been careful to preserve. `scripts/seed-vietnam-draft.ts` instead
-- inserts it programmatically, straight from that TypeScript source of
-- truth — run it separately, once, against a real database connection;
-- see that script's own header for why it is not wired into this file.
--
-- This file is loaded automatically by `supabase db reset` (see
-- supabase/config.toml's `[db.seed]`), so every statement below must be
-- safe to run against a freshly-migrated, empty database.

-- One host, referenced by the published smoke-test trip below.
insert into public.hosts (id, name, tagline)
values (
  '00000000-0000-0000-0000-000000000001',
  'Seed Smoke-Test Host',
  'Exists only to prove trips.host_id joins work — not a real WWS host.'
);

-- One guide, referenced by the published smoke-test departure below.
insert into public.guides (id, name)
values ('00000000-0000-0000-0000-000000000002', 'Seed Smoke-Test Guide');

-- A PUBLISHED trip — this is the row every "public read" RLS test expects
-- to see, and the parent for the visible child rows below.
insert into public.trips (
  id, slug, title, destination, country, duration_nights, tagline, overview,
  style_scores, host_id, content_status, source_reference, published_at
)
values (
  '00000000-0000-0000-0000-000000000010',
  'seed-smoke-test-trip',
  'Seed Smoke-Test Trip — Not Real',
  'Nowhere in particular',
  'Testland',
  3,
  'Exists only to validate the schema and RLS policies.',
  'A minimal, clearly-labelled trip used to prove migrations, constraints and public-visibility RLS behave correctly — never real WWS content.',
  '{"adventure": 50}'::jsonb,
  '00000000-0000-0000-0000-000000000001',
  'published',
  'supabase/seed.sql — schema smoke test',
  now()
);

-- A DRAFT trip — same shape, but must be invisible to anon/authenticated
-- under the "published trips are publicly readable" policy. Its own child
-- rows (added below) must be equally invisible, proving the RLS join
-- (not just the top-level trips policy) actually enforces the gate.
insert into public.trips (
  id, slug, title, destination, country, duration_nights, overview,
  content_status, source_reference
)
values (
  '00000000-0000-0000-0000-000000000011',
  'seed-smoke-test-draft-trip',
  'Seed Smoke-Test Draft Trip — Not Real',
  'Nowhere in particular',
  'Testland',
  2,
  'A draft-status counterpart to the published smoke-test trip, used to prove draft content stays invisible to anon/authenticated readers.',
  'draft',
  'supabase/seed.sql — schema smoke test'
);

-- Content children of the PUBLISHED trip — each should be publicly
-- readable via its own `trip_is_published()`-gated policy.
insert into public.itinerary_days (trip_id, day_number, title, summary)
values (
  '00000000-0000-0000-0000-000000000010',
  1,
  'Arrival',
  'Seed smoke-test itinerary day, used only to validate schema and RLS.'
);

insert into public.trip_media (trip_id, kind, is_hero, display_order)
values ('00000000-0000-0000-0000-000000000010', 'placeholder', true, 0);

insert into public.trip_inclusions (trip_id, label, display_order)
values ('00000000-0000-0000-0000-000000000010', 'Seed smoke-test inclusion', 0);

insert into public.trip_exclusions (trip_id, label, display_order)
values ('00000000-0000-0000-0000-000000000010', 'Seed smoke-test exclusion', 0);

insert into public.trip_important_notes (trip_id, title, detail, category)
values (
  '00000000-0000-0000-0000-000000000010',
  'Seed smoke-test note',
  'Exists only to validate schema and RLS.',
  'other'
);

insert into public.trip_faqs (trip_id, question, answer)
values (
  '00000000-0000-0000-0000-000000000010',
  'Is this a real trip?',
  'No — this row exists only to validate the schema and RLS policies.'
);

insert into public.trip_policy_sections (trip_id, kind, title, body)
values (
  '00000000-0000-0000-0000-000000000010',
  'cancellation',
  'Seed smoke-test cancellation policy',
  'Exists only to validate schema and RLS — not a real WWS policy.'
);

-- Content children of the DRAFT trip — must NOT be publicly readable, even
-- though the row itself is otherwise identical in shape to the ones above.
insert into public.itinerary_days (trip_id, day_number, title, summary)
values (
  '00000000-0000-0000-0000-000000000011',
  1,
  'Arrival (draft)',
  'Seed smoke-test itinerary day under a draft trip — must stay invisible to anon/authenticated.'
);

-- Two departures of the PUBLISHED trip: one publicly visible
-- (`booking_open`), one that must stay hidden despite its parent trip
-- being published (`draft`) — proving the departure's own status gate
-- works independently of the trip's content_status.
insert into public.trip_departures (
  id, trip_id, departure_date, price_amount, price_currency, capacity,
  seats_reserved, seats_confirmed, guide_id, status
)
values (
  '00000000-0000-0000-0000-000000000020',
  '00000000-0000-0000-0000-000000000010',
  current_date + interval '90 days',
  1000.00,
  'INR',
  20,
  5,
  5,
  '00000000-0000-0000-0000-000000000002',
  'booking_open'
);

insert into public.trip_departures (id, trip_id, departure_date, status)
values (
  '00000000-0000-0000-0000-000000000021',
  '00000000-0000-0000-0000-000000000010',
  current_date + interval '120 days',
  'draft'
);

-- Departure-scoped logistics of the VISIBLE departure — should be publicly
-- readable via `trip_departure_is_visible()`.
insert into public.trip_accommodation (trip_departure_id, name, type, nights)
values (
  '00000000-0000-0000-0000-000000000020',
  'Seed Smoke-Test Hotel',
  'Test property',
  3
);

insert into public.trip_transport (trip_departure_id, mode, description)
values (
  '00000000-0000-0000-0000-000000000020',
  'Seed smoke-test transfer',
  'Exists only to validate schema and RLS.'
);

insert into public.trip_meeting_points (trip_departure_id, location, meeting_time)
values (
  '00000000-0000-0000-0000-000000000020',
  'Seed smoke-test meeting point',
  '09:00'
);

-- Departure-scoped logistics of the HIDDEN (draft) departure — must NOT be
-- publicly readable.
insert into public.trip_accommodation (trip_departure_id, name)
values ('00000000-0000-0000-0000-000000000021', 'Seed Smoke-Test Hotel (draft departure)');
