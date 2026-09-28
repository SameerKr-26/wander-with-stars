# Wander With Stars V2 — RBAC Matrix

## Roles

- traveller
- trip_manager
- operations_manager
- finance_manager
- content_manager
- community_manager
- admin
- super_admin

## Access model

Permissions should be implemented using server-side authorization and database RLS. UI hiding is never the security boundary.

| Capability | Traveller | Trip Manager | Operations | Finance | Content | Community | Admin | Super Admin |
|---|---:|---:|---:|---:|---:|---:|---:|---:|
| View public trips | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ |
| Manage own profile | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ |
| View own bookings | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ |
| Create/edit trips | - | Assigned | ✓ | - | Content fields | - | ✓ | ✓ |
| Manage departures | - | Assigned | ✓ | - | - | - | ✓ | ✓ |
| View customer records | Own only | Assigned | ✓ | Finance scope | - | Community scope | ✓ | ✓ |
| Manage payments | Own only | Status visibility | Visibility | ✓ | - | - | ✓ | ✓ |
| Process refunds | - | - | Requested | ✓ | - | - | ✓ | ✓ |
| Manage content | - | Limited | - | - | ✓ | - | ✓ | ✓ |
| Moderate community | Own participation | Trip scope | ✓ | - | - | ✓ | ✓ | ✓ |
| Manage users/roles | - | - | - | - | - | - | ✓ | ✓ |
| View audit logs | - | - | Limited | Finance-related | - | Moderation-related | ✓ | ✓ |
| System settings | - | - | - | - | - | - | Limited | ✓ |

## Ownership rules

### Traveller
Access only own profile, bookings, payment records associated with own bookings, and communities they legitimately belong to.

### Trip Manager
Access only trips/departures assigned to them. Avoid broad customer data access unless required.

### Operations Manager
Manage operational lifecycle across trips, bookings, customers, inventory, and community operations.

### Finance Manager
Manage payments, instalments, refunds, financial reports, and financial reconciliation.

### Content Manager
Manage trip copy, stories, media, FAQs, guides, and creator profiles where assigned.

### Community Manager
Manage community moderation, reports, announcements, and membership issues.

### Admin
Broad operational access.

### Super Admin
System-level configuration and role management.

## Content administration (Phase 4.3 — implemented)

The first real implementation of this matrix, scoped narrowly to trip
content administration. Backing table: `admin_roles`
(docs/DATABASE.md §2, `supabase/migrations/20260928183648_*.sql`) — holds
only three of the eight roles above (`content_manager`, `admin`,
`super_admin`), the only ones with any content-editing capability in the
matrix. Nobody else (traveller, trip_manager, operations_manager,
finance_manager, community_manager) has an `admin_roles` row at all yet;
those roles remain document-only until whatever future milestone actually
needs them enforced.

**Content lifecycle transitions** (`lib/admin/transitions.ts`) — the
concrete "who can create/edit/review/approve/publish/archive" answer this
document's "Manage content" row didn't itself specify at transition
granularity:

| Transition | Allowed roles |
|---|---|
| draft → review (submit) | content_manager, admin, super_admin |
| review → draft (return) | content_manager, admin, super_admin |
| review → approved | admin, super_admin |
| approved → review (return) | admin, super_admin |
| approved → published | admin, super_admin |
| published → archived | admin, super_admin |

`content_manager` can create and edit trip content (core fields, itinerary,
inclusions/exclusions — matching this document's "Content fields" grant)
and move it into and out of review, but cannot approve, publish or archive:
exactly the transitions with real public/commercial consequence stay
admin/super_admin only, so a normal content editor can never publish
unilaterally. **Departures** are admin/super_admin only end to end — matching
this document's "Manage departures" row exactly, where Content Manager has
no access — since `trip_manager`/`operations_manager` (the two roles that
row does grant to) have no `admin_roles` entry yet.

**Enforcement**: server-side only, at two independent points —
`lib/admin/authorize.ts`'s `requireAdminRole` (re-checked by every Server
Action, never trusting what the browser submitted) and, for reads only, the
`admin_roles`-aware RLS policies in docs/DATABASE.md §14. Admin *writes*
bypass RLS entirely via `lib/supabase/admin.ts`'s service-role client,
strictly after the application-layer check — RLS is not a second write gate
for content tables, by design (see that migration's own header).

**Admin authentication**: Supabase Auth email/password only, via
`/admin/login` — no self-service sign-up, no password reset flow, no
traveller-facing account system. The first admin account(s) are provisioned
out-of-band with `scripts/grant-admin-role.ts`, run locally against the dev
database by someone holding the service-role key — matching this document's
"Manage users/roles: Admin/Super Admin only" with no UI for it yet at all.

## Permission implementation notes

Do not encode roles only in client state. Resolve trusted role membership from secure server/database state and enforce it in backend operations and database policies.
