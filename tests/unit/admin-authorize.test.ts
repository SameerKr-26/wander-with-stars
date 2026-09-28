import { beforeEach, describe, expect, it, vi } from 'vitest';

/**
 * `lib/admin/authorize.ts`'s `requireAdminRole` — the actual server-side
 * authorization gate every admin Server Action calls. Mocks
 * `lib/admin/auth.ts`'s session resolution (which itself talks to Supabase
 * via Next's cookie-bound client, not reproducible outside a real request)
 * so this test is purely about the gate's own branching: no session ->
 * unauthenticated, wrong role -> forbidden, right role -> passes through.
 *
 * `server-only` is mocked to an empty module — it throws unconditionally
 * outside Next's build (see lib/content/db/repository.ts's own comment on
 * the same issue), which would otherwise make this file unimportable here.
 */
vi.mock('server-only', () => ({}));

const getAdminSession = vi.fn();
vi.mock('@/lib/admin/auth', () => ({
  getAdminSession: (...args: unknown[]) => getAdminSession(...args),
}));

beforeEach(() => {
  getAdminSession.mockReset();
});

describe('requireAdminRole', () => {
  it('throws an "unauthenticated" AdminAuthError when there is no session', async () => {
    getAdminSession.mockResolvedValue(null);
    const { requireAdminRole, AdminAuthError } = await import('@/lib/admin/authorize');

    await expect(requireAdminRole(['admin'])).rejects.toBeInstanceOf(AdminAuthError);
    await expect(requireAdminRole(['admin'])).rejects.toMatchObject({ reason: 'unauthenticated' });
  });

  it('throws a "forbidden" AdminAuthError when the session role is not in the allowed list', async () => {
    getAdminSession.mockResolvedValue({
      userId: 'u1',
      email: 'a@example.com',
      role: 'content_manager',
    });
    const { requireAdminRole, AdminAuthError } = await import('@/lib/admin/authorize');

    await expect(requireAdminRole(['admin', 'super_admin'])).rejects.toBeInstanceOf(AdminAuthError);
    await expect(requireAdminRole(['admin', 'super_admin'])).rejects.toMatchObject({
      reason: 'forbidden',
    });
  });

  it('returns the session when the role is allowed', async () => {
    const session = { userId: 'u1', email: 'a@example.com', role: 'content_manager' as const };
    getAdminSession.mockResolvedValue(session);
    const { requireAdminRole } = await import('@/lib/admin/authorize');

    await expect(requireAdminRole(['content_manager', 'admin'])).resolves.toEqual(session);
  });

  it('never trusts a role not actually resolved from the session', async () => {
    // Even an empty allowed-list must reject a real session — the point is
    // that the caller's requested list is checked AGAINST the resolved
    // session, never substituted for it.
    getAdminSession.mockResolvedValue({ userId: 'u1', email: null, role: 'super_admin' });
    const { requireAdminRole, AdminAuthError } = await import('@/lib/admin/authorize');

    await expect(requireAdminRole([])).rejects.toBeInstanceOf(AdminAuthError);
  });
});
