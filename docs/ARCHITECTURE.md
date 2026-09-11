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
