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

## Permission implementation notes

Do not encode roles only in client state. Resolve trusted role membership from secure server/database state and enforce it in backend operations and database policies.
