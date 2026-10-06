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

### admin_roles
**Implemented (Phase 4.3)** —
`supabase/migrations/20260928183648_create_admin_roles_and_read_policies.sql`.
Deliberately NOT the `profiles`/`roles`/`organization_members` design
sketched above: those describe the full future traveller identity system
(Phase 4.5+); this is a narrow, separate table holding exactly one fact —
"this `auth.users` row may administer content, at this role" — for the
small set of people who need it. An ordinary account has no row here at
all, which is the correct default (no privilege), not a placeholder.

Fields: `id` (references `auth.users`, primary key), `role` (`content_manager
| admin | super_admin` — three of docs/RBAC.md's eight roles, the only ones
with any content-administration capability in that document's own matrix),
`created_at`, `updated_at`. RLS: a user may `select` only their own row;
no `insert`/`update`/`delete` policy exists for `anon` or `authenticated` at
all — granting a role is a service-role-only operation
(`scripts/grant-admin-role.ts`), never a public or self-service write. See
`lib/admin/roles.ts` and docs/RBAC.md's "Content administration (Phase 4.3)"
section for the full role/permission model this backs.

### traveller_profiles
**Implemented (Phase 4.5)** —
`supabase/migrations/20260929133252_create_traveller_profiles.sql`. This
IS (a minimal slice of) the `profiles` design sketched above, arriving on
schedule where `admin_roles`'s own comment already named it: "Phase 4.5+".
Deliberately narrower than that original sketch — `username`, `bio`,
`city`, `date_of_birth`, `phone` and `privacy settings` are all omitted,
because nothing built this phase (no dashboard, no checkout, no community)
needs them; adding unused columns is exactly the kind of fabricated
functionality CLAUDE.md's own instructions warn against. `avatar_url` is
also omitted for the same reason (no UI surface displays one yet).

Fields: `id` (uuid, primary key), `user_id` (references `auth.users`,
unique — enforces at most one profile per account), `display_name` (text,
non-empty, CHECK-constrained), `created_at`, `updated_at`. Email is
deliberately NOT a column here — `auth.users.email` is the one identity
authority; see docs/ARCHITECTURE.md §18's "Identity boundary" for the full
reasoning.

RLS: a user may `select`, `insert` and `update` only the row where
`user_id = auth.uid()` — never `USING (true)`, never another user's row,
no enumeration. No `delete` policy: account deletion is explicitly
deferred (it would need to reason about `auth.users`, bookings and
payments together, a retention/data-policy decision this phase does not
make implicitly) — see docs/SECURITY.md §4's traveller-authentication
entry for the full RLS reasoning, and `lib/traveller/` for the
server-side code that relies on it.

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

**Public query shape (Phase 4.4C):** `lib/content/db/repository.ts` selects
every `trip_departures` row a trip has (RLS already restricts this to ones
the current reader may legitimately see — no extra filter here), and
`lib/content/db/map.ts`'s `selectPresentableDepartures` (plural) narrows
that to the presentable ones, soonest first. `mapTripPreview` still composes
with exactly one of those (the soonest — unchanged default) for the card,
but also reports `additionalDeparturesCount` when more than one exists.
`mapTripDetail` goes further: it maps every presentable departure into a
`TripDepartureOption` (`lib/content/types.ts`) and attaches the full,
ordered list as `TripDetail.departures` — this is what lets a trip like
Thailand Full Moon Party (3 real departures) show all three as selectable
options on `/trips/[slug]`, instead of collapsing to whichever one is
soonest. Trip-level content (itinerary, inclusions, exclusions, policy) is
composed once, from the `trips`/`itinerary_days`/etc. tables — never
duplicated per departure; only the commercial fields
(date/return date/price/currency/availability) vary per option.

### hosts
Renamed from `trip_hosts`: a reusable person record referenced by
`trips.host_id`, not a join table — the current domain model never
represents more than one host per trip (`TripPreview.host` is singular).
Fields: id, name, tagline, avatar_kind/avatar_src/avatar_alt/avatar_poster
(mirrors `TripMedia`'s discriminated shape), created_at, updated_at.

`trips.host_id` is nullable, and `TripPreview.host`/`TripDetail.host`
(`lib/content/types.ts`) are optional as of Phase 4.4B: real, live-captured
trips can have a genuine, on-the-record absence of a named host (the source
site only ever names a generic "Trip Captain" role, never a specific
person) — `lib/content/db/map.ts` omits the field rather than fabricating a
host or throwing, exactly like the already-optional `guide`.

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

**Implemented (Phase 4.4)** — domain architecture only, no checkout UI, no
payment gateway integration, no webhook handler —
`supabase/migrations/20260928190958_create_booking_domain_tables.sql`. This
is a deliberately narrower subset of the fields originally sketched below
than what shipped; see each table's own reconciliation note for what was
cut and why, and that migration's header for the full reasoning.

### bookings
A traveller's reservation against one `trip_departures` row — not the
trip's content, which it snapshots rather than joins live to (see
"Commercial snapshot" below). Renamed `booking_reference` to `reference`,
`user_id` to `traveller_id` (nullable — no traveller-authentication system
exists yet; see that column's own migration comment), and replaced
`currency`/`subtotal`/`discount_amount`/`total_amount`/`amount_paid`/
`amount_due` with a single `snapshot_price_amount`/`snapshot_price_currency`
pair: no coupon/discount system exists yet to subtract against, and
partial-payment tracking (`amount_paid` vs. `amount_due`) is exactly the
richer state `payment_installments` below was for — deferred with it.

Fields: `id`, `reference` (unique, generated — see "Booking reference"
below), `trip_departure_id`, `traveller_id` (nullable), `contact_name`,
`contact_email`, `contact_phone` (nullable — the minimum identity a booking
needs before/without a traveller account), `participant_count`, `status`
(`pending | confirmed | cancelled | completed` — see "Booking lifecycle"
below), seven `snapshot_*` fields (see below), `expires_at`,
`idempotency_key`, `created_at`, `updated_at`.

**`expires_at` / pending-hold expiry (Phase 4.6)** —
`supabase/migrations/20260929170452_*.sql`. Nullable `timestamptz`, set
automatically to `now() + 30 minutes` by `bookings_before_insert` for
every new pending booking (Phase 4.4's own trigger, extended rather than
duplicated) and cleared whenever a booking leaves `pending`. A new
function, `release_expired_booking_holds()`, cancels every pending booking
past its `expires_at` via a plain status `UPDATE` — that update runs
through the EXISTING `bookings_before_update_trigger`
(Phase 4.4), so seat release happens exactly the same way an ordinary
cancellation's does, not a second, parallel code path. Idempotent by
construction: the function's `WHERE status = 'pending' AND expires_at <
now()` only ever matches rows nothing has touched yet, so calling it twice
in a row is a no-op the second time. Called automatically at the front of
every new booking attempt (inside `bookings_before_insert`, before
reserving seats) rather than by a scheduler — none exists yet — but the
function is a standalone, independently-callable entry point specifically
so a future scheduled job can call it directly with no migration change.

**`idempotency_key` (Phase 4.6)** — nullable `uuid`, uniquely indexed where
not null. A client-generated key, one per booking-review session
(`crypto.randomUUID()`, generated once by
`components/booking/booking-wizard.tsx` and resent on every retry of the
same submission). `create_pending_booking()` (below) checks for an
existing booking with the same key before doing anything else and returns
it unchanged if one exists — a double-click, a network retry, or a
resubmitted form become a no-op replay, never a second booking. This is
strictly additive: a caller that never supplies a key (any direct SQL, a
future internal tool) gets an ordinary, non-deduplicated insert.

**`create_pending_booking(...)` (Phase 4.6)** — the one atomic entry point
a booking-creation flow calls: re-validates the departure itself
(`trip_departures.status in ('booking_open', 'almost_full')`,
`trips.content_status = 'published'`) inside the function rather than
trusting an earlier application-layer check, reads
price/currency/dates/title/slug/destination from `trips`/`trip_departures`
itself (never accepts them as parameters — see "Commercial snapshot"
below and docs/SECURITY.md's Phase 4.6 entry for why), inserts the booking
and its participants together, and returns the resulting row. One RPC call
is one transaction, so a rejected booking never leaves a partial row or
consumed capacity behind. Called only via the service-role client
(`lib/booking/repository.ts`) — `bookings`/`booking_participants` still
have no `anon`/`authenticated` INSERT policy (unchanged from Phase 4.4),
so this is the only write path that reaches either table.

### booking_participants
Renamed from `booking_guests`. One row per traveller a booking represents
— deliberately separate from `bookings` so a group booking needs no
duplicated booking rows. Fields: `id`, `booking_id`, `full_name`, `is_lead`
(at most one per booking, enforced by a partial unique index),
`created_at`. Intentionally minimal — no passport, government ID, date of
birth or medical information; none has an established requirement yet
(docs/SECURITY.md "collect only information needed").

### payments
Fields: `id`, `booking_id` (Phase 4.7: `on delete cascade` — see "FK fix"
below), `provider` (free text — no gateway hardcoded, `'razorpay'` as of
Phase 4.7), `provider_reference` (nullable, unique per provider via a
partial index — set at order-creation time to Razorpay's `order.id` — see
"Webhook idempotency" below), `provider_payment_id` (Phase 4.7, nullable,
unique per provider via a second partial index — set only once a payment
actually completes, to Razorpay's `payment.id`; a genuinely distinct value
from `provider_reference`, since Razorpay's own order/payment lifecycle has
two separate identifiers), `amount`, `currency`, `status` (`pending |
succeeded | failed | refunded` — separate from `bookings.status`
entirely), `failure_reason` (Phase 4.7, nullable text — the provider's own
failure description, recorded only on a failed payment, never containing
card/bank/UPI data), `captured_at` (nullable), `created_at`, `updated_at`.
Dropped `payment_method` and `metadata` (no gateway integration existed yet
at the time to populate either meaningfully) and `idempotency_key` (the
`(provider, provider_reference)` partial unique index already serves that
purpose — see below — without a second, parallel key to keep in sync with
it).

**FK fix (Phase 4.7):** the original `payments_booking_id_fkey` had no
`on delete` behaviour (unlike `booking_participants.booking_id`, which
already cascaded) — a latent Phase 4.4 gap that only surfaced once real
payment rows existed: deleting a booking with a payment failed with a
foreign-key violation, leaving its seat counters stuck. Fixed by dropping
and re-adding the constraint with `on delete cascade`.

**`record_payment_result()` (Phase 4.7):** the one, shared, idempotent
entry point both the webhook handler and the checkout-return verification
path call to record a payment outcome. Locks the payment row by `(provider,
provider_order_id)`, no-ops if the row is already resolved (not `pending`
— the single guard that makes duplicate/retried/out-of-order provider
events safe), rejects if the reported amount/currency doesn't match what
the row itself recorded at creation, and — only if the booking is still
`pending` — transitions it to `confirmed` on success, reusing the existing
`bookings_before_update` trigger rather than any new seat-accounting
code. See `docs/ARCHITECTURE.md` §20 for the full flow.

### Booking reference
Customer-facing, never the internal UUID —
`public.generate_booking_reference()` produces `WWS-` + 8 unambiguous
base32-style characters (excludes `0`/`O`/`1`/`I`); a `before insert`
trigger (`bookings_assign_reference`) fills it in when left null, retrying
up to 10 times against the table's own `unique` constraint (the actual
uniqueness guarantee) rather than trusting the generator's already-low
collision odds alone.

### Commercial snapshot
`bookings.snapshot_trip_title`, `snapshot_trip_slug`, `snapshot_destination`,
`snapshot_departure_date`, `snapshot_return_date`, `snapshot_price_amount`,
`snapshot_price_currency` — the commercial facts of one transaction, fixed
at booking time, never re-read from `trips`/`trip_departures` for
historical display. Deliberately not the whole trip/departure row: an
itinerary correction, a reworded FAQ or a new host has no commercial
meaning for an existing booking. Each field is one fact a receipt or a
support conversation needs to state confidently regardless of what the
live content says today — verified by an integration test that edits the
trip's title after booking and confirms the snapshot is unaffected.

### Departure capacity / seat reservation
`trip_departures.capacity` / `seats_reserved` / `seats_confirmed` already
existed (Phase 4.1) with exactly the constraints this needed
(`seats_confirmed <= seats_reserved <= capacity`) — no new commercial
inventory table was added. Three functions
(`bookings_reserve_seats`/`bookings_release_seats`/`bookings_confirm_seats`)
and three `bookings` triggers (`before insert`/`before update`/`before
delete`) keep those counters and a booking's lifecycle in lock-step:
inserting a booking atomically reserves its `participant_count` seats
(raising, aborting the whole insert, if capacity is unavailable);
confirming moves the same count into `seats_confirmed`; cancelling or
deleting releases it. See "Concurrency" below for why the reservation step
is safe under simultaneous requests.

### Booking lifecycle
`pending -> confirmed -> completed`, plus `cancelled` from either `pending`
or `confirmed`; `cancelled`/`completed` are terminal. Enforced twice —
`lib/booking/status.ts` (the future application-layer reference) and
`booking_status_transition_is_valid()` + the `bookings_before_update`
trigger (the actual, only enforcement point today, since no
booking-write application layer exists yet). Deliberately narrower than
the DRAFT/PENDING_PAYMENT/CONFIRMED/PARTIALLY_PAID/BALANCE_DUE/COMPLETED
model this document originally sketched (see §12) — that richer model is
what a future partial-payment/instalment feature would need; this phase
doesn't have one yet.

### Payment lifecycle
`pending -> succeeded | failed`, and `succeeded -> refunded` once a future
refund flow exists (not built this phase — no refund business rules have
been supplied, and none are invented here; see `docs/ARCHITECTURE.md` §20
"Refunds — explicitly deferred"). Entirely independent of `bookings.status`:
a booking can exist while payment is pending, and a booking is never
auto-confirmed merely because a payment row exists — confirming a booking
is a deliberate, separate write performed only by `record_payment_result()`
after independent provider verification (Phase 4.7).

### Webhook idempotency
Implemented Phase 4.7 (`app/api/webhooks/razorpay/route.ts`): the schema's
two partial unique indexes are the entire uniqueness mechanism — no
separate webhook-events ledger table. `payments_provider_reference_unique`
on `(provider, provider_reference) where provider_reference is not null`
(order-creation time) and `payments_provider_payment_id_unique` (Phase
4.7) on `(provider, provider_payment_id) where provider_payment_id is not
null` (payment-completion time) — kept as two separate columns/indexes
rather than one, since Razorpay's order and payment identifiers are
genuinely different values with different lifetimes. A duplicate or
retried webhook delivery, or the checkout-return path and the webhook
racing each other for the same payment, both resolve through
`record_payment_result()`'s own "already resolved -> no-op" guard (see
above) rather than relying on the indexes to reject a second insert —
every delivery is an `update` against the existing row, never a second
`insert`.

### Concurrency
`bookings_reserve_seats` is one `UPDATE ... WHERE ... RETURNING`-shaped
statement: Postgres holds the row lock on the `trip_departures` row for
the duration of both the capacity check and the increment, so two
concurrent booking attempts against the same departure's last seat
serialize on that lock — the second transaction's `WHERE` clause
re-evaluates `seats_reserved` only after the first has committed, and
correctly sees no capacity left. No read-then-write race exists anywhere
in JavaScript; nothing in the application layer ever increments
`seats_reserved` directly. Verified with an integration test that fires
five concurrent single-seat booking attempts at a two-seat departure and
confirms exactly two succeed.

### Deferred (a future phase, once the features they support are real)
`payment_installments` (partial payment schedules), `refunds` (a dedicated
table — for now, a future refund is a payments-table
`status: 'refunded'` row, documented above, not a new table), `coupons`
(server-side eligibility/amount validation, once a discount system
exists). None are built or stubbed this phase.

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
profile (not built yet — Phase 4.5+)
  |
  +-- bookings --> booking_participants   (implemented, Phase 4.4 —
  |                                        traveller_id nullable until
  |                                        profile exists)
  +-- communities --> community_members
  |
  +-- wishlist

trip
  |
  +-- trip_departures                      (Phase 4.1)
        |
        +-- bookings                       (Phase 4.4 — snapshots trip/
              |                             departure facts; does not
              |                             live-join them for history)
              +-- booking_participants
              +-- payments

trip_departure
  |
  +-- community
        |
        +-- members
```

## 12. State models

### Booking

**Implemented (Phase 4.4), narrower than originally sketched here** — see
§4's "Booking lifecycle" for the full reasoning:

pending → confirmed → completed

Alternate: pending → cancelled, confirmed → cancelled (both terminal)

The richer model originally sketched for this section —
DRAFT → PENDING_PAYMENT → CONFIRMED → PARTIALLY_PAID → BALANCE_DUE → COMPLETED,
with PENDING_PAYMENT → PAYMENT_FAILED and
CONFIRMED → CANCELLED → REFUND_PENDING → REFUNDED — remains the intended
model for whenever partial payments and refunds become real features
(docs/ROADMAP.md Phase 6); this phase's `payments.status`
(`pending | succeeded | failed | refunded`, §4) is where that nuance lives
today instead of a richer booking-status enum.

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

**Implemented (Phase 4.3)**: `trips`, `trip_departures`, `itinerary_days`,
`trip_inclusions` and `trip_exclusions` each got one ADDITIONAL permissive
`select` policy — never an edit to the Phase 4.1 policy above, which keeps
working unchanged for every reader with no admin role — granting a
signed-in user whose `admin_roles` row has `content_manager`, `admin` or
`super_admin` read access regardless of `content_status`/departure `status`,
via the shared `public.current_admin_role()` helper function. This is the
only RLS change Phase 4.3 made: every admin WRITE still goes through the
service-role client exactly as before, after
`lib/admin/authorize.ts`'s application-layer role check — RLS was extended
for admin READS only, deliberately, rather than reimplementing every
lifecycle-transition rule a second time as SQL `with check` clauses (see
`lib/admin/transitions.ts` and that migration's own header comment).

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

**Implemented (Phase 4.4)**: `bookings`, `booking_participants` and
`payments` have RLS *enabled* but deliberately *zero* policies for `anon`
or `authenticated` — not even a self-read policy, and not an "admins can
read every ..." policy either, unlike Phase 4.3's content tables. Two
reasons, both temporary:

- No traveller-authentication architecture exists yet to scope a "read
  your own bookings" policy against — `bookings.traveller_id` is null for
  every row today, and writing that policy against an identity system that
  doesn't exist would be untestable, premature RLS.
- No admin booking-management UI exists yet (explicitly out of scope this
  phase) to justify an admin-read policy the way Phase 4.3 added one for
  trip content — a policy with nothing to consume it would be a feature
  added merely because it's possible.

Every access path today is the service-role client only
(`lib/supabase/admin.ts`), after an application-layer authorization check
— the same `lib/admin/` pattern Phase 4.3 established, which a future
booking-operations surface reuses rather than reinvents (see
docs/ARCHITECTURE.md's Phase 4.4 section for the intended
content-administration / departure-management / booking-operations
boundary). RLS stays enabled regardless, so a real policy added later
takes effect immediately with no separate "turn RLS on" migration step.

**Implemented (Phase 4.6)**: traveller-authentication now exists (Phase
4.5), so exactly ONE of those two temporary conditions above is resolved
— the first reason no longer applies, and Phase 4.6 adds exactly the
policy that reason was waiting on:

```sql
create policy "a traveller can read their own bookings"
  on public.bookings
  for select
  to authenticated
  using (auth.uid() = traveller_id);
```

Narrowest possible shape: a signed-in traveller reads only their own
`bookings` rows (never another's, never a guest booking — `traveller_id`
is null for those, and `auth.uid()` can never equal null). The SECOND
reason (no admin booking-management UI) still applies unchanged — no
admin-read policy was added, and none is planned until that UI exists.
`booking_participants` and `payments` get NO new policy either — nothing
built this phase reads either back, and a guest's own confirmation is
shown from the creation call's direct return value, never a subsequent
read (see docs/ARCHITECTURE.md §19's "RLS / privacy" for the full
reasoning, including why this is deliberately not a "reference alone
grants access" model). Every WRITE still goes exclusively through
`create_pending_booking()` via the service-role client — this phase adds
one read policy, zero write policies.

**Implemented (Phase 4.8)**: the traveller dashboard is the first real
reader of `booking_participants` and `payments` — the gap the Phase 4.6
note above left open. Two new SELECT policies
(`20260930090000_create_traveller_dashboard_reads.sql`), shaped
identically to `bookings`'s own policy above, just one join away:

```sql
create policy "a traveller can read their own booking's payments"
  on public.payments
  for select
  to authenticated
  using (
    exists (
      select 1 from public.bookings b
      where b.id = payments.booking_id
        and b.traveller_id = auth.uid()
    )
  );
```

(`booking_participants` gets the identical shape, substituting its own
`booking_id`.) A row is visible only when its PARENT booking belongs to
the authenticated user — a guest booking's participants/payment can never
match for any real `auth.uid()`. Still zero INSERT/UPDATE/DELETE
policies on either table; this phase remains read-only, and every write
path (`create_pending_booking`, `record_payment_result`) is unaffected,
since both already use the service-role client.
