# Wander With Stars V2 — Architecture

## 1. Architecture goal

Build a production-ready, secure, scalable modular monolith suitable for real public use and portfolio-level technical discussion.

## 2. Stack

### Frontend
- Next.js
- TypeScript
- App Router
- Tailwind CSS
- shadcn/ui

### Backend/data
- Supabase
- PostgreSQL
- Supabase Auth
- Supabase Storage
- Supabase Realtime where justified
- Supabase Edge Functions where justified

### Deployment
- GitHub
- Vercel

### External integrations
- Payment provider
- Transactional email
- WhatsApp Business/API
- AI provider
- Analytics
- Error monitoring

## 3. High-level system

```text
USER
  |
  v
VERCEL / NEXT.JS
  |
  +------------------ PUBLIC WEBSITE
  +------------------ AUTHENTICATED APP
  +------------------ ADMIN APP
  +------------------ CREATOR APP (later)
  |
  v
SUPABASE
  |
  +-- PostgreSQL
  +-- Auth
  +-- Storage
  +-- Realtime
  +-- Edge Functions

External:
  Payments / Email / WhatsApp / AI / Analytics / Monitoring
```

## 4. Architecture principles

- Modular monolith first
- Domain boundaries should be explicit
- Keep server/client boundaries clear
- Prefer server-side data access for sensitive operations
- Avoid premature abstraction
- Avoid premature microservices
- Make security a design property, not a patch
- Make payment state transitions idempotent

## 5. Suggested application domains

- Marketing
- Travel discovery
- Trips
- Booking
- Payments
- Identity/auth
- Traveller profile
- Community
- Notifications
- CRM/leads
- Creators
- Analytics
- AI
- Administration

## 6. Code organisation

```text
app/
  (marketing)/
  trips/
  dashboard/
  admin/
  creator/
  api/

components/
  ui/
  travel/
  booking/
  community/
  dashboard/
  admin/
  creator/

lib/
  supabase/
  auth/
  payments/
  ai/
  analytics/
  notifications/
  validations/

supabase/
  migrations/
  functions/
  seed/

tests/
  unit/
  integration/
  e2e/

docs/
public/
scripts/
```

### Implemented so far (Phase 1)

The tree above is the target. What currently exists:

```text
proxy.ts                  session refresh on every matched request
app/
  layout.tsx              minimal shell
  page.tsx                placeholder
  globals.css             Tailwind wiring + token mapping
  api/health/route.ts     backend connectivity check
lib/
  env/client.ts           validated public config
  env/server.ts           validated secrets, server-only
  supabase/client.ts      browser client
  supabase/server.ts      server client, acts as the user
  supabase/admin.ts       service-role client, server-only
  supabase/middleware.ts  session refresh implementation
styles/tokens.css         design token infrastructure (values not yet decided)
supabase/                 CLI config and migrations
.github/workflows/ci.yml  typecheck, lint, format
```

Note: Next 16 renamed the `middleware` file convention to `proxy`. The file is
`proxy.ts`; the behaviour is unchanged.

## 7. Environment model

Development, Preview, and Production must be isolated.

Recommended deployment flow:

```text
feature/*
  -> local tests
  -> GitHub push/PR
  -> Vercel Preview
  -> review
  -> merge to main
  -> Vercel Production
```

## 8. Data access

Use the minimum privilege necessary. Public pages may read public trip data. Authenticated users may read only permitted private data. Admin operations must use server-side authorization.

### Session handling

Supabase access tokens are short-lived and Server Components cannot write
cookies, so the refresh happens in `proxy.ts` — the one place that can read
request cookies and write them back onto the response.

Two constraints are load-bearing:

- `supabase.auth.getUser()` must be called, never `getSession()`. `getSession`
  decodes the cookie without verifying it against the Auth server, so it will
  report a user from a forged or expired token.
- The response carrying the refreshed cookies must be the one returned.
  Constructing a new response afterwards silently discards them.

The proxy performs no authorisation. Route protection needs somewhere to
redirect to, which arrives with Phase 4; authorisation remains a server-side
and RLS concern regardless.

### Environment validation

Public configuration (`lib/env/client.ts`) and secrets (`lib/env/server.ts`)
are validated separately with Zod. The server module carries `server-only`, so
importing it from client code is a build error.

Validation is eager, at module load. Because `NEXT_PUBLIC_*` values are inlined
into the client bundle at build time, a build without them would produce a
broken deployment — so the build fails instead, naming every missing variable.
This means **builds require environment configuration**, including on Vercel.

## 9. Server-only secrets

Service-role/database-admin secrets must never be sent to the browser. Payment secrets, webhook secrets, and privileged AI/API credentials belong in server-side environment configuration.

## 10. Performance

- Prefer Server Components where appropriate
- Use client components only when interaction requires them
- Paginate large lists
- Avoid N+1 queries
- Index common filters and joins
- Optimise image delivery
- Lazy-load non-critical media
- Cache appropriately

## 11. Observability

Prepare for:
- Structured logs
- Error tracking
- Analytics events
- Audit logs
- Webhook logs
- Operational alerts

## 12. Testing strategy

Critical paths require end-to-end tests:

1. Explore trip
2. Signup/login
3. Complete traveller profile
4. Create booking
5. Complete payment
6. Receive/verify webhook
7. View confirmed booking
8. Admin sees booking
9. Community membership created
10. Notification sent

## 13. Evolution path

Start modular monolith. Extract a service only when a domain has a demonstrated scaling, deployment, isolation, or ownership reason.

## 14. Content ingestion pipeline (Phase 3.6)

Prepares the application to accept real WWS content (brochures, itineraries,
policies, media) without touching the presentation layer. `TripDetail`
(`lib/content/types.ts`) is the presentation contract — the trip detail UI
(`components/trips/*`, `app/(marketing)/trips/[slug]/page.tsx`) is built
against it and does not change here. This section is entirely about what
happens *before* a value becomes a `TripDetail`.

```text
RAW / EXTERNAL SOURCE
  |  (a format-specific adapter — not part of this codebase yet — maps
  |   source fields to RawTripInput's field names; see the mapping table
  |   below)
  v
RawTripInput            lib/content/ingest/types.ts
  |
  v  normalizeTripInput()   lib/content/ingest/normalize.ts
  |
NORMALIZED TRIP CONTENT
  |
  v  tripDetailSchema.safeParse()   lib/content/ingest/schema.ts
  |
VALIDATED TripDetail, wrapped as ContentRecord<TripDetail> at status 'draft'
  |
  v  (not implemented yet — see "Approval boundary" below)
  |
ContentRecord promoted to 'published'
  |
  v
Supabase (future — see "Future Supabase integration seam" below)
  |
  v
lib/content/queries.ts (unchanged signature)
  |
  v
TripDetail UI (unchanged)
```

`ingestTripContent()` (`lib/content/ingest/index.ts`) is the whole boundary
in one function: `raw -> normalize -> validate -> ContentRecord`. It never
reads a file, calls a database, or talks to Supabase — every one of those
is a future integration point named explicitly below, not built here.

### Source → structured field mapping

Documented, not guessed: a field with no obvious source equivalent is left
for a human to resolve when real source material exists, not inferred.

