# Wander With Stars V2 — Database Design

## 1. Database principles

- PostgreSQL via Supabase
- UUID primary keys are acceptable internally
- Human-friendly slugs are used in public URLs
- Foreign keys are explicit
- Constraints enforce business invariants where practical
- Index columns used for filtering, joining, sorting, and lookup
- Sensitive data is private by default
- Every protected table gets explicit RLS policies

## 2. Identity

### profiles
Represents application-level user profile linked to auth.users.

Suggested fields:
- id
- full_name
- username
- avatar_url
- bio
- city
- date_of_birth or age_band only if truly required
- phone if required by business flow
- privacy settings
- created_at
- updated_at

### roles
- id
- key
- name

### organization_members
Supports role membership and future multi-team operations.

## 3. Travel catalogue

**Implemented (Phase 4.1) and verified against a real database (Phase 4.2A)**
— `supabase/migrations/2026092816450{2,6,10,14,18}_*.sql`. Every table below
matches what those five migrations actually created; where this section
originally sketched a different name or shape, the change and why it
happened is called out inline. Verified locally (Docker/`supabase start`) —
not yet linked or pushed to any remote/shared project. See
`supabase/migrations/README.md`.

### trips
The reusable trip CONTENT/PRODUCT — deliberately holds no departure-specific
commercial data (date, price, availability). Renamed from this section's
original `status`/`base_price`/`currency`/`duration_days` sketch to match
the domain model that actually exists in `lib/content/types.ts` and
`lib/content/ingest/schema.ts` by the time this table was built:

- id, slug (unique, `^[a-z0-9]+(-[a-z0-9]+)*$`), title, destination, country
- duration_nights (no separate duration_days — `TripPreview.durationNights`
  is the only duration field the app model has)
- tagline, overview, style_scores (jsonb)
- host_id → hosts
- content_status (`draft | review | approved | published | archived` — see
  "Content record" below; there is no separate `status` column — pricing/
  availability status lives on `trip_departures` instead, not here)
- source_reference, review_notes
- published_at, created_at, updated_at

### trip_departures
Specific scheduled batch/departure — the commercial/bookable instance of a
trip. Renamed `start_date`/`end_date` to `departure_date`/`return_date`, and
`price_override` to `price_amount`/`price_currency` (a departure sets the
real price directly; there is no separate base price on `trips` to
"override"). `meeting_point` moved out to its own `trip_meeting_points`
table (below) rather than a column here, since it has its own optional
`instructions` field.

- id, trip_id, departure_date, return_date
- price_amount (`numeric(12,2)`, never floating point), price_currency
  (`char(3)`)
- capacity, seats_reserved, seats_confirmed
- guide_id → guides
- status (`draft | published | booking_open | almost_full | sold_out |
  in_progress | completed` — see "Trip departure" state model below)
- created_at, updated_at

Trip-to-departure is a one-to-many relationship. A trip can be `published`
while every one of its departures is still `draft`, and "published" is
never conflated with "available" — that's this table's `status`, not
`trips.content_status`.

### hosts
Renamed from `trip_hosts`: a reusable person record referenced by
`trips.host_id`, not a join table — the current domain model never
represents more than one host per trip (`TripPreview.host` is singular).
Fields: id, name, tagline, avatar_kind/avatar_src/avatar_alt/avatar_poster
(mirrors `TripMedia`'s discriminated shape), created_at, updated_at.

### guides
A departure's guide, distinct from `hosts` (a host organises/owns a trip; a
guide leads a specific departure on the ground — the same real person may
hold both roles, but the roles stay relationally distinct). Same shape as
`hosts` today (`lib/content/types.ts`'s `GuidePreview = HostPreview` type
alias) — kept as a separate table regardless, since a future divergence
(guide certifications, host payout details, ...) needs no migration to
separate what was never merged. Referenced by `trip_departures.guide_id`,
not `trips` — a guide belongs to a specific departure, a host to the trip.

### itinerary_days
Renamed from `trip_itineraries`. Fields: id, trip_id, day_number (unique
per trip), title, summary, created_at, updated_at. No `trip_locations` or
`trip_activities` table exists — the current domain model
(`TripItineraryDay`) has no activities or per-location sub-structure at
all; see the migration's own comment for why an empty activities table
would be "a table merely because it sounds useful," not something this
phase builds.

