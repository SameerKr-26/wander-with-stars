# Wander With Stars V2 — Security

## 1. Security goals

Protect:
- Traveller accounts
- Payment data
- Private documents
- Community interactions
- Internal operations
- Admin capabilities
- API credentials
- Business analytics

## 2. Core rules

1. Never expose Supabase service-role credentials to the browser.
2. Never commit secrets.
3. Use environment variables and secret management.
4. Enable and review RLS on protected tables.
5. Enforce authorization server-side and at the database layer.
6. Validate all external input.
7. Use least privilege.
8. Verify payment webhooks cryptographically according to provider guidance.
9. Make financial state transitions idempotent.
10. Use audit logs for privileged operations.
11. Never trust client-side prices, roles, availability, or booking states.
12. Keep private documents in protected storage buckets.
13. Avoid exposing unnecessary personal information.
14. Add rate limiting to abuse-prone endpoints.
15. Do not use unsafe shortcuts simply to unblock frontend development.

## 3. Authentication

Supabase Auth can support email/password, OTP/magic links, and social login as product requirements evolve.

After authentication, application-level authorisation must be resolved from trusted server/database data.

## 4. Authorisation

Use RBAC plus domain ownership/membership checks.

Examples:
- Traveller can access own booking.
- Traveller can access a private community only when membership exists.
- Trip manager can access assigned trips.
- Finance manager can access payments/refunds without gaining unrelated community moderation privileges.
- Super admin has elevated system access.

**Implemented (Phase 4.3)** — the content-administration area (`/admin/*`):
`lib/admin/authorize.ts`'s `requireAdminRole` resolves the caller's role
fresh from the database (`admin_roles`, via `lib/admin/auth.ts`) on every
Server Component render and every Server Action, and is the actual
authorization boundary — never the `/admin` middleware redirect
(`lib/supabase/middleware.ts`), which only proves a session exists, not
which role it holds, and is documented in its own comment as a UX
convenience, not a security boundary. No anonymous write endpoint exists:
every privileged write requires an authenticated session with a qualifying
`admin_roles` row, checked server-side, before `lib/supabase/admin.ts`'s
service-role client is ever reached. See docs/RBAC.md's "Content
administration" section for the full role/transition model.

**Implemented (Phase 4.4)** — the booking domain (`bookings`,
`booking_participants`, `payments`): RLS is enabled with zero policies for
`anon` or `authenticated` on all three tables, deliberately — no
traveller-identity architecture exists yet to scope a real "read your own
bookings" policy against, and writing one now would be untestable,
premature RLS (docs/DATABASE.md §14 explains the reasoning in full). Every
access path today is the service-role client, after an application-layer
authorization check, reusing Phase 4.3's `lib/admin/` pattern rather than
introducing a second one. Booking creation and status transitions are
enforced at the database layer (triggers — see docs/DATABASE.md §4) precisely
*because* no application write-layer exists yet to enforce them instead;
that enforcement does not move to JavaScript once one does, it gains a
second, redundant check the same way `lib/admin/transitions.ts` already
duplicates its own SQL trigger's rules.