| Real WWS source | Structured field |
|---|---|
| Brochure title | `TripDetail.title` |
| Destination name | `destination` |
| Destination country | `country` |
| Departure date | `departureDate` (normalized to `YYYY-MM-DD` — see normalization below) |
| Trip duration | `durationNights` |
| Price | `price.amount` + `price.currency` |
| Availability / seats left | `availability.status` + `availability.spotsLeft` |
| Host name/bio | `host.name` / `host.tagline` (never a bio field — `HostPreview` has none; see §9 in lib/content/types.ts's `TripDetail` comment) |
| Guide name/bio | `guide.name` / `guide.tagline` (`GuidePreview = HostPreview`) |
| Itinerary (day-by-day) | `itineraryPreview[]` (`{ day, title, summary }`) |
| Photographs / hero image | `heroMedia`, `gallery[]` (`TripMedia`, `kind: 'image'`) |
| Videos | `TripMedia`, `kind: 'video'` (`src` + `poster`) |
| Inclusions | `inclusions: string[]` |
| Exclusions | `exclusions: string[]` |
| Accommodation | `accommodation[]` (`TripAccommodation`) |
| Transport | `transport[]` (`TripTransport`) |
| Meeting/pickup point | `meetingPoint` (`TripMeetingPoint`) |
| Packing list | `thingsToCarry: string[]` |
| Traveller-facing context notes (etiquette, weather, connectivity, money, cultural, health, arrival) | `importantNotes[]` with `category` set (`TripImportantNote` — see its comment in lib/content/types.ts for why this is not a second array) |
| Practical warnings (visa, fitness, climate) | `importantNotes[]`, `category` omitted or set as appropriate |
| FAQs | `faqs[]` (`TripFAQ`) |
| Cancellation policy | `policy.cancellation` (`TripPolicySection`) |
| Refund policy | `policy.refund` |
| Payment terms | `policy.paymentTerms` |
| Additional/trip-specific terms | `policy.additionalTerms[]` |
| Optional add-ons / extra costs | `extras[]` (`TripExtra`) |
| Trip style / atmosphere | `styleScores` — **ambiguous**: real source material rarely states "adventure: 70" directly; deriving a score from brochure language is an editorial judgement call for whoever reviews the content, not something this pipeline infers automatically |
| Creator content | Not part of `TripDetail` at all — belongs to `CreatorExperience` (`lib/content/types.ts`), a separate content type with its own future ingestion path |

Ambiguous or unmapped source fields must be resolved by whoever builds the
format-specific adapter for that source, not guessed at here.

### Validation boundary

`lib/content/ingest/schema.ts` — a Zod schema (the project's existing
validation technology; see §8's "Environment validation" for the same
pattern already used by `lib/env/*`) mirroring `TripDetail` field for
field. It **rejects** malformed content (a bad slug, a non-ISO date, a
negative price, a duplicate itinerary day number, an unknown media `kind`)
rather than repairing it — a schema that both "fixes" and "rejects" hides
which failures are the source's fault. See that file's own comments for
every field's exact rule, and its documented limitation: currency codes are
validated by shape (`[A-Z]{3}`) only, not against a full ISO 4217
whitelist.

### Normalization boundary

`lib/content/ingest/normalize.ts` — runs *before* validation, and is
strictly mechanical: whitespace cleanup, slug derivation/cleanup, ISO
datetime truncation to a bare date, enum case-folding (`"Open"` ->
`"open"`), currency-code case-folding. It never invents a missing field,
infers a price, infers a date, infers policy language, or fabricates an
itinerary activity — ambiguous input (a date that could be DD/MM or MM/DD)
is left untouched so validation fails loudly on it instead of silently
guessing wrong.

### Content lifecycle

`ContentStatus` (`lib/content/ingest/types.ts`): `draft -> review ->
approved -> published -> archived`. `ingestTripContent()` always produces a
`draft` `ContentRecord` — never `published` — so a freshly ingested
brochure can never become visible to the public query layer automatically.
`isPublishable()` is the one gate a record must pass before
`lib/content/queries.ts` may serve it.

This is independent of docs/DATABASE.md §12's "Trip departure" state model
(`DRAFT -> PUBLISHED -> BOOKING_OPEN -> ...`), which tracks booking/seat
availability, not editorial review — a departure can be `BOOKING_OPEN`
while its content is mid-`review` for a correction.

**Not implemented in this phase:** the actual promotion flow (who moves a
record from `draft` to `published`, and where that happens) — no admin UI,
no CMS, no RBAC enforcement, no database column yet. This phase only
defines the boundary and its types.

### Approval boundary for commercial/legal content

`policy` (`TripPolicy` — cancellation, refund, payment terms, additional
terms) must be treated differently from marketing copy: it is
commercial/legal content a traveller relies on when deciding to book. A
future implementation must require an explicit, elevated approval step
before a `ContentRecord` whose `data.policy` has changed can reach
`published` — not the same reviewer/role gate as, say, updating gallery
captions. This is a requirement to design for, not implemented yet: see
docs/RBAC.md for where that role distinction belongs once it exists, and
docs/DATABASE.md §14 (RLS design notes) for the same principle applied to
row-level access.

### Media storage strategy

Real WWS media (hero images, gallery images, itinerary/day images, videos,
creator media, traveller memories) belongs in **Supabase Storage**, never
in this Git repository — no production photography, and definitely no
video files, committed to GitHub (see docs/SECURITY.md and this project's
general no-secrets-no-binaries posture). `TripMedia` (`lib/content/types.ts`)
already models this correctly: `src`/`poster` are plain strings — stable
identifiers or paths, not embedded binary data — so a Storage path
(`trips/<slug>/hero.jpg`) or a signed/public Storage URL both satisfy the
existing type with no shape change. Path-format validation (bucket
naming, allowed extensions) belongs to whichever module owns the Storage
convention once real uploads exist — deliberately not built in this phase.

### Supabase integration seam (implemented, Phase 4.2)

`lib/content/queries.ts`'s functions return `Promise<ContentState<T>>` and
are called only from `lib/content/queries.ts`, never `lib/content/fixtures.ts`
directly (see that file's own header comment) — the seam a Supabase-backed
implementation needed, kept exactly as originally designed: each function's
*body* dispatches to fixtures or to a database query (`lib/content/db/`)
behind `lib/content/db/source.ts`'s explicit `CONTENT_SOURCE` switch, the
signature never changes, and no UI component notices which one answered it.

`lib/content/db/` is the data-access layer that seam now dispatches to:

- `repository.ts` — server-only (`import 'server-only'`), queries Supabase
  through `lib/supabase/server.ts`'s existing session-aware client (never
  `lib/supabase/admin.ts`), relying entirely on the Phase 4.1 RLS policies
  for visibility — it applies no `content_status`/departure `status` filter
  of its own.
- `schema.ts` — hand-maintained row types, now layered on top of the real,
  generated `lib/supabase/database.types.ts` (Phase 4.2A —
  `npm run db:types:local`) rather than standing in for it: it exists
  specifically for the literal-union status/kind/category columns a
  CHECK-constrained text column generates as plain `string` for, which
  `lib/content/db/map.ts` needs precise types for. See that file's own
  header for the full reasoning.
- `map.ts` — pure functions (`mapTripPreview`, `mapTripDetail`,
  `selectPresentableDeparture`/`selectPresentableDepartures`) composing one
  `trips` row and its `trip_departures` rows into the existing `TripPreview`/
  `TripDetail` domain shapes (`lib/content/types.ts`). `TripPreview` still
  composes with exactly one departure (the soonest); `TripDetail` composes
  with the soonest one for its own top-level fields AND attaches every
  presentable departure, ordered, as `TripDetail.departures` — Phase 4.4C's
  multi-departure selection (see docs/DATABASE.md's `trip_departures`
  section for the full reasoning).

`lib/content/queries.ts`'s dynamic `import('./db/repository')` inside each
database-path function (rather than a top-level import) is deliberate: it
keeps `server-only` out of the module graph entirely when
`CONTENT_SOURCE=fixtures` (the current default — see `db/source.ts` for
why), so every existing fixture-mode test and render path is unaffected.

Not built in this phase: a CMS, an admin upload/publishing panel, or
booking/payments. `CONTENT_SOURCE` still defaults to `'fixtures'`, not
`'database'` — Phase 4.2A verified the schema against a real *local* Postgres
database (Docker), which proved the migrations and query layer work, but no
*deployed* environment (Vercel, or the actual remote Supabase project in
`.env.local`) has a migrated database to point at yet. Flipping the switch is
still a one-variable change, once one does.

### Database-backed public catalogue mode (Phase 4.4B)

`CONTENT_SOURCE=database` is now a verified, working, opt-in local mode —
not just a designed-but-unused switch. To run it against the local Supabase
stack (`npx supabase start`):

```sh
CONTENT_SOURCE=database \
NEXT_PUBLIC_SUPABASE_URL=http://127.0.0.1:54321 \
NEXT_PUBLIC_SUPABASE_ANON_KEY=<local anon key, from `npx supabase status`> \
SUPABASE_SERVICE_ROLE_KEY=<local service-role key, only needed by seed scripts> \
npm run dev
```

`CONTENT_SOURCE` still defaults to `'fixtures'` — this section documents an
explicit, reproducible way to opt into the other mode locally, it does not
change what a plain `npm run dev` does. There is deliberately no fallback
from `'database'` to `'fixtures'` on a query error: `lib/content/queries.ts`
lets a failed database read surface as a real error, so a broken database
connection is never silently masked by fixture content standing in for it.

Real content reaches this mode through the same content lifecycle Phase 4.3
built, never a direct status write: `scripts/seed-live-catalogue.ts` inserts
trip/departure rows as `draft`, and `scripts/publish-live-catalogue.ts`
walks each one through `draft → review → approved → published` using
`lib/admin/transitions.ts`'s `canTransition` (see that script's own header
for why it re-implements the transition sequence rather than importing
`lib/admin/repository.ts` directly — that module's `server-only` import
throws outside Next's build). Public visibility then follows entirely from
the existing RLS policies — no public-only special-case policy exists, and
no service-role client is used to render the public site.

See `docs/source-material/wws-live/README.md` for what content is actually
seeded this way (Thailand, Vietnam, Bali — the real, live-captured WWS
catalogue), how source versioning/change-detection works, and
`scripts/audit-live-parity.ts` for the automated parity audit between the
live source and this rebuilt site's rendered pages.

### Departure selection (Phase 4.4C)

Thailand Full Moon Party has three real, independently-priced-and-dated
departures. Phase 4.4B's `/trips/[slug]` only ever showed one (whichever
`selectPresentableDeparture` chose) — Phase 4.4C exposes all of them without
duplicating trip content or redesigning the route structure:

