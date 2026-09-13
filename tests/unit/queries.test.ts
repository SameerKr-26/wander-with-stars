import { describe, expect, it } from 'vitest';

import { getTripBySlug, getUpcomingTrips } from '@/lib/content/queries';

/**
 * Content queries — the seam tested independent of any component.
 *
 * `getTripBySlug` backs /trips/[slug] (Phase 3.3, Part E): a known slug must
 * resolve to real detail content, and an unknown one must resolve to
 * 'empty' — the shape the page checks before calling Next's `notFound()`,
 * rather than ever fabricating a "coming soon" page for an invalid URL.
 */

describe('getTripBySlug', () => {
  it('resolves a known fixture slug to full trip detail', async () => {
    const upcoming = await getUpcomingTrips();
    if (upcoming.status !== 'ready') throw new Error('expected fixtures to be ready');
    const knownSlug = upcoming.data[0]?.slug;
    expect(knownSlug).toBeTruthy();

    const state = await getTripBySlug(knownSlug as string);
    expect(state.status).toBe('ready');
    if (state.status === 'ready') {
      expect(state.data.slug).toBe(knownSlug);
      expect(state.data.overview).toBeTruthy();
      expect(state.data.itineraryPreview.length).toBeGreaterThan(0);
    }
  });

  it('resolves an unknown slug to empty — the page treats this as a real 404', async () => {
    const state = await getTripBySlug('this-slug-does-not-exist');
    expect(state.status).toBe('empty');
  });

  it('resolves an empty-string slug to empty, not a crash', async () => {
    const state = await getTripBySlug('');
    expect(state.status).toBe('empty');
  });

  it('every fixture trip in the listing has matching detail content', async () => {
    const upcoming = await getUpcomingTrips();
    if (upcoming.status !== 'ready') throw new Error('expected fixtures to be ready');

    for (const trip of upcoming.data) {
      const detail = await getTripBySlug(trip.slug);
      expect(detail.status).toBe('ready');
    }
  });
});
