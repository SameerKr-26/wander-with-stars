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

### Future Supabase integration seam

`lib/content/queries.ts`'s functions already return `Promise<ContentState<T>>`
and are called only from `lib/content/queries.ts`, never
`lib/content/fixtures.ts` directly (see that file's own header comment) —
exactly the seam a future Supabase-backed implementation needs: each
function's *body* becomes a query against `lib/supabase/server.ts`, its
signature does not change, and no UI component notices the difference.
The ingestion pipeline in this section feeds that same seam from the other
side — `ContentRecord<TripDetail>` at `status: 'published'` is what a
future `trips`/`trip_departures` row (docs/DATABASE.md §3) represents once
Supabase tables exist. Not built in this phase: the tables themselves, a
CMS, an admin upload panel, or booking/payments.

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