**Implemented (Phase 4.5)** — traveller authentication: the
traveller-identity architecture the Phase 4.4 note above was waiting on now
exists (`traveller_profiles`, `lib/traveller/`), but the booking RLS gap it
described is still deliberately open. `bookings`/`booking_participants`/
`payments` still have zero `anon`/`authenticated` policies — this phase
does not add a "read your own bookings" policy, because no account page
reads bookings yet (docs/ARCHITECTURE.md §18's "Deferred" section). Adding
one now, untested against a real read path, would be exactly the kind of
speculative RLS this document already warns against. `traveller_profiles`
itself DOES get real, tested ownership RLS (own-row select/insert/update,
`user_id = auth.uid()`, never `USING (true)`) — see docs/DATABASE.md §2's
own entry for the full policy set, and
`tests/integration/traveller-auth.test.ts` for the cross-user-rejection and
enumeration-rejection tests that verify it. Every traveller-auth form uses
the browser/server session-aware clients only
(`lib/supabase/client.ts`/`server.ts`) — no service-role client appears
anywhere in `lib/traveller/` or `app/(account)/`, `app/dashboard/`.

**Implemented (Phase 4.6)** — the traveller booking & reservation flow: the
account page the Phase 4.5 note above was waiting on now exists
(`/booking/[departureId]`), so exactly the read policy that note deferred
is added — `auth.uid() = bookings.traveller_id`, `select` only, nothing
broader. Booking CREATION still never touches RLS at all: `bookings`/
`booking_participants` still have zero `anon`/`authenticated` INSERT
policy, so every booking write goes through `lib/booking/repository.ts`'s
service-role client, calling the one new Postgres function,
`create_pending_booking()` — exactly Phase 4.4's own prescribed pattern,
now with a real caller. That function is also where server-side pricing
authority actually lives: it reads `trip_departures.price_amount`/
`price_currency` and every other commercial fact itself, at the moment of
insertion — the client never submits a price, and
`bookingCreateInputSchema` (`lib/booking/validation.ts`) has no price
field for it to submit even if it tried. `traveller_id` is derived from
`getTravellerSession()` server-side inside the one Server Action that
calls this (`app/booking/[departureId]/actions.ts`) — never accepted as a
client-submitted field (the input schema has no `travellerId` key at
all). Guest confirmation is shown from that Server Action's own direct
return value, never a subsequent read by reference — see
docs/DATABASE.md §14's Phase 4.6 entry and docs/ARCHITECTURE.md §19 for
the full reasoning, and `tests/integration/booking-flow.test.ts` for the
tests verifying cross-user booking-read rejection, anonymous
booking-read rejection, and participant-privacy rejection.

Duplicate-submission safety: a client-generated `idempotency_key`, one per
booking-review session, lets `create_pending_booking()` recognise and
safely replay (not duplicate) a retried submission — see
docs/DATABASE.md §4's Phase 4.6 entry for the full mechanism.

**Implemented (Phase 4.7)** — payment integration (Razorpay): `payments`
still has zero `anon`/`authenticated` RLS policies — every write goes
through the service-role client (`lib/payments/repository.ts`, the webhook
route), after this phase's own trust boundary, never RLS. Razorpay's
secret key and webhook secret (`RAZORPAY_KEY_SECRET`,
`RAZORPAY_WEBHOOK_SECRET`) are read only by `lib/payments/env.ts`
(`import 'server-only'`, lazily validated so the rest of the app/test suite
never requires them to run) and never serialised into any Server Action
response or client bundle — the browser receives only a Razorpay order ID
and the public `RAZORPAY_KEY_ID`, the minimum Razorpay Checkout itself
requires to open. No card number, CVV, UPI credential or payment token is
ever received, transmitted, or stored by this codebase; Razorpay Checkout
collects all of that directly on Razorpay's own hosted surface. The
browser's own "payment succeeded" signal (Checkout's `handler` callback,
any query parameter, any client-side state) is never trusted on its own —
`verifyAndRecordPayment()` (`lib/payments/repository.ts`) independently
re-verifies the Checkout success signature AND re-fetches the payment from
Razorpay's own API before recording anything, and the webhook
(`app/api/webhooks/razorpay/route.ts`) is the fully independent,
server-to-server confirmation path that does not depend on the browser
having stayed open at all. See docs/ARCHITECTURE.md §20 for the full flow
and docs/DATABASE.md §4's Phase 4.7 entry for `record_payment_result()`'s
idempotency/amount-verification guarantees, and
`tests/integration/payment-flow.test.ts` /
`tests/e2e-db/webhook.spec.ts` for the tests verifying them.

