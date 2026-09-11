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