- **Domain model**: `TripDepartureOption` (`lib/content/types.ts`) — id,
  departure date, optional return date, price, availability. `TripDetail`
  gained an optional `departures: TripDepartureOption[]` field; every other
  `TripDetail`/`TripPreview` field is unchanged, so every existing fixture
  and every existing consumer keeps working without modification.
  `TripPreview` also gained an optional `additionalDeparturesCount` — "how
  many other departures exist," for the compact card, never the full list.
- **Deriving options safely**: `lib/content/departures.ts`'s
  `getDepartureOptions(trip)` is the one place that reads
  `TripDetail.departures` — when it's absent (every fixture, and any real
  trip with exactly one departure), it derives a single option from the
  record's own top-level `departureDate`/`price`/`availability`/`id`
  fields, so nothing downstream needs two code paths for "one departure" vs
  "many."
- **UI**: `components/trips/departure-panel.tsx`'s `TripDeparturePanel`
  (client component, replacing the old static `TripHero` metadata block and
  the standalone `TripBookingCTA`) renders nothing selector-shaped for a
  single-departure trip — only a trip with more than one option shows the
  radio group (`components/ui/field.tsx`'s existing `Radio`, not a bespoke
  control, so keyboard/screen-reader behaviour comes for free), defaulting
  to the soonest. Selecting an option updates the commercial metadata and
  the booking-CTA copy together, from one piece of client state — the exact
  id a future booking would need (`bookings.trip_departure_id`, Phase 4.4).
  No URL-level departure identity (`?departure=…` or a per-departure route)
  was introduced: nothing downstream reads the selection across a page
  load yet (no booking flow exists to hand it to), so that would be state
  with no consumer — revisit this decision once a real booking flow exists.
- **Known limitation carried over from Phase 4.4B**: the live site still
  gives each Thailand departure its own URL; this project's one-route-per-
  trip-slug model does not. Phase 4.4C makes all three departures visible
  and selectable on the one route rather than adding three new routes —
  that was a deliberate choice (documented in
  docs/source-material/wws-live/README.md's "Known limitation" section),
  not an oversight.

### Commercially-incomplete source content (Phase 3.7)

Real source material can describe a trip completely — route, itinerary,
inclusions, exclusions — before any of it is sellable: no price set, no
departure date confirmed, no seats opened, no host/creator assigned. Feeding
that into `ingestTripContent`/`tripDetailSchema` correctly fails, since
`departureDate`/`price`/`availability`/`host` are required there — and it
should keep failing for anything claiming to be publishable content.

Rather than invent those four fields (forbidden — see CLAUDE.md and this
phase's own report) or make them optional on `TripPreview`/`TripDetail`
themselves (which every fixture, query and trip-card/detail component
already assumes are present, and which would need to become optional
everywhere just to accommodate a handful of not-yet-commercial drafts), a
second, narrower schema exists for exactly this case:

- `DraftTripDetail` (`lib/content/ingest/types.ts`) — `TripDetail` with only
  `departureDate`, `price`, `availability` and `host` made optional.
- `draftTripDetailSchema` (`lib/content/ingest/schema.ts`) — mirrors
  `tripDetailSchema` field for field, with those same four fields optional.
- `ingestDraftTripContent()` (`lib/content/ingest/index.ts`) — the same
  `raw -> normalize -> validate -> ContentRecord` pipeline as
  `ingestTripContent`, against `draftTripDetailSchema`. Still always
  `status: 'draft'`.

`TripPreview`, `TripDetail`, `tripPreviewSchema`, `tripDetailSchema`,
`lib/content/queries.ts` and every consuming component are completely
unchanged by this — a `DraftTripDetail` record only ever becomes
publishable by a human supplying the missing commercial fields and the
result separately passing `ingestTripContent`/`tripDetailSchema`. This is
the "optional at the content level, scoped to draft-only" resolution of the
choice this phase's own instructions posed (make the fields optional, or
keep the whole record in `draft`/`review`) — it is both at once, at the
narrowest place that could hold it.

### Phase 3.7 worked example: Vietnam WWS 7D6N

The first real (non-fixture) content this pipeline has ingested:
`lib/content/ingest/sources/vietnam-wws-7d6n.ts`, sourced from
`docs/source-material/vietnam/Vietnam X WWS 7D6N  (1).pdf` (9 pages, read in
full before any field was written). `ingestDraftTripContent` on it returns
`ok: true` with `record.status === 'draft'` (`tests/unit/content-ingest.test.ts`
asserts this).

Page → field mapping actually used:

| PDF page | Source content | Structured field |
|---|---|---|
| 1 (cover) | "VIETNAM" + "6N/7D" | `title: 'Vietnam 6N/7D'` (combined; the bare destination name alone is not a usable title) |
| 2 | Route: HCMC (1N) → Da Nang (3N) → Hanoi (2N) | `destination: 'Ho Chi Minh City, Da Nang & Hanoi'`, `accommodation[].nights` per leg |
| 3 | "7 Days, 6 Nights" | `durationNights: 6` |
| 2–3 | Route, team, meals, accommodation, transfers | `overview` (composed from these facts; no new claims added) |
| 4–7 | "Itinerary", Day 1–7 headings + body paragraphs | `itineraryPreview[]` (`title` = heading minus the "Day N:" prefix, `summary` = body verbatim) |
| 8, "Inclusions" | Flat bullets + the "Activities & Tour" sub-list | `inclusions: string[]` (the sub-list's ten items flattened into the same array — a structural change to fit the existing flat-list convention, not a content change) |
| 8, "Exclusions" | Every bullet, including the E-visa fee (₹2900) | `exclusions: string[]` verbatim; the fee is a legal/pricing-sensitive source claim, flagged in the record's `reviewNotes`, not independently verified |
| 3, 8 | "3 & 4 Star Premium Hotels", "Twin Sharing" | `accommodation[].type`; no property name exists in the source, so none is invented — `description` carries only the city |
| 8 | Domestic flights, van/bus transfers, airport pickup | `transport[]` |
| 2, 3 (destination facts) | 11 "Know Before You Go" / "Did You Know?" facts | See below — only 3 became `importantNotes[]` |
| — | Price, departure date, availability, host, guide name, FAQs, cancellation/refund/payment terms, packing list, meeting point | Absent from the source; left absent, not invented (the first four are exactly what `DraftTripDetail` makes optional) |
| 9 | WhatsApp, phone, Instagram, email | Not imported anywhere — see "Contact information" below |
| Cover, 2, 3, 4–7 | Photographs | Not imported — see "Media" below |

**Destination facts — accept/reject.** The source states 11 short facts (5 on
page 2, "Know Before You Go"; 5 on page 3, "Did You Know?" plus one already
counted). Per this phase's instruction, these do not automatically become
`TripDetail.importantNotes` — only where a fact is genuinely practical
traveller guidance, not marketing trivia:

- **Imported** (3): Dragon Bridge breathes fire on weekends only (relevant
  to planning the Day 4 evening); Hanoi Train Street's trains pass inches
  from cafés (a real safety/awareness note, and the itinerary visits it);
  Vietnam's streets have more scooters than pedestrians (practical road
  safety awareness for first-time visitors).
- **Not imported** (8, all left as source-only trivia, no structured field
  holds them): the Café Apartments' history; the Ba Na Hills cable-car
  world record; Hoi An's lantern count (stated twice in the source); Ha
  Long Bay's island count; Sơn Đoòng cave (not even part of this
  itinerary); the egg-coffee origin story; Bia Hoi's price-per-glass (a
  second pricing-sensitive figure, excluded rather than imported and
  flagged, since it is not WWS commercial content at all — a piece of
  local color, not a fact the pipeline needed to carry).

