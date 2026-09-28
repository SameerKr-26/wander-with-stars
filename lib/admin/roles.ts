/**
 * Admin role model — Phase 4.3.
 *
 * Exactly the three docs/RBAC.md roles with any content-administration
 * capability in that document's own matrix ("Manage content" / "Create-edit
 * trips" / "Manage departures"). No new role name is invented; the other
 * five RBAC.md roles (traveller, trip_manager, operations_manager,
 * finance_manager, community_manager) are out of scope for this table —
 * see `supabase/migrations/20260928183648_create_admin_roles_and_read_policies.sql`'s
 * own header for why they have no row here at all rather than a role that
 * grants nothing.
 */
export const ADMIN_ROLES = ['content_manager', 'admin', 'super_admin'] as const;
export type AdminRole = (typeof ADMIN_ROLES)[number];

export function isAdminRole(value: string): value is AdminRole {
  return (ADMIN_ROLES as readonly string[]).includes(value);
}

/**
 * The authenticated admin identity `lib/admin/auth.ts` resolves — never
 * constructed from client-submitted data (docs/SECURITY.md §11: never trust
 * client-side roles).
 */
export interface AdminSession {
  userId: string;
  email: string | null;
  role: AdminRole;
}

/**
 * Trip content (core fields, itinerary, inclusions/exclusions) — matches
 * docs/RBAC.md's "Create/edit trips" row: Content Manager gets "Content
 * fields", Admin and Super Admin get full access. Transitioning
 * content_status is a separate, narrower authority — see
 * `lib/admin/transitions.ts`, which only content_manager (draft <-> review)
 * and admin/super_admin (review -> approved -> published -> archived) may
 * exercise at all.
 */
export const CONTENT_EDITOR_ROLES: readonly AdminRole[] = [
  'content_manager',
  'admin',
  'super_admin',
];

/**
 * Departures — matches docs/RBAC.md's "Manage departures" row exactly:
 * Content Manager has NO access there (only Trip Manager/assigned,
 * Operations, Admin and Super Admin do). This project's `admin_roles` table
 * only models three of RBAC.md's eight roles (see that table's own
 * migration comment) — Trip Manager and Operations Manager aren't among
 * them yet, so until they are, departures are admin/super_admin only.
 */
export const DEPARTURE_EDITOR_ROLES: readonly AdminRole[] = ['admin', 'super_admin'];