**Implemented (Phase 4.8)** — traveller dashboard & My Trips: the first
feature to read `booking_participants` and `payments` back at all, and it
does so through the ordinary session-aware client
(`lib/supabase/server.ts`) under RLS, never the service role — satisfying
this phase's own explicit "ordinary traveller dashboard reads never use
the service role" rule. Two new SELECT policies
(`20260930090000_create_traveller_dashboard_reads.sql`, docs/DATABASE.md
§4's Phase 4.8 entry has the exact SQL) extend `bookings`'s own Phase 4.6
ownership rule one join deep: a `booking_participants`/`payments` row is
visible only when its parent booking's `traveller_id` matches
`auth.uid()`. `lib/dashboard/repository.ts` additionally re-checks the
returned row's `traveller_id` against the caller's own session id before
returning anything to the page — the brief's own "every booking detail
read must independently verify ownership, do not trust the booking ID
supplied by the browser" requirement, satisfied as defense-in-depth on
top of RLS, not instead of it. A booking that doesn't exist, belongs to
another traveller, or is a guest booking (`traveller_id is null`, which
can never equal a real `auth.uid()`) are all the same indistinguishable
404. Verified by `tests/integration/traveller-dashboard.test.ts` (direct
cross-user and guest-booking RLS checks, using a real signed-in client,
not the service role) and `tests/e2e-db/dashboard.spec.ts` (a traveller
attempting another's booking detail URL directly). No INSERT/UPDATE/
DELETE policy was added on either table — this phase remains read-only.

**Implemented (Phase 4.8A)** — global account access & profile
onboarding: the public site header's account control
(`components/layout/account-menu.tsx`) is driven by a session resolved
SERVER-SIDE (`app/(marketing)/layout.tsx`'s `getTravellerSession()` call)
and passed down as a prop — never a client-side session fetch, so there
is no flash of the wrong (logged-out) state and no client code that could
be tricked into trusting a forged "logged in" value. The "Log out" action
itself mirrors `components/account/sign-out-button.tsx`'s own
`supabase.auth.signOut()` call exactly — no new sign-out mechanism.

`traveller_profiles`'s five new onboarding columns (`phone`, `city`,
`travel_style`, `travel_interests`, `dietary_preference`,
docs/DATABASE.md's own Phase 4.8A entry) needed NO RLS change — the
existing own-row select/insert/update policies (Phase 4.5) already cover
every column on the table, these included, since RLS in PostgreSQL is
row-level, not column-level. Every write goes through
`lib/traveller/profile.ts`'s `upsertOwnProfile`/`ensureTravellerProfile`,
both using the session-aware client only, both re-validating with the
same Zod schema (`lib/traveller/validation.ts`) the client form does.
Three fields (`travel_style`, `travel_interests`, `dietary_preference`)
are controlled vocabularies enforced TWICE — the Zod schema rejects an
arbitrary string before it ever reaches the database, and a SQL CHECK
constraint is the independent backstop if that application-layer check
were ever bypassed or had a bug — this phase's own "do not silently
accept arbitrary invalid enum values from the browser" rule, satisfied at
both layers rather than trusting either alone. Deliberately never
collected: Aadhaar, passport number, PAN, card details, bank information,
emergency contacts — see docs/ARCHITECTURE.md §22 for the brief's own
explicit instruction. Verified by
`tests/integration/traveller-profile-onboarding.test.ts` (cross-user
read/update rejection, controlled-vocabulary rejection, idempotent
upsert behaviour, all against the real database) and
`tests/e2e-db/account-access.spec.ts`.

## 5. RLS

For every protected table answer:

- Who can select?
- Who can insert?
- Who can update?
- Who can delete?
- What rows are visible?

Do not create `using (true)` or equivalent permissive policies for private data simply because the feature is still under development.

## 6. Payments

The browser can request a payment but cannot decide whether a booking is paid.

Expected sequence:

```text
Client
 -> server booking validation
 -> server price calculation
 -> payment provider
 -> provider webhook
 -> server verification
 -> database transaction/state update
```

Use idempotency keys to tolerate retries.

**Implemented (Phase 4.7, Razorpay):** this sequence is real. The order
amount is computed server-side from the booking's own commercial snapshot
(`participant_count x snapshot_price_amount` — fixed at booking creation,
Phase 4.6), never accepted from the browser; `createPaymentOrderAction`
has no amount field in its input schema for a client to submit one even if
it tried. A reported amount/currency mismatch at confirmation time is
rejected by `record_payment_result()` without confirming the booking.
Idempotency uses two mechanisms, not a single ad-hoc key: order creation
reuses an existing pending payment row for the same booking rather than
creating a duplicate Razorpay order, and confirmation uses an
"already-resolved -> no-op" status guard (see docs/DATABASE.md §4) rather
than a client-supplied idempotency key, since both the webhook and the
checkout-return path need the same guarantee and neither originates from
the browser alone.

## 7. Webhooks

Validate signature/authentication, reject invalid payloads, log safely, and make processing idempotent.

**Implemented (Phase 4.7, Razorpay):** `app/api/webhooks/razorpay/route.ts`
reads the raw request body first (required for HMAC verification — a
parsed-then-restringified body would not reproduce Razorpay's original
bytes), verifies it against `RAZORPAY_WEBHOOK_SECRET` using
`crypto.timingSafeEqual` (never a plain `===` string comparison, to avoid
timing-attack signature leakage, and only after confirming equal buffer
length, which `timingSafeEqual` itself requires), and returns 400 for a
missing/invalid signature or a malformed/schema-invalid payload before any
database access. A payload that is well-formed but refers to an unknown
payment, or whose status the project doesn't need to act on, still returns
200 — Razorpay retries non-2xx responses, and an event this endpoint
genuinely cannot or need not act on should not trigger endless retries.
Duplicate and out-of-order deliveries are handled by
`record_payment_result()`'s own idempotency guard (§6 above), not by the
webhook route tracking delivery IDs itself. No internal error detail is
ever returned in the response body. Local testing: no real Razorpay
sandbox account exists in this development environment; the signature
verification and route logic are tested directly
(`tests/e2e-db/webhook.spec.ts`, self-signed payloads against a fixed test
secret — Razorpay's own documented approach to testing a webhook handler
offline) — see docs/ARCHITECTURE.md §20's "Local sandbox testing" for the
full, honest account of what is and isn't verified against a live
sandbox.

## 8. File security

Private documents should not be public by default. Use signed URLs or authorised server-mediated access where appropriate.

## 9. Community safety

Required controls before open messaging:
- report
- block
- mute
- moderator controls
- community rules
- account suspension capability
- abuse logging

## 10. Privacy

Collect only information needed for the product or legal/operational requirements. Provide privacy controls for profile visibility and group discovery.

## 11. Input validation

Use a central validation layer for:
- booking payloads
- profile updates
- forms
- coupon codes
- admin actions
- webhook payloads
- public search/filter inputs

## 12. Rate limiting

Prioritise:
- login attempts
- password recovery
- contact/enquiry forms
- AI endpoints
- message creation
- community posting
- payment initiation
- webhook endpoints

## 13. Audit logs

Privileged actions should record:
- actor
- action
- resource type/id
- timestamp
- outcome
- useful metadata

Never store raw secrets or unnecessary sensitive payment data in logs.

## 14. Dependency hygiene

- Keep dependencies minimal
- Patch security issues
- Avoid unnecessary packages
- Review package permissions and maintenance
- Use lockfiles

## 15. Pre-production security checklist

- RLS reviewed
- RBAC tested
- Service-role secret confirmed server-only
- Storage policies reviewed
- Webhooks verified
- Rate limits enabled
- Input validation tested
- Admin routes protected
- Error messages don't expose internals
- Sensitive logs removed/redacted
- Production env separated from preview/dev