**Contact information (page 9).** WhatsApp link, two phone numbers, the
Instagram handle (`@wanderwithstars.co` — matches the handle already live
at `app/(marketing)/contact/page.tsx`) and an email address. `TripDetail`
has no contact field at all, and the contact page's Instagram-only
architecture is a deliberate, already-documented product decision (see
that file's own header comment: no backend exists for a form, Instagram is
the one genuine, already-live channel). Adding the other three channels to
that page is a product decision this content-import phase does not make —
left untouched; the match on the Instagram handle is the only thing worth
recording here.

**Media.** No image or video from the PDF was extracted into this
repository — the brochure's photographs are not cleared for reuse as
production trip media, and this phase's instructions explicitly forbid
pulling copyrighted PDF images into production assets. `heroMedia` is
`{ kind: 'placeholder' }` and `gallery` is `[]`, exactly the gap `TripMedia`'s
`placeholder` variant exists for. When real WWS photography for this trip
exists, it belongs in Supabase Storage under a path such as
`trips/vietnam-6n7d/hero.jpg` (see "Media storage strategy" above) — never
committed to this repository.

**Source inconsistencies preserved, not fixed.** Two things in the PDF text
look like authoring artifacts rather than intended content, and both are
preserved verbatim in `itineraryPreview` rather than silently corrected:
Day 4's paragraph contains a stray lone "Y" mid-sentence (page 5); Day 5 is
titled "... & Club Night" but its body paragraph only describes the Train
Street visit, with no club-night content anywhere (page 6). Both are called
out in code comments and in the record's `reviewNotes`.

## 15. Content administration (Phase 4.3)

Establishes the first authenticated, privileged write path in the
application — everything before this phase was either public reads or
local/CI tooling (`scripts/`).

### Route structure

`app/admin/` — a sibling to `app/(marketing)/`, not nested inside it, so it
shares only the root layout (html/body/font/globals.css) and nothing of the
public site's header, footer, or navigation. Nothing in the public shell
links here.

```text
app/admin/
  layout.tsx              auth-agnostic shell (wraps login too)
  login/page.tsx           email/password sign-in (Supabase Auth)
  (protected)/
    layout.tsx              session gate (UX redirect, not the security boundary)
    page.tsx                 redirects to /admin/trips
    trips/page.tsx            list every trip regardless of status
    trips/new/page.tsx        create (always starts as draft)
    trips/[id]/page.tsx        edit core fields, itinerary, inclusions/
                                exclusions, departures, lifecycle transitions
  actions.ts                Server Actions — the one write surface
  _components/              shared, server-renderable form fields
```

`(protected)` is a route group specifically so `/admin/login` itself never
inherits the "redirect if unauthenticated" check — that check lives only in
`(protected)/layout.tsx`.

### Authentication

Supabase Auth email/password, via the existing browser
(`lib/supabase/client.ts`) and session-aware server
(`lib/supabase/server.ts`) clients — no new auth technology introduced.
There is no sign-up page, no password-reset flow, and no traveller-facing
account system: an admin account is the smallest possible slice of "Phase
4.5 authentication," provisioned out-of-band with
`scripts/grant-admin-role.ts` rather than through any UI.

### Authorization

Two independent layers, deliberately not just one:

1. **`lib/supabase/middleware.ts`** — redirects a signed-out visitor away
   from `/admin/*` to `/admin/login`. A UX convenience only: it proves a
   session exists, never which role it holds.
2. **`lib/admin/authorize.ts`'s `requireAdminRole`** — the actual boundary.
   Re-resolves the caller's role from `admin_roles` (via
   `lib/admin/auth.ts`) on every admin Server Component render and every
   Server Action, independently each time. See docs/SECURITY.md §4 and
   docs/RBAC.md's "Content administration" section for the full role model.

### Data access

`lib/admin/repository.ts` is the admin equivalent of
`lib/content/queries.ts` — the one place admin code talks to Supabase — but
intentionally NOT the same module: public reads and privileged writes stay
in separate files with different trust boundaries, per this phase's own
"public/admin boundary" instruction.

- **Reads** use `lib/supabase/server.ts`'s session-aware client, relying on
  the Phase 4.3 "admins can read every ..." RLS policies (docs/DATABASE.md
  §14) — least privilege: a read RLS can authorize correctly doesn't need
  the service-role client.
- **Writes** use `lib/supabase/admin.ts`'s service-role client, always
  after `requireAdminRole` has already run in the calling Server Action
  (`app/admin/actions.ts`). No authenticated `insert`/`update`/`delete`
  policy exists on any content table — this is the only write path.

`lib/admin/transitions.ts` is the pure, DB-free lifecycle-transition table
both the UI (which buttons to show) and `transitionTripStatus` (the actual
gate, re-checked server-side) read from.

### Local development workflow

Everything above was built and verified against the Phase 4.2A local
Docker/Supabase stack — see `supabase/migrations/README.md`'s "Local
development database" section for the commands. To actually sign in and
exercise the admin UI locally:

```bash
npm run db:start                                             # if not already running
npx tsx scripts/grant-admin-role.ts you@example.test admin    # provisions an admin account
npm run dev                                                    # then sign in at /admin/login
```

### What remains before production admin activation

No deployed environment has a migrated database yet (Phase 4.2A's own
limitation, unchanged by this phase) — `/admin` cannot do anything real
until one does. Beyond that: no UI exists for granting/revoking roles (only
the script), no audit/history of who made a given change beyond
`updated_at`/`published_at` (evaluated and deliberately deferred — see the
Phase 4.3 report), and no admin UI for media, accommodation, transport,
meeting points, important notes, extras, FAQs, policy sections, or
hosts/guides management (schema and RLS reads would support them; no
authoring UI was built this phase).

