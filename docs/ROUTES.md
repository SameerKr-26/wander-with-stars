# Wander With Stars V2 — Route Map

## Public routes

```text
/
/trips
/trips/[slug]
/booking/[departureId]  implemented, Phase 4.6 — not in the original sketch
                        above; keyed by trip_departure_id, not a trip slug
                        (see docs/ARCHITECTURE.md §19 for why)
/explore
/community
/stories
/hosts
/about
/faq
/contact
/login              implemented, Phase 4.5
/signup             implemented, Phase 4.5
/forgot-password    implemented, Phase 4.5
/reset-password     implemented, Phase 4.5 — not in the original sketch above;
                     a necessary landing page for the password-recovery email
                     link (see docs/ARCHITECTURE.md §18)
/privacy
/terms
/refund-policy
```

## Traveller routes

```text
/dashboard           implemented, Phase 4.5 — minimal account landing only
/dashboard/trips
/dashboard/trips/[id]
/dashboard/bookings
/dashboard/bookings/[id]
/dashboard/payments
/dashboard/documents
/dashboard/community
/dashboard/wishlist
/dashboard/recommendations
/dashboard/passport
/dashboard/profile   implemented, Phase 4.5 — display name only
/dashboard/preferences
/dashboard/notifications
/dashboard/support
```

Only `/dashboard` and `/dashboard/profile` exist. Every other route in this
list remains a future-phase sketch — Phase 4.5's own brief is identity and
account ownership, explicitly not the full dashboard. See
docs/ARCHITECTURE.md §18 for what each deferred route would need before it
could be built (most read bookings, which have no RLS read policy yet).

## Admin routes

```text
/admin
/admin/trips
/admin/trips/new
/admin/trips/[id]
/admin/departures
/admin/inventory
/admin/bookings
/admin/bookings/[id]
/admin/customers
/admin/payments
/admin/refunds
/admin/leads
/admin/community
/admin/reviews
/admin/creators
/admin/content
/admin/analytics
/admin/team
/admin/settings
/admin/audit-logs
```

## Creator routes — later phase

```text
/creator
/creator/profile
/creator/opportunities
/creator/applications
/creator/hosted-trips
/creator/deliverables
/creator/content
/creator/performance
/creator/earnings
/creator/messages
```

## URL principles

- Public trip pages use human-readable slugs.
- Internal UUIDs remain implementation identifiers.
- Avoid exposing sensitive IDs where not needed.
- Keep URLs stable for SEO.

## Navigation principles

Public navigation:
- Explore Trips
- Community
- Stories
- About
- Login
- Find My Trip

Authenticated navigation should prioritise:
- Current trip
- Community
- Tasks needing attention
- Profile

Admin navigation should prioritise:
- operational exceptions
- bookings
- payments
- active trips
- customers
