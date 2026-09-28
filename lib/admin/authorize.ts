import 'server-only';

import { getAdminSession } from './auth';
import type { AdminRole, AdminSession } from './roles';

/**
 * Thrown by `requireAdminRole` — every admin Server Component and Server
 * Action calls that first, so this is the one error type an admin route
 * needs to turn into "redirect to /admin/login" (no session) or "403" (a
 * real but insufficiently-privileged session). Never rendered with any
 * detail beyond that distinction to the browser.
 */
export class AdminAuthError extends Error {
  constructor(public readonly reason: 'unauthenticated' | 'forbidden') {
    super(reason === 'unauthenticated' ? 'Not signed in.' : 'Not authorized for this action.');
    this.name = 'AdminAuthError';
  }
}

/**
 * The single server-side authorization gate every admin data read and
 * write goes through — docs/SECURITY.md §4/§15: "Enforce authorization
 * server-side," "Admin routes protected." Never trust a role the browser
 * claims to have; this always re-resolves the session from the request's
 * own cookies via `getAdminSession`.
 *
 * `lib/supabase/middleware.ts`'s `/admin` redirect is a UX convenience
 * (send a signed-out visitor to the login page before they see a form they
 * can't submit) — it is NOT the security boundary. This function is: every
 * Server Action in `lib/admin/repository.ts`'s callers invokes it before
 * doing anything privileged, so even a request that somehow reaches a
 * Server Action directly (bypassing the UI and the middleware redirect)
 * still gets checked here.
 */
export async function requireAdminRole(allowed: readonly AdminRole[]): Promise<AdminSession> {
  const session = await getAdminSession();
  if (!session) throw new AdminAuthError('unauthenticated');
  if (!allowed.includes(session.role)) throw new AdminAuthError('forbidden');
  return session;
}
