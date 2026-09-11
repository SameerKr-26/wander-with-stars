# Wander With Stars V2 — Route Map

## Public routes

```text
/
/trips
/trips/[slug]
/explore
/community
/stories
/hosts
/about
/faq
/contact
/login
/signup
/forgot-password
/privacy
/terms
/refund-policy
```

## Traveller routes

```text
/dashboard
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
/dashboard/profile
/dashboard/preferences
/dashboard/notifications
/dashboard/support
```

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
