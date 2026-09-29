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

## 7. Webhooks

Validate signature/authentication, reject invalid payloads, log safely, and make processing idempotent.

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
