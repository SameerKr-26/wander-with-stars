# Wander With Stars V2 — Modular Feature Architecture

## Purpose

WWS V2 is intentionally being built as a modular monolith so that internal features can be added during development and removed, hidden, or simplified before public launch without making the final product structurally messy.

## 1. Core principle

The public customer experience must never depend structurally on internal roles or optional enterprise features.

Treat these as modules:
- Authentication/account
- Traveller dashboard
- Booking/payments
- Community
- Creator portal
- Admin/operations
- Finance
- CRM
- AI
- Analytics

Core public product:
- Brand
- Explore
- Trips
- Trip detail
- Stories
- About
- Contact

## 2. Separation rule

Do not create components that require an unrelated internal module to exist.

Bad:

`Homepage -> AdminContext -> CreatorContext -> TripUI`

Good:

`Homepage -> Trip domain -> public trip data`

Internal modules can observe or operate on the same domain without becoming dependencies of the public UI.

## 3. Navigation must be configuration-driven

Do not hardcode every possible role/module into one giant navbar.

Use a navigation definition with visibility rules such as:
- public
- authenticated
- staff
- admin
- creator
- feature-enabled

This lets internal navigation disappear cleanly without leaving empty gaps.

## 4. Routes

Keep optional product areas in separate route groups/domains:

- `(marketing)`
- `dashboard`
- `admin`
- `creator`

Removing `creator` must not require rewriting public trip pages.

Removing `admin` from the public deployment must not remove the underlying trip domain.

## 5. Feature flags

Use feature flags/configuration for rollout decisions where appropriate.

Examples:
- community_enabled
- creator_portal_enabled
- public_profiles_enabled
- ai_matcher_enabled
- travel_passport_enabled

Feature flags are for product configuration, not for security. Security must remain enforced through authorization/RLS.

## 6. Domain boundaries

Business logic should live in domain modules/services rather than inside pages.

Example:

`lib/trips/`
`lib/bookings/`
`lib/payments/`
`lib/community/`
`lib/creators/`
`lib/admin/`

UI components call domain functions and should not contain privileged business rules.

## 7. Database principle

Tables for optional features may exist in Supabase without being exposed to the public product.

Their RLS policies must still be secure.

Removing a UI module later should not require destructive database changes unless the data is intentionally deprecated/migrated.

## 8. Public deployment profile

Before launch, define an explicit Public Product Profile, for example:

```text
public_trip_discovery = true
public_booking = true
public_community_preview = true
traveller_accounts = optional
traveller_dashboard = optional
creator_portal = false
staff_admin = false to public users
advanced_ai = selective
```

The exact launch profile will be decided later.

## 9. Removing a feature

When an internal feature is removed from launch scope:

1. Disable its feature flag/configuration.
2. Remove its navigation entries.
3. Remove public CTAs pointing to it.
4. Remove its public routes from sitemap/navigation if appropriate.
5. Keep domain/data code only if another feature still depends on it.
6. Remove dead code after dependency analysis.
7. Run typecheck/lint/tests/build.
8. Review redirects and broken links.
9. Review database migrations only after confirming the feature/data is no longer needed.

## 10. Visual cleanliness

Internal features must not dictate the public visual layout.

The public header, footer, homepage, trip pages, and public navigation should remain visually coherent whether 0, 2, or 10 internal modules are enabled.

Avoid reserving empty UI space for future modules.

## 11. User roles

Roles are permissions, not visual product sections.

A user should only see role-specific navigation when the role and feature are actually available.

Do not create a permanent public “Managerial” menu simply because roles exist internally.

## 12. Launch simplification

It is explicitly acceptable to launch with only a subset of the architecture.

The architecture exists to prevent future additions/removals from damaging the product—not to force every feature into the first release.

## 13. Portfolio/demo mode

For the portfolio, internal interfaces can be available through protected/demo accounts without exposing them in the public customer navigation.

Public customer experience remains the primary product story.

## 14. Engineering rule

Every optional feature must have:
- its own route boundary
- its own domain/service boundary
- its own navigation entries
- its own authorization rules
- clear dependencies
- clear removal path

This allows WWS to evolve without architectural or visual clutter.
