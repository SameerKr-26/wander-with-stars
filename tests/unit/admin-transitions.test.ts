import { describe, expect, it } from 'vitest';

import { allowedNextStatuses, canTransition } from '@/lib/admin/transitions';
import type { ContentStatus } from '@/lib/content/ingest/types';

/**
 * Pure content-lifecycle transition rules — no database, no auth, just the
 * table `lib/admin/transitions.ts` documents. Exhaustive over every
 * (status, status, role) combination the current model defines, so a
 * future edit to that table shows up here immediately.
 */

const ALL_STATUSES: ContentStatus[] = ['draft', 'review', 'approved', 'published', 'archived'];

describe('canTransition', () => {
  it('lets content_manager submit a draft for review', () => {
    expect(canTransition('content_manager', 'draft', 'review')).toBe(true);
  });

  it('lets content_manager return review content to draft', () => {
    expect(canTransition('content_manager', 'review', 'draft')).toBe(true);
  });

  it('does not let content_manager approve, publish or archive', () => {
    expect(canTransition('content_manager', 'review', 'approved')).toBe(false);
    expect(canTransition('content_manager', 'approved', 'published')).toBe(false);
    expect(canTransition('content_manager', 'published', 'archived')).toBe(false);
  });

  it('lets admin and super_admin approve, publish and archive', () => {
    for (const role of ['admin', 'super_admin'] as const) {
      expect(canTransition(role, 'review', 'approved')).toBe(true);
      expect(canTransition(role, 'approved', 'published')).toBe(true);
      expect(canTransition(role, 'published', 'archived')).toBe(true);
    }
  });

  it('never allows a transition out of archived', () => {
    for (const role of ['content_manager', 'admin', 'super_admin'] as const) {
      for (const to of ALL_STATUSES) {
        expect(canTransition(role, 'archived', to)).toBe(false);
      }
    }
  });

  it('never allows skipping a stage (e.g. draft straight to published)', () => {
    for (const role of ['content_manager', 'admin', 'super_admin'] as const) {
      expect(canTransition(role, 'draft', 'published')).toBe(false);
      expect(canTransition(role, 'draft', 'approved')).toBe(false);
      expect(canTransition(role, 'draft', 'archived')).toBe(false);
      expect(canTransition(role, 'review', 'published')).toBe(false);
      expect(canTransition(role, 'review', 'archived')).toBe(false);
      expect(canTransition(role, 'approved', 'archived')).toBe(false);
    }
  });

  it('never allows a no-op "transition" to the same status', () => {
    for (const role of ['content_manager', 'admin', 'super_admin'] as const) {
      for (const status of ALL_STATUSES) {
        expect(canTransition(role, status, status)).toBe(false);
      }
    }
  });
});

describe('allowedNextStatuses', () => {
  it('lists only the transitions a role may actually make from a given status', () => {
    expect(allowedNextStatuses('content_manager', 'draft')).toEqual(['review']);
    expect(allowedNextStatuses('content_manager', 'review').sort()).toEqual(['draft']);
    expect(allowedNextStatuses('admin', 'review').sort()).toEqual(['approved', 'draft']);
    expect(allowedNextStatuses('admin', 'approved').sort()).toEqual(['published', 'review']);
    expect(allowedNextStatuses('admin', 'published')).toEqual(['archived']);
    expect(allowedNextStatuses('admin', 'archived')).toEqual([]);
  });
});