### trip_media
Image/video/placeholder metadata, ordered, with at most one row per trip
flagged `is_hero` (enforced by a partial unique index) — serves both
`TripPreview.heroMedia` and `TripDetail.gallery`. Fields: id, trip_id,
kind (`image | video | placeholder`), src, alt, poster, focal_point,
is_hero, display_order, created_at.

### trip_inclusions / trip_exclusions
One row per label, ordered — the direct relational equivalent of
`TripDetail.inclusions` / `.exclusions`'s existing flat `string[]`
convention (deliberately not richer per-inclusion objects; see the
migration's own comment).

### trip_faqs
Fields: id, trip_id, question, answer, display_order, created_at.

### trip_accommodation
One row per accommodation leg of a departure (a departure may use more than
one property). Fields: `trip_departure_id`, `name`, `type`, `description`,
`nights`, `media_id`. See `lib/content/types.ts`'s `TripAccommodation` and
`lib/content/ingest/schema.ts`'s `tripAccommodationSchema` for the
validated shape this is expected to satisfy (Phase 3.6).

### trip_transport
One row per transport leg (a departure may combine several — a flight, a
transfer, a train). Fields: `trip_departure_id`, `mode`, `description`.

### trip_meeting_points
One row per departure (not one-to-many — a departure has exactly one
meeting point today, enforced with a unique constraint on
`trip_departure_id`). Fields: `trip_departure_id`, `location`,
`meeting_time` (renamed from `time` to avoid the Postgres `time` type name
as a column identifier), `instructions`.

### trip_important_notes
Also "Traveller Notes" (Phase 3.5C/3.6) — practical warnings and
traveller-facing context notes are the same table, distinguished by
`category`. Fields: `trip_id`, `title`, `detail`,
`category` (nullable — `etiquette | weather | connectivity | money |
cultural | health | arrival | other`, matching
`TripTravellerNoteCategory`). Scoped to `trip_id`, not
`trip_departure_id` — the current domain model
(`TripDetail.importantNotes`) has no departure-scoped variant.

### trip_policy_sections
Renamed from `trip_policies`. Cancellation/refund/payment-terms/
additional-terms content. Fields: `trip_id`, `kind` (`cancellation |
refund | payment_terms | additional`), `title`, `body`, `display_order`.
At most one row per (trip_id, kind) for the three singular kinds
(enforced by a partial unique index); any number of `additional` rows.
See "Content lifecycle" below and §14's note on commercial/legal approval
— this table's rows need a stricter publication gate than most other trip
content; not implemented yet (see §14).

### trip_extras
Optional add-on costs. Fields: `trip_id`, `name`, `price_amount`,
`price_currency`, `description`, `display_order`.

## 4. Commerce

### bookings
Fields:
- id
- booking_reference
- user_id
- trip_departure_id
- status
- currency
- subtotal
- discount_amount
- total_amount
- amount_paid
- amount_due
- created_at
- updated_at

### booking_guests
Traveller-specific information associated with booking.

### payments
Fields:
- id
- booking_id
- provider
- provider_payment_id
- amount
- currency
- status
- payment_method
- idempotency_key
- metadata
- created_at
- updated_at

### payment_installments
For partial payment schedules.

### refunds
Tracks refund requests/results separately from original payments.

### coupons
Must have server-side eligibility and amount validation.

## 5. Reviews

### reviews
Link only to completed/eligible bookings. Include verification state.

### ratings
Either embedded on reviews or normalised if multi-aspect ratings are required.

## 6. Community

### communities
Typically one private community per departure, plus optional public/topic communities later.

### community_members
Fields:
- community_id
- user_id
- membership_status
- joined_at
- visibility settings

### community_posts
### community_comments
### community_messages

Messages should have moderation/reporting controls and retention policies.

### reports
### blocks

## 7. Personalisation

### travel_profiles
Traveller's derived/high-level travel identity.

### travel_preferences
Structured preferences such as budget, pace, social energy, trip style, interests.

### wishlists
User-to-trip/departure saved items.

### trip_recommendations
Can store generated recommendation snapshots with explanation metadata and timestamps.

## 8. CRM

### leads
Fields:
- id
- name
- contact
- source
- destination_interest
- travel_date
- status
- owner
- created_at
- updated_at

### lead_sources
### lead_activities

## 9. Operations

### notifications
### notification_preferences
### support_tickets
### audit_logs

Audit records should capture actor, action, resource, timestamp, and relevant metadata without leaking secrets.

## 10. AI

### ai_documents
Knowledge sources such as verified WWS policy/trip content.

### ai_chunks
Chunked content linked to a document.

### ai_embeddings
Vector representation where semantic retrieval is needed.

### ai_conversations
Store only what is necessary for user experience and debugging.

## 11. Important relationships

```text
profile
  |
  +-- bookings --> booking_guests
  |
  +-- communities --> community_members
  |
  +-- wishlist

trip
  |
  +-- trip_departures
        |
        +-- bookings
              |
              +-- payments
              +-- guests

trip_departure
  |
  +-- community
        |
        +-- members
```

## 12. State models

### Booking
DRAFT → PENDING_PAYMENT → CONFIRMED → PARTIALLY_PAID → BALANCE_DUE → COMPLETED

Alternate:
PENDING_PAYMENT → PAYMENT_FAILED
CONFIRMED → CANCELLED → REFUND_PENDING → REFUNDED

### Trip departure
DRAFT → PUBLISHED → BOOKING_OPEN → ALMOST_FULL → SOLD_OUT → IN_PROGRESS → COMPLETED

### Lead
NEW → CONTACTED → QUALIFIED → CONVERTED

Alternate → LOST

### Content record (Phase 3.6)
draft → review → approved → published → archived

Independent of "Trip departure" above: this tracks whether a piece of
ingested trip CONTENT (an itinerary, a policy, an accommodation entry) has
been reviewed against its source material, not whether seats can be
booked. A departure can be `BOOKING_OPEN` while a correction to its content
is still sitting in `review`. See docs/ARCHITECTURE.md §14 for the full
ingestion pipeline this status belongs to (`lib/content/ingest/types.ts`'s
`ContentStatus` — defined in code, not yet backed by a database column or
an admin flow that moves a record between states).

## 13. Indexing strategy

Consider indexes on:
- trip slug
- trip status
- destination
- departure start_date
- departure status
- booking user_id
- booking status
- booking_reference
- payment booking_id
- payment provider_payment_id
- community user_id + community_id
- lead status/source/owner

Add indexes based on observed query patterns rather than blindly indexing everything.

## 14. RLS design notes

**Implemented (Phase 4.1) and verified against a real database (Phase 4.2A)**
for the travel-catalogue tables in §3: `anon` and
`authenticated` may `select` a trip only once `trips.content_status =
'published'` (via the `trip_is_published()` helper function), a departure
only once its own `status <> 'draft'` AND its trip is published (via
`trip_departure_is_visible()`), and every child table (itinerary, media,
inclusions, exclusions, notes, extras, FAQs, policy sections,
accommodation, transport, meeting points) only once its parent trip or
departure clears that same gate. `hosts`/`guides` are `using (true)`
read-only — justified as non-sensitive public profile data, not an
exception to the rule below. No `anon`/`authenticated` `insert`/`update`/
`delete` policy exists on any of these tables; every write goes through
`lib/supabase/admin.ts`'s service-role client. Exercised against a real,
local Postgres database in Phase 4.2A — every policy above was confirmed
with anon-key queries that saw exactly the published/visible rows and
nothing else — see `supabase/migrations/README.md`.

Public read should be narrow and intentional. A public trip view should not reveal private operational data such as supplier costs, internal notes, customer lists, or payment records.

Traveller policies should generally be based on auth.uid() ownership or explicit community membership.

Admin access must be checked server-side and through database policy design rather than UI visibility.

Commercial/legal trip content — `trip_policy_sections` (cancellation, refund,
payment terms, additional terms) above — needs a stricter publication gate
than marketing copy: a future RLS policy (and the application-level review
flow in front of it, docs/ARCHITECTURE.md §14) should require an elevated
role/approval before a change to `trip_policy_sections` reaches whatever `public`
read policies expose, distinct from the role allowed to edit gallery
captions or itinerary summaries. Not implemented yet — see docs/RBAC.md for
where that role distinction belongs once it exists.
