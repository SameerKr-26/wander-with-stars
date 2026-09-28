import type { ContentStatus } from '../content/ingest/types';
import type { AdminRole } from './roles';

/**
 * Content lifecycle transition rules — Phase 4.3's "design the transition
 * rules explicitly" requirement. Pure and DB-free, so it's unit-testable
 * without a database and reusable by both the admin UI (deciding which
 * buttons to show) and `lib/admin/repository.ts` (deciding which writes to
 * actually allow — the UI list is a convenience, this table is the real
 * gate, checked again server-side every time regardless of what the browser
 * submitted).
 *
 * Explicit model, chosen deliberately over "content_manager can do
 * anything to their own draft":
 *
 *   draft    --submit for review-->  review     (content_manager, admin, super_admin)
 *   review   --return to draft---->  draft      (content_manager, admin, super_admin)
 *   review   --approve------------>  approved   (admin, super_admin)
 *   approved --return to review--->  review     (admin, super_admin)
 *   approved --publish------------>  published  (admin, super_admin)
 *   published--archive------------>  archived   (admin, super_admin)
 *
 * `content_manager` can create/edit draft content and move it into and out
 * of review, but cannot approve, publish or archive — those are exactly the
 * transitions with real public/commercial consequence, matching
 * docs/RBAC.md's "Content: content fields only" vs. "Admin/Super Admin: ✓"
 * distinction for the broader trip-management capability. `archived` is
 * terminal: nothing here revives it — an archived trip that needs to come
 * back is a new editorial decision, not a routine transition.
 */
const TRANSITIONS: Partial<
  Record<ContentStatus, Partial<Record<ContentStatus, readonly AdminRole[]>>>
> = {
  draft: {
    review: ['content_manager', 'admin', 'super_admin'],
  },
  review: {
    draft: ['content_manager', 'admin', 'super_admin'],
    approved: ['admin', 'super_admin'],
  },
  approved: {
    review: ['admin', 'super_admin'],
    published: ['admin', 'super_admin'],
  },
  published: {
    archived: ['admin', 'super_admin'],
  },
};

export function canTransition(role: AdminRole, from: ContentStatus, to: ContentStatus): boolean {
  return (TRANSITIONS[from]?.[to] ?? []).includes(role);
}

/** Every status `role` may move a trip currently at `from` into — drives which buttons the admin UI shows. */
export function allowedNextStatuses(role: AdminRole, from: ContentStatus): ContentStatus[] {
  const targets = TRANSITIONS[from];
  if (!targets) return [];
  return (Object.keys(targets) as ContentStatus[]).filter((to) => canTransition(role, from, to));
}