## 16. Booking & order domain (Phase 4.4)

The transaction architecture underneath a future checkout — not checkout
itself. No booking-creation UI, no payment gateway, no webhook handler, no
`lib/booking/repository.ts` write layer exists yet; everything here is the
durable data model and the database-side guarantees a future booking flow
will write against.

### What's separated, and why

```text
trips / trip_departures   -- WHAT the trip is, WHEN it departs (Phase 4.1)
        |
        v
bookings                  -- a traveller's reservation against ONE departure,
        |                     with a fixed commercial snapshot (see below) —
        |                     never a live join back to current trip content
        +-- booking_participants   -- who is actually travelling
        +-- payments               -- money moved against the booking,
                                       independent status, never assumed to
                                       auto-confirm the booking
```

Content, commercial inventory, booking, payment and traveller identity stay
five separate concerns on purpose (this phase's own brief) — see
docs/DATABASE.md §4 for the full field-level design and the reconciliation
against that document's original, richer sketch.

### Content immutability boundary

A booking's `snapshot_*` fields are written once, at booking time, and
never re-derived from `trips`/`trip_departures` for historical display — a
later edit to the trip's title, price, itinerary or host cannot silently
rewrite what a traveller already bought. Verified by an integration test
that edits a trip's title after booking and confirms the booking's
snapshot is unaffected (`tests/integration/booking-domain.test.ts`).

### Concurrency-safe seat reservation

`trip_departures.capacity`/`seats_reserved`/`seats_confirmed` already
existed (Phase 4.1); this phase adds three SQL functions
(`bookings_reserve_seats`, `bookings_confirm_seats`,
`bookings_release_seats`) and three `bookings` triggers (`before
insert`/`before update`/`before delete`) that keep them in lock-step with
a booking's own lifecycle, entirely inside the database — no
read-capacity-then-write-booking race exists in application code, because
there is no application code in the reservation path at all yet. See
docs/DATABASE.md §4's "Concurrency" note for exactly how the single atomic
`UPDATE` makes two simultaneous requests for the last seat serialize
correctly; verified by an integration test that fires five concurrent
booking attempts at a two-seat departure and confirms exactly two succeed.

### Authentication assumption

`bookings.traveller_id` references `auth.users`, nullable — no traveller-
authentication UI exists yet (Phase 4.5+). Until it does, a booking
identifies who made it via `contact_name`/`contact_email`/`contact_phone`
directly on the row (a "guest checkout" shape, not a parallel account
system). Once real traveller accounts exist, `traveller_id` starts getting
populated; the column is not renamed or restructured to make that
possible.

### RLS / privacy

`bookings`, `booking_participants` and `payments` have RLS enabled with
*zero* policies for `anon` or `authenticated` — not a gap, a deliberate
stance documented in docs/DATABASE.md §14: no identity architecture exists
yet to scope a "read your own bookings" policy against, and no admin
booking UI exists yet to justify an admin-read policy the way Phase 4.3
added one for trip content. Every access path is the service-role client,
after an application-layer check — the same `lib/admin/` pattern Phase 4.3
established.

### The intended content / departure / booking boundary

Three separate concerns, kept in three separate places, none merged into
one generic admin table:

- **Content administration** (`app/admin/`, `lib/admin/`, Phase 4.3) — a
  trip's own fields, itinerary, inclusions/exclusions, and its
  `content_status` lifecycle.
- **Departure management** (also Phase 4.3's `lib/admin/repository.ts` —
  `createDeparture`/`updateDeparture`) — a departure's date, price,
  capacity and its own `status`.
- **Booking operations** (not built yet) — would manage `bookings`,
  `booking_participants` and `payments` directly, reusing
  `lib/admin/authorize.ts`'s `requireAdminRole` pattern rather than
  reinventing authorization a third time, but living in its own module
  (`lib/booking/` today holds only the pure domain logic — status
  transitions, snapshot mapping, validation — a future
  `lib/booking/repository.ts` would sit alongside it, not inside
  `lib/admin/repository.ts`).

One known integration risk, deliberately not fixed this phase (fixing it
means touching Phase 4.3's already-built admin UI, out of scope here): the
Phase 4.3 departure edit form can still set `seats_reserved`/
`seats_confirmed` directly, and this phase's booking triggers also write
those same columns. Once real bookings exist, a manual admin edit there
can drift from the true reserved count. A future phase should make those
two columns admin-read-only (derived from real bookings) rather than
directly editable.

### What remains before this is a real booking system

No booking-creation Server Action or UI, no payment gateway integration,
no webhook handler (though the schema is idempotency-ready — see
docs/DATABASE.md §4's "Webhook idempotency"), no refund processing, no
booking-management admin UI, no traveller-facing booking history (blocked
on Phase 4.5's traveller-authentication system). None of this is stubbed
or half-built — the domain foundation is real and tested, the flows that
would write to it do not exist yet.

## 17. Live WWS catalogue capture (Phase 4.4A)

The live WWS website (<https://wander-with-stars.fripo.in>) is the primary
source of truth for trip data — full capture methodology, findings, and
fidelity rules: `docs/source-material/wws-live/README.md`.

Three real trips were discovered and ingested through the existing
pipeline, no new architecture introduced:

```text
docs/source-material/wws-live/catalogue/wws-live-catalogue.json   canonical
        |                                                          capture
        v
lib/content/ingest/sources/{thailand-full-moon-party,bali-new-year-special}.ts
        |  ingestDraftTripContent() — same path as the existing Vietnam source
        v
scripts/seed-live-catalogue.ts
        |  seeds trip content + real trip_departures rows (dates/prices),
        |  inserted directly against trip_departures — see that script's own
        |  header for why departures bypass the content-ingestion schema
        v
local Phase 4.1 database — every trip content_status: 'draft',
                            every departure status: 'draft'
```

All three trips (and the "Sample Community Trip — Georgia" fixture they
replace as the public sample — see `lib/content/fixtures.ts`'s own
comment) stay unpublished: this was automated content capture, not a human
editorial review/approval, so publishing is left to Phase 4.3's admin
workflow. `tests/unit/wws-live-catalogue-parity.test.ts` checks the
ingestion sources against the canonical capture; `tests/integration/wws-live-catalogue.test.ts`
verifies the seeded database rows and their RLS-enforced invisibility to
anonymous readers.

## 18. Traveller authentication & accounts (Phase 4.5)

Establishes traveller identity and account ownership on the existing
Supabase Auth architecture — sign up, sign in, sign out, password recovery,
a minimal protected account area. Deliberately NOT a full dashboard,
booking history, or checkout (docs/ROADMAP.md's later phases).

### Identity boundary

```
Supabase Auth (auth.users)       →  identity, credentials, session
        ↓ user_id (FK, unique)
public.traveller_profiles        →  application-level traveller data
```

`traveller_profiles` (`supabase/migrations/20260929133252_create_traveller_profiles.sql`)
holds exactly one field beyond identity/timestamps: `display_name`. No
email, no password, no verification state — `auth.users` (read via the
session, never duplicated) is the one identity authority, matching
docs/SECURITY.md §3's "application-level authorisation must be resolved
from trusted server/database data" and this phase's own explicit
"do not duplicate email verification state" instruction.

An admin identity (`admin_roles`) and a traveller identity
(`traveller_profiles`) are independent, non-exclusive facts about the same
`auth.users` row — an account can hold both, one, or neither. Neither table
references the other; `lib/admin/auth.ts`'s `getAdminSession` and
`lib/traveller/auth.ts`'s `getTravellerSession` each resolve their own
identity independently and never assume the other's absence or presence.

### Auth technology

Exactly the existing Supabase Auth architecture already wired up for admin
login (`lib/supabase/client.ts`, `lib/supabase/server.ts`,
`lib/supabase/middleware.ts`) — no second auth provider, no new session
mechanism. Every traveller-auth form (`components/account/*.tsx`) uses the
browser client directly, the same `signInWithPassword`/`signUp`/`signOut`
pattern `app/admin/_components/admin-login-form.tsx` already established.
Session cookies are managed entirely by `@supabase/ssr` — nothing here
touches `localStorage`.

Email confirmation: `supabase/config.toml`'s `[auth.email]
enable_confirmations = false` means this project's local (and, per that
same config, whatever environment it's deployed to) Supabase instance signs
a new account in immediately — no verification email, no "check your
inbox" interstitial to build. `components/account/signup-form.tsx` still
handles the case where `signUp()` returns no session (that flag flipped on
in a future environment) with an honest message, rather than assuming a
session it wasn't granted.

Password recovery: `resetPasswordForEmail` → `/reset-password` (a route
not listed in docs/ROUTES.md's original sketch, added as a necessary
sibling of `/forgot-password` — see that page's own comment) →
`auth.updateUser({ password })`. Required
`supabase/config.toml`'s `[auth] additional_redirect_urls` to include the
exact `/reset-password` URL for both `127.0.0.1` and `localhost` — GoTrue
silently falls back to the bare `site_url` for any `redirectTo` that isn't
an exact allow-list match, which is local-environment configuration, never
pushed to the real/shared Supabase project.

### Profile creation

Explicit, server-side, idempotent — not a database trigger.
`app/(account)/actions.ts`'s `createTravellerProfileAction` runs right
after a successful client-side `signUp()`, using the session-aware server
client (never service-role) so `traveller_profiles`'s own RLS is the write
boundary. `lib/traveller/profile.ts`'s `ensureTravellerProfile` upserts
with `onConflict: 'user_id', ignoreDuplicates: true`, so calling it more
than once for the same account — a retry, or the defensive call in
`app/dashboard/layout.tsx` for any account that reaches `/dashboard` with a
session but no profile row — never errors and never overwrites an existing
display name.

### Routes

```
/login              sign in
/signup             sign up
/forgot-password    request a password-reset email
/reset-password     land here from that email, set a new password
/dashboard           protected: minimal account landing
/dashboard/profile   protected: edit display name
```

`app/(account)/` (a route group, no marketing header/footer — CONTROL
world, not the cinematic public experience) holds the four public auth
pages. `app/dashboard/` (top-level, matching `app/admin/`'s own top-level
placement) holds the two protected pages, gated by
`app/dashboard/layout.tsx` — the traveller equivalent of
`app/admin/(protected)/layout.tsx`: a UX-convenience session check, not the
security boundary (RLS is). `lib/supabase/middleware.ts` redirects a
signed-out `/dashboard/*` visitor to `/login`, identically to its existing
`/admin/*` → `/admin/login` redirect — same "convenience, not boundary"
caveat, documented in that file's own comment.

Every other `docs/ROUTES.md`-sketched traveller route
(`/dashboard/trips`, `/bookings`, `/payments`, `/documents`, `/community`,
`/wishlist`, `/recommendations`, `/passport`, `/preferences`,
`/notifications`, `/support`) is deliberately NOT built — this phase
establishes identity and account ownership only.

No traveller-auth link was added to `components/layout/site-header.tsx`.
That file is a separately-tracked, uncommitted brand/logo workstream this
project's own working agreement holds untouched pending visual review
(CLAUDE.md's "Brand asset" section) — adding account navigation to it now
would mix an unrelated phase's edits into that pending change. A traveller
reaches `/login` directly today; wiring a compact signed-in control into
the header is deferred to whenever that workstream lands.

### Deferred (out of scope for this phase)

Bookings RLS: `bookings`/`booking_participants`/`payments` still have zero
`anon`/`authenticated` policies (Phase 4.4's own deliberate state,
docs/SECURITY.md §4) — this phase does NOT add a "read your own bookings"
policy, because no account page reads bookings yet. `bookings.traveller_id`
already references `auth.users(id)` and stays nullable (guest checkout);
`traveller_profiles.user_id` references the same table independently. A
future booking-history view (`/dashboard/trips`, `/dashboard/bookings`)
will need its own carefully-scoped RLS policy at that point, not before.

Also deferred: social login, OTP/magic-link auth, account deletion (touches
`auth.users`, bookings and payments together — a retention/data-policy
decision, not a safe implicit one), avatar/bio/city/phone profile fields,
public traveller profiles, and any admin-side view of traveller accounts.

## 19. Traveller booking & reservation flow (Phase 4.6)

The first real write path through Phase 4.4's booking domain — a
traveller can now actually create a `pending` booking against a real,
specific departure. No payment, no confirmation, no booking admin UI:
this closes the gap between "the schema and atomic seat-reservation
primitive exist" (Phase 4.4) and "something can actually call them
safely" (this phase).

### Departure identity

`/booking/[departureId]` is keyed by the exact `trip_departure_id` a
traveller selected on `/trips/[slug]` — `TripDeparturePanel`'s "Book this
departure" link (`components/trips/departure-panel.tsx`) points at
`selected.id`, never a trip slug or array position. The whole booking
wizard (`components/booking/booking-wizard.tsx`) is one client component
holding this id in its own closure across all four steps, so it cannot be
lost or re-derived incorrectly mid-flow. This id is a convenience for
routing/display only — `submitBookingAction` re-reads and re-validates the
same departure authoritatively a second time, from scratch, at the moment
of booking (see "Server-side pricing authority" below).

### Server-side mutation boundary

```
components/booking/booking-wizard.tsx (client)
        |  submitBookingAction(rawInput)
        v
app/booking/[departureId]/actions.ts   Zod-validates; derives travellerId
        |                              from the session, never the client
        v
lib/booking/repository.ts               createPendingBooking()
        |  service-role client (no anon/authenticated INSERT policy
        |  exists on bookings/booking_participants — Phase 4.4's own
        |  deliberate RLS stance, unchanged)
        v
create_pending_booking()  (Postgres function, one RPC call = one
        transaction: re-validates the departure, reads price/dates/title
        from trips/trip_departures itself, inserts the booking AND its
        participants, or raises and rolls back everything)
```

Reads (`fetchBookableDepartureSummary`, display-only context for the
booking page) use the existing session-aware client and the same public
RLS policies `/trips/[slug]` already relies on — no elevated privilege
needed for a read RLS already permits.

### Server-side pricing/availability authority

The client never submits `price_amount`/`price_currency`/departure dates
as trusted values — `bookingCreateInputSchema`
(`lib/booking/validation.ts`) has no such fields, and
`create_pending_booking`'s own SQL signature has no price parameter at
all. Every commercial fact in the booking's snapshot is read by the
function itself, from `trips`/`trip_departures`, at the moment of
insertion. The function also re-validates bookability itself
(`trip_departures.status in ('booking_open','almost_full')` and
`trips.content_status = 'published'`) rather than trusting that whatever
called it already checked — defense in depth against a race between an
earlier application-layer check and this insert.

### Seat reservation

Unchanged from Phase 4.4: `bookings_before_insert`'s call to
`bookings_reserve_seats` is what actually reserves seats, inside the same
statement as the booking row's own insert — a booking can never exist
without its capacity having actually been reserved. Phase 4.6 adds nothing
to that arithmetic; it only adds a real caller.

### Pending-booking expiry

`bookings.expires_at` (new) defaults to 30 minutes after creation for
every pending booking, set by `bookings_before_insert`. Each new booking
attempt first calls `release_expired_booking_holds()` (also new), which
cancels every pending booking whose hold has lapsed — reusing
`bookings_before_update_trigger`'s existing seat-release logic rather than
duplicating it, so a hold is released exactly the same way a normal
cancellation is. No scheduler exists yet; `release_expired_booking_holds()`
is deliberately a standalone, independently-callable function so a future
cron job or scheduled Edge Function can also call it directly without a
migration change. See `supabase/migrations/20260929170452_*.sql`'s own
header for the full reasoning, and docs/DATABASE.md §4's updated entry.

### Idempotency

One client-generated `idempotency_key` (a UUID from `crypto.randomUUID()`,
generated once when the booking wizard mounts and reused on every retry of
that same submission) per booking attempt. `bookings.idempotency_key` is
nullable and uniquely indexed where not null;
`create_pending_booking` checks for an existing booking with the same key
before doing anything else and returns it unchanged if found — a
double-click, a network retry, or a resubmitted form all become a no-op
replay rather than a second booking. Scope: one booking-review session
(until success or the traveller starts over); lifetime: as long as the
booking row itself exists (no separate expiry — reusing the same key after
a real booking already exists there is simply always a replay of that same
booking).

### Authenticated vs. guest

`bookings.traveller_id` is derived from `getTravellerSession()`
(`lib/traveller/auth.ts`, unchanged from Phase 4.5) server-side inside
`submitBookingAction` — never accepted as a field the client submits
(`bookingCreateInputSchema` has no `travellerId` key at all, so nothing
forged in the raw payload can reach it). No session → `null`, the
existing guest-booking shape Phase 4.4 already modelled. Both paths go
through the exact same `create_pending_booking` call; there is no second,
parallel booking system for either mode.

### RLS / privacy

One new, narrow policy: `auth.uid() = bookings.traveller_id` for `select`
— a signed-in traveller may read their own bookings (e.g. revisiting the
confirmation page after a refresh), never anyone else's, and never a guest
booking (traveller_id is null for those). No policy on
`booking_participants` or `payments` — nothing built this phase reads
either back. Guest confirmation is shown from the creation call's own
direct return value (`SafeBookingResult`), never a "reference alone grants
access" read path — exactly as this phase's own brief requires.

### What is deliberately NOT built

Payment (gateway, webhooks, confirmation), booking admin/management UI,
email/WhatsApp/SMS notifications, a traveller booking-history view
(`/dashboard/bookings`), account deletion, and any change to
`bookings`/`booking_participants`/`payments` RLS beyond the one traveller
select policy above. All remain explicitly future work.

## 20. Payment integration & booking confirmation (Phase 4.7)

Connects Phase 4.6's pending-booking system to Razorpay (the explicitly
selected provider for this phase). Payment success is NEVER inferred from
the browser: the webhook is the authoritative confirmation path, and the
checkout-return "fast path" independently re-verifies with Razorpay's own
API before trusting anything — both converge on one idempotent database
function, so whichever resolves first is authoritative.

### Architecture

```
components/booking/payment-step.tsx (client)
        |  createPaymentOrderAction({ bookingId })
        v
app/booking/[departureId]/payment-actions.ts
        v
lib/payments/repository.ts   createPaymentOrder()
        |  reads booking.participant_count x snapshot_price_amount --
        |  the ONLY place an order amount is decided, never a client value
        v
lib/payments/razorpay.ts     createRazorpayOrder()  (plain fetch, Basic Auth)
        v
Razorpay Orders API  ->  order.id
        v
payments row inserted: provider='razorpay', provider_reference=order.id,
                        status='pending', amount/currency from the booking

---- traveller completes Razorpay Checkout (a modal, not a redirect) ----

TWO independent paths can report success, converging on the same function:

  A. Checkout's own handler callback (client)
        -> verifyPaymentAction -> lib/payments/repository.ts's
           verifyAndRecordPayment(): verifies Checkout's own HMAC
           signature, then independently re-fetches the payment from
           Razorpay's Payments API (never trusts the callback alone)
        -> record_payment_result()

  B. app/api/webhooks/razorpay/route.ts (server, no browser involved)
        -> verifies the webhook's OWN HMAC signature
           (lib/payments/webhook.ts, a DIFFERENT secret/scheme than A's
           Checkout signature)
        -> record_payment_result()

record_payment_result() (supabase/migrations/20260929182853_*.sql):
  - locks the payment row by (provider, provider_order_id)
  - already resolved (not pending)? -> no-op, return as-is (handles
    duplicate webhooks, retries, and out-of-order events uniformly)
  - reported amount/currency != what THIS ROW recorded at creation? ->
    reject, change nothing (the row's own amount is itself derived from
    the booking snapshot, never re-read from "current" pricing)
  - else: update payment status, and ONLY IF the booking is still
    pending, transition it to confirmed (reusing Phase 4.4's existing
    bookings_before_update trigger, which already confirms seats and
    clears expires_at -- no new seat-accounting logic needed)
```

### Provider status mapping

`lib/payments/status.ts` is the ONE place a Razorpay-specific status
string (`created`/`authorized`/`captured`/`failed`/`refunded`) is ever
read -- translated immediately to this project's own
`pending | succeeded | failed | refunded` (`lib/booking/schema.ts`,
unchanged since Phase 4.4). No other module in this codebase ever compares
against a raw Razorpay string.

### Amount/currency authority

The server derives the payable amount from `participant_count x
snapshot_price_amount` -- fields fixed at booking-creation time (Phase
4.6), immune to a later trip/price edit. `lib/payments/amount.ts`'s
`toProviderSubunits`/`fromProviderSubunits` is the one, pure, two-way
conversion between that decimal rupee amount and Razorpay's required
integer-paise representation -- no currency conversion or exchange-rate
logic exists anywhere (every booking today is INR; out of scope
regardless).

### Idempotency

Two independent mechanisms, at two different layers:

- **Order creation** (`createPaymentOrder`): reuses an existing still-
  pending payment row for the same booking rather than creating a second
  Razorpay order on every retry/double-click/re-render. A genuine
  concurrent race (two simultaneous requests) is resolved by re-querying
  after a unique-index conflict rather than erroring.
- **Payment confirmation** (`record_payment_result`): the "already resolved
  -> no-op" guard described above. A duplicate webhook delivery, a retried
  delivery, and an out-of-order stale failed event arriving after a
  genuine succeeded one are all the same case -- nothing left to do,
  nothing ever double-applies, and a success is never downgraded.

Deliberately NOT a general-purpose event-processing framework: no separate
webhook-events ledger table, no distributed lock -- `payments`' own two
partial-unique indexes (`(provider, provider_reference)`,
`(provider, provider_payment_id)`, the second new this phase) are the
entire uniqueness mechanism.

### Pending-booking expiry interaction

Phase 4.6's `expires_at`/`release_expired_booking_holds()` is unchanged.
Documented, deliberate behaviour for the cases this phase's brief asks
about explicitly:

- **Booking expires while payment is still pending**: the next booking
  attempt's `release_expired_booking_holds()` call (Phase 4.6) cancels it
  and releases its seats, exactly as before -- nothing payment-specific
  changes that.
- **Payment succeeds AFTER the booking already expired/was cancelled**:
  `record_payment_result` still records the payment as succeeded (the
  money genuinely moved -- a true historical fact this table must not
  hide) but does NOT reconfirm the booking, because its seats may already
  have been released and possibly re-sold -- silently reconfirming would
  risk overselling the departure. This is a real edge case this phase
  resolves by leaving it for manual/support reconciliation, NOT an
  automated refund (inventing a refund policy is explicitly out of scope).
- **A payment attempt fails before expiry**: the booking stays pending,
  untouched, free to retry (a fresh order, a fresh payment row) until its
  own hold genuinely expires.

### Local sandbox testing

No real Razorpay sandbox account/credentials exist in this project's
development environment. What this means concretely:

- `lib/payments/razorpay.ts`'s actual HTTP calls to Razorpay's Orders/
  Payments REST API are **not exercised** by any automated test in this
  repository -- every test that touches `createPaymentOrder`/
  `verifyAndRecordPayment` mocks that module
  (`tests/unit/payment-repository.test.ts`). This is an honest, explicit
  limitation, not something this phase claims to have verified end-to-end
  against a live sandbox.
- The webhook route IS fully, genuinely tested: `tests/e2e-db/webhook.spec.ts`
  computes its own HMAC-SHA256 signature (the exact scheme Razorpay uses)
  against a fixed test secret the dev server is started with, and POSTs
  directly to `/api/webhooks/razorpay` -- this is Razorpay's own documented
  approach to testing a webhook handler offline, requiring no tunnel, no
  CLI, and no live account.
- `record_payment_result()` -- the actual trusted confirmation logic this
  phase's "critical principle" is about -- IS fully tested for real,
  against the real local database (`tests/integration/payment-flow.test.ts`),
  independent of whichever HTTP path (webhook or checkout-return) would
  have called it in production.
- **For genuine end-to-end verification against a real Razorpay sandbox**:
  create a free Razorpay account, switch to Test Mode, copy the Test Key
  ID/Secret into `.env.local` (see `.env.example`), create a webhook
  (Dashboard -> Settings -> Webhooks) pointed at a locally-tunnelled URL
  (e.g. `ngrok http 3000`, then `<ngrok-url>/api/webhooks/razorpay`) with
  its own secret, and use Razorpay's documented test card numbers to
  complete a real sandbox checkout. This is the standard Razorpay-
  recommended local workflow (they do not offer a dedicated CLI/tunnel
  product the way some other gateways do) -- not performed as part of this
  phase, and not claimed to be.

### Security / secrets

`RAZORPAY_KEY_SECRET`/`RAZORPAY_WEBHOOK_SECRET` are server-only
(`lib/payments/env.ts`, lazily validated -- see that file's own header for
why it is deliberately NOT part of `lib/env/server.ts`'s eager, every-
render validation). `RAZORPAY_KEY_ID` reaches the browser only via a
server-computed Server Action response (`createPaymentOrderAction`), never
a `NEXT_PUBLIC_*` environment variable -- the client never has standing
access to it outside of an active checkout session. No card number, CVV,
UPI credential, or payment token is ever received or stored by this
project -- Razorpay Checkout collects all of that directly, on Razorpay's
own hosted surface.

### Refunds -- explicitly deferred

No automated refund logic exists. `payments.status`'s `refunded` value is
preserved as a future-compatible state (`lib/payments/status.ts` already
maps Razorpay's own `refunded` payment status to it) but nothing in this
phase ever writes it, and no WWS refund policy (eligibility, timing,
partial vs. full) is invented here. A booking whose payment later needs
refunding remains a manual operation until a real refund milestone defines
that policy deliberately.

### What is deliberately NOT built

Invoices, coupons, instalments, subscriptions, any finance/admin
dashboard, a booking-admin surface, a traveller payment-history view,
notifications (email/WhatsApp/SMS) of any kind. All remain explicit future
work.

## 21. Traveller dashboard & My Trips (Phase 4.8)

Turns `/dashboard` from Phase 4.5's minimal account landing into a real
"My Trips" surface, reading the booking/payment domain Phases 4.4–4.7
already built — no new booking write path, no new payment logic. Entirely
read-only.

### Architecture

```
app/dashboard/page.tsx                    "My Trips" — greeting, hero
  |                                       upcoming trip, Upcoming/Past/
  |                                       Cancelled lists, empty state
  v
lib/dashboard/repository.ts               session-aware reads ONLY
  |  fetchTravellerBookingGroups()        (lib/supabase/server.ts — never
  |  fetchTravellerBookingDetail()        lib/supabase/admin.ts)
  v
lib/dashboard/grouping.ts                 pure, unit-tested:
  |  classifyBooking() / groupBookings()  upcoming/past/cancelled
  |  pickAuthoritativePayment()           classification + the single
  v                                       "authoritative payment" rule
Supabase (RLS: auth.uid() = bookings.traveller_id,
          extended this phase to booking_participants/payments
          via a join back to their parent booking)

app/dashboard/bookings/[bookingId]/page.tsx
  -> fetchTravellerBookingDetail(bookingId, session.userId)
  -> independently re-checks row.traveller_id === session.userId,
     on top of the RLS policy that already scoped the query
```

### Ownership model

Every read goes through `lib/supabase/server.ts`'s session-aware client,
never the service role — this phase's own explicit "ordinary traveller
dashboard reads never use the service role" rule. RLS
(`auth.uid() = bookings.traveller_id`) is the actual database-level
boundary; `fetchTravellerBookingDetail` additionally re-checks the
returned row's `traveller_id` against the caller's own session id before
returning anything — belt and suspenders, satisfying the brief's own
"every booking detail read must independently verify ownership, do not
trust the booking ID supplied by the browser" requirement literally, not
just by relying on RLS alone. A booking that doesn't exist, isn't this
traveller's, or is a guest booking (`traveller_id is null`, which can
never equal a real `auth.uid()`) are all the same indistinguishable 404 —
never a response that would confirm to an attacker that a given booking
ID exists at all.

### RLS extension (the one migration this phase adds)

`booking_participants` and `payments` have had RLS enabled with ZERO
policies since Phase 4.4 — nothing read either table back until now.
`20260930090000_create_traveller_dashboard_reads.sql` adds exactly one
SELECT policy to each, both shaped identically: a row is visible only
when its PARENT booking's `traveller_id` is the current `auth.uid()`.
PostgREST's nested embedding (`bookings.select('*, booking_participants(*),
payments(*))')`, used by both repository functions) requires SELECT
permission on the embedded table itself, not just the parent — without
this, an embedded read would have silently returned an empty array rather
than erroring, which would have looked like "no participants" rather than
"not allowed to see this." No INSERT/UPDATE/DELETE policy is added on
either table — this phase is read-only for booking data, and every
existing write path (`create_pending_booking`, `record_payment_result`)
already goes through the service-role client, unaffected by these
SELECT-only grants.

### Grouping & the authoritative payment record

`lib/dashboard/grouping.ts` is pure, dependency-free TypeScript, unit
tested directly with no database or mock involved. `classifyBooking`:
`cancelled` always wins regardless of date; `completed` is always `past`;
everything else is classified purely by date (today counts as upcoming).
`pickAuthoritativePayment` is this phase's answer to "payment status must
come from the authoritative payment record, never inferred from booking
state, checkout state, or cached UI state": given a booking's full payment
history (possibly several rows, after retries), a `succeeded` row always
wins — once one exists, `createPaymentOrder` (Phase 4.7) refuses to create
a further order against a non-pending booking, so nothing can legitimately
follow it — otherwise the most recently created attempt reflects the
booking's true current state (still pending, or its most recent failure).

### Historical accuracy

Every value the dashboard and booking-detail page show (trip title,
destination, dates, price, currency) comes from `bookings`'s own
commercial snapshot fields, fixed at booking time since Phase 4.4/4.6 —
never re-read from `trips`/`trip_departures`. The "current trip page" link
(`snapshot_trip_slug` → `/trips/[slug]`) is a deliberate, clearly separate
link to live content, not a re-fetch of the booking's own historical
facts. Verified by an integration test that edits a trip's title after
booking and confirms the traveller's own dashboard read is unaffected.

### What is deliberately NOT built

Cancellation UI, refunds, invoices, notifications, admin booking
controls, payment mutation UI, guest-booking claiming (by reference,
email, or booking UUID — explicitly forbidden by this phase's brief),
community, personalisation, passport, AI travel assistant, and the full
traveller payment-history dashboard Phase 4.7 already deferred. All remain
explicit future work.
