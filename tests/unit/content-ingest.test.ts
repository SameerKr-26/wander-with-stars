import { describe, expect, it } from 'vitest';

import { ingestDraftTripContent, ingestTripContent, isPublishable } from '@/lib/content/ingest';
import {
  deepTrimStrings,
  normalizeDateInput,
  normalizeSlug,
  normalizeTripInput,
} from '@/lib/content/ingest/normalize';
import { tripDetailSchema } from '@/lib/content/ingest/schema';
import {
  VIETNAM_WWS_7D6N_INGEST,
  VIETNAM_WWS_7D6N_RAW,
  VIETNAM_WWS_7D6N_RECORD,
} from '@/lib/content/ingest/sources/vietnam-wws-7d6n';
import type { RawTripInput } from '@/lib/content/ingest/types';
import { getTripBySlug, getUpcomingTrips } from '@/lib/content/queries';

/**
 * Phase 3.6 — the content ingestion pipeline
 * (raw source -> normalize.ts -> schema.ts -> TripDetail).
 *
 * `EXAMPLE_RAW_TRIP_SOURCE` below is the "at most one clearly labelled
 * example of a normalized content payload" the brief allows for tests —
 * entirely synthetic, exists only in this file, and is never written into
 * lib/content/fixtures.ts. It deliberately mimics the messiness a real
 * external source (a CSV export, a manually reviewed brochure extraction)
 * would actually have — mixed casing, an ISO datetime instead of a bare
 * date, a lowercase currency code — so the tests exercise normalization
 * doing real work, not a pre-cleaned payload.
 */
const EXAMPLE_RAW_TRIP_SOURCE: RawTripInput = {
  id: 'example-source-1',
  title: '  Example Community Trip — Northern Vietnam  ',
  destination: 'Hanoi & Ha Long Bay',
  country: 'Vietnam',
  departureDate: '2026-11-14T00:00:00.000Z',
  durationNights: 6,
  price: { amount: 68000, currency: 'inr' },
  availability: { status: 'Open', spotsLeft: 8 },
  host: { name: 'Example Host' },
  heroMedia: { kind: 'Placeholder' },
  styleScores: { Adventure: 70, SOCIAL: 85 },
  overview: 'An example overview for ingestion testing only.',
  inclusions: ['Example inclusion'],
  exclusions: ['Example exclusion'],
  gallery: [],
  itineraryPreview: [
    { day: 1, title: 'Arrival', summary: 'Example arrival day summary.' },
    { day: 2, title: 'Explore', summary: 'Example second day summary.' },
  ],
  importantNotes: [{ title: 'Example note', detail: 'Example detail.', category: 'Etiquette' }],
  // No `slug` on purpose — this is the case normalization derives one from `title`.
};

describe('existing fixtures validate cleanly against the real schema', () => {
  it('every fixture trip passes tripDetailSchema unchanged', async () => {
    const upcoming = await getUpcomingTrips();
    if (upcoming.status !== 'ready') throw new Error('expected fixtures to be ready');

    for (const preview of upcoming.data) {
      const state = await getTripBySlug(preview.slug);
      if (state.status !== 'ready') throw new Error(`expected ${preview.slug} to be ready`);

      const result = tripDetailSchema.safeParse(state.data);
      expect(
        result.success,
        `${preview.slug}: ${JSON.stringify(result.success ? null : result.error.issues)}`,
      ).toBe(true);
    }
  });
});

describe('ingestTripContent — valid content', () => {
  it('accepts a fully populated, messily-formatted example source', () => {
    const result = ingestTripContent(EXAMPLE_RAW_TRIP_SOURCE);
    expect(result.ok).toBe(true);
    if (!result.ok) return;

    expect(result.data.slug).toBe('example-community-trip-northern-vietnam');
    expect(result.data.title).toBe('Example Community Trip — Northern Vietnam');
    expect(result.data.departureDate).toBe('2026-11-14');
    expect(result.data.price.currency).toBe('INR');
    expect(result.data.availability.status).toBe('open');
    expect(result.data.heroMedia).toEqual({ kind: 'placeholder' });
    expect(result.data.styleScores).toEqual({ adventure: 70, social: 85 });
    expect(result.data.importantNotes?.[0]?.category).toBe('etiquette');
  });

  it('always produces a draft content record — never auto-published', () => {
    const result = ingestTripContent(EXAMPLE_RAW_TRIP_SOURCE);
    expect(result.ok).toBe(true);
    if (!result.ok) return;

    expect(result.record.status).toBe('draft');
    expect(isPublishable(result.record)).toBe(false);
  });

  it('never fabricates a field the source did not provide', () => {
    const result = ingestTripContent(EXAMPLE_RAW_TRIP_SOURCE);
    expect(result.ok).toBe(true);
    if (!result.ok) return;

    expect(result.data.tagline).toBeUndefined();
    expect(result.data.host.tagline).toBeUndefined();
    expect(result.data.accommodation).toBeUndefined();
    expect(result.data.policy).toBeUndefined();
    expect(result.data.guide).toBeUndefined();
  });

  it('validates optional sections when present, and their absence is not an error', () => {
    const withExtras = ingestTripContent({
      ...EXAMPLE_RAW_TRIP_SOURCE,
      slug: 'example-with-extras',
      accommodation: [{ name: 'Example Hotel', nights: 3 }],
      transport: [{ mode: 'Domestic flight' }],
      meetingPoint: { location: 'Example arrivals hall' },
      thingsToCarry: ['Example item'],
      extras: [{ name: 'Example add-on', price: { amount: 500, currency: 'inr' } }],
      guide: { name: 'Example Guide' },
      faqs: [{ question: 'Example question?', answer: 'Example answer.' }],
      policy: { cancellation: { title: 'Cancellation', body: 'Example body.' } },
    });

    expect(withExtras.ok).toBe(true);
    if (!withExtras.ok) return;
    expect(withExtras.data.accommodation?.[0]?.name).toBe('Example Hotel');
    expect(withExtras.data.extras?.[0]?.price?.currency).toBe('INR');
    expect(withExtras.data.guide?.name).toBe('Example Guide');
    expect(withExtras.data.policy?.cancellation?.body).toBe('Example body.');
  });
});

describe('ingestTripContent — malformed content is rejected, never repaired', () => {
  it('rejects a missing required field (title)', () => {
    const { title: _omit, ...withoutTitle } = EXAMPLE_RAW_TRIP_SOURCE;
    const result = ingestTripContent({ ...withoutTitle, slug: 'example-no-title' });
    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.errors.some((e) => e.path === 'title')).toBe(true);
  });

  it('rejects an ambiguous, non-ISO date rather than guessing at it', () => {
    const result = ingestTripContent({
      ...EXAMPLE_RAW_TRIP_SOURCE,
      slug: 'example-bad-date',
      departureDate: '14 Nov 2026',
    });
    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.errors.some((e) => e.path === 'departureDate')).toBe(true);
  });

  it('rejects a non-positive price amount', () => {
    const result = ingestTripContent({
      ...EXAMPLE_RAW_TRIP_SOURCE,
      slug: 'example-bad-price',
      price: { amount: -100, currency: 'INR' },
    });
    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.errors.some((e) => e.path === 'price.amount')).toBe(true);
  });

  it('rejects a malformed currency code', () => {
    const result = ingestTripContent({
      ...EXAMPLE_RAW_TRIP_SOURCE,
      slug: 'example-bad-currency',
      price: { amount: 1000, currency: 'Rupees' },
    });
    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.errors.some((e) => e.path === 'price.currency')).toBe(true);
  });

  it('rejects an itinerary with duplicate day numbers', () => {
    const result = ingestTripContent({
      ...EXAMPLE_RAW_TRIP_SOURCE,
      slug: 'example-duplicate-days',
      itineraryPreview: [
        { day: 1, title: 'A', summary: 'Example.' },
        { day: 1, title: 'B', summary: 'Example.' },
      ],
    });
    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.errors.some((e) => e.message.includes('duplicate itinerary day'))).toBe(true);
  });

  it('rejects an itinerary with out-of-order day numbers', () => {
    const result = ingestTripContent({
      ...EXAMPLE_RAW_TRIP_SOURCE,
      slug: 'example-out-of-order-days',
      itineraryPreview: [
        { day: 2, title: 'A', summary: 'Example.' },
        { day: 1, title: 'B', summary: 'Example.' },
      ],
    });
    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.errors.some((e) => e.message.includes('non-decreasing'))).toBe(true);
  });

  it('rejects media with a missing required field', () => {
    const result = ingestTripContent({
      ...EXAMPLE_RAW_TRIP_SOURCE,
      slug: 'example-bad-media',
      heroMedia: { kind: 'image', alt: 'Missing src' },
    });
    expect(result.ok).toBe(false);
  });

  it('rejects media with an unknown kind', () => {
    const result = ingestTripContent({
      ...EXAMPLE_RAW_TRIP_SOURCE,
      slug: 'example-unknown-media-kind',
      heroMedia: { kind: 'gif', src: 'x' },
    });
    expect(result.ok).toBe(false);
  });

  it('rejects a policy section missing its body', () => {
    const result = ingestTripContent({
      ...EXAMPLE_RAW_TRIP_SOURCE,
      slug: 'example-bad-policy',
      policy: { cancellation: { title: 'Cancellation' } },
    });
    expect(result.ok).toBe(false);
  });

  it('rejects a guide record with no name', () => {
    const result = ingestTripContent({
      ...EXAMPLE_RAW_TRIP_SOURCE,
      slug: 'example-bad-guide',
      guide: { tagline: 'No name at all' },
    });
    expect(result.ok).toBe(false);
  });

  it('rejects a traveller note with an unrecognised category rather than accepting anything', () => {
    const result = ingestTripContent({
      ...EXAMPLE_RAW_TRIP_SOURCE,
      slug: 'example-bad-note-category',
      importantNotes: [{ title: 'Note', detail: 'Detail', category: 'not-a-real-category' }],
    });
    expect(result.ok).toBe(false);
  });

  it('rejects a malformed slug rather than silently repairing it', () => {
    const result = tripDetailSchema.safeParse({
      ...EXAMPLE_RAW_TRIP_SOURCE,
      slug: 'Not A Valid Slug!',
    });
    expect(result.success).toBe(false);
  });
});

describe('normalization — mechanical reshaping, never invention', () => {
  it('normalizeSlug produces lowercase kebab-case from a messy title', () => {
    expect(normalizeSlug('  Sample Trip: Northern Vietnam!  ')).toBe(
      'sample-trip-northern-vietnam',
    );
    expect(normalizeSlug('Café Ubud — Bali')).toBe('cafe-ubud-bali');
  });

  it('deepTrimStrings collapses internal whitespace without changing the words', () => {
    expect(deepTrimStrings('  too    many   spaces  ')).toBe('too many spaces');
    expect(deepTrimStrings({ a: '  x  ', b: ['  y  '] })).toEqual({ a: 'x', b: ['y'] });
  });

  it('normalizeDateInput truncates a full ISO datetime, and leaves ambiguous input untouched', () => {
    expect(normalizeDateInput('2026-11-14T00:00:00.000Z')).toBe('2026-11-14');
    expect(normalizeDateInput('2026-11-14')).toBe('2026-11-14');
    expect(normalizeDateInput('14/11/2026')).toBe('14/11/2026'); // ambiguous — left for validation to reject
  });

  it('normalizeTripInput derives a slug from title only when no slug is supplied', () => {
    const withSlug = normalizeTripInput({ title: 'Ignored For Slug', slug: 'Real Slug Here' });
    expect(withSlug.slug).toBe('real-slug-here');

    const withoutSlug = normalizeTripInput({ title: 'Derived From Title' });
    expect(withoutSlug.slug).toBe('derived-from-title');
  });

  it('lowercases style score keys and availability status without changing their values', () => {
    const normalized = normalizeTripInput({
      styleScores: { Adventure: 70, SOCIAL: 85 },
      availability: { status: 'Open' },
    });
    expect(normalized.styleScores).toEqual({ adventure: 70, social: 85 });
    expect((normalized.availability as Record<string, unknown>).status).toBe('open');
  });
});

describe('ingestDraftTripContent — commercially-incomplete content (Phase 3.7)', () => {
  const {
    departureDate: _d,
    price: _p,
    availability: _a,
    host: _h,
    ...withoutCommercials
  } = EXAMPLE_RAW_TRIP_SOURCE;

  it('accepts content with no price, departureDate, availability or host', () => {
    const result = ingestDraftTripContent({ ...withoutCommercials, slug: 'example-draft-only' });
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.data.price).toBeUndefined();
    expect(result.data.departureDate).toBeUndefined();
    expect(result.data.availability).toBeUndefined();
    expect(result.data.host).toBeUndefined();
  });

  it('still produces status draft, same as the strict pipeline', () => {
    const result = ingestDraftTripContent({ ...withoutCommercials, slug: 'example-draft-status' });
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.record.status).toBe('draft');
    expect(isPublishable(result.record)).toBe(false);
  });

  it('still rejects a genuinely missing required field (title), same as the strict pipeline', () => {
    const { title: _omit, ...withoutTitle } = withoutCommercials;
    const result = ingestDraftTripContent({ ...withoutTitle, slug: 'example-draft-no-title' });
    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.errors.some((e) => e.path === 'title')).toBe(true);
  });

  it('still rejects malformed content the same way the strict pipeline would (bad price when present)', () => {
    const result = ingestDraftTripContent({
      ...withoutCommercials,
      slug: 'example-draft-bad-price',
      price: { amount: -1, currency: 'INR' },
    });
    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.errors.some((e) => e.path === 'price.amount')).toBe(true);
  });

  it('content valid as a draft still fails the strict, publishable schema', () => {
    const draft = ingestDraftTripContent({ ...withoutCommercials, slug: 'example-still-a-draft' });
    expect(draft.ok).toBe(true);
    if (!draft.ok) return;

    const strict = tripDetailSchema.safeParse(draft.data);
    expect(strict.success).toBe(false);
  });
});

describe('Phase 3.7 — real Vietnam WWS 7D6N content', () => {
  it('ingests as a draft record, never invented commercial fields', () => {
    expect(VIETNAM_WWS_7D6N_INGEST.ok).toBe(true);
    if (!VIETNAM_WWS_7D6N_INGEST.ok) return;

    expect(VIETNAM_WWS_7D6N_INGEST.record.status).toBe('draft');
    expect(isPublishable(VIETNAM_WWS_7D6N_INGEST.record)).toBe(false);
    expect(VIETNAM_WWS_7D6N_INGEST.data.price).toBeUndefined();
    expect(VIETNAM_WWS_7D6N_INGEST.data.departureDate).toBeUndefined();
    expect(VIETNAM_WWS_7D6N_INGEST.data.availability).toBeUndefined();
    expect(VIETNAM_WWS_7D6N_INGEST.data.host).toBeUndefined();
    expect(VIETNAM_WWS_7D6N_INGEST.data.guide).toBeUndefined();
    expect(VIETNAM_WWS_7D6N_INGEST.data.faqs).toBeUndefined();
    expect(VIETNAM_WWS_7D6N_INGEST.data.policy).toBeUndefined();
  });

  it('is not publishable-shaped content yet — correctly fails the strict schema', () => {
    const strict = tripDetailSchema.safeParse(VIETNAM_WWS_7D6N_RAW);
    expect(strict.success).toBe(false);
    if (strict.success) return;
    const paths = strict.error.issues.map((i) => i.path.join('.'));
    expect(paths).toEqual(
      expect.arrayContaining(['departureDate', 'price', 'availability', 'host']),
    );
  });

  it('preserves the full 7-day itinerary in order, verbatim from the source', () => {
    expect(VIETNAM_WWS_7D6N_INGEST.ok).toBe(true);
    if (!VIETNAM_WWS_7D6N_INGEST.ok) return;

    const days = VIETNAM_WWS_7D6N_INGEST.data.itineraryPreview;
    expect(days).toHaveLength(7);
    expect(days.map((d) => d.day)).toEqual([1, 2, 3, 4, 5, 6, 7]);
    expect(days[6]?.title).toBe('The Trip Ends, But the Story Lives On');
    // Preserved source artifacts, not silently corrected.
    expect(days[3]?.summary).toContain('Disneyland of Vietnam. Y A buffet lunch');
    expect(days[4]?.title).toContain('Club Night');
    expect(days[4]?.summary).not.toContain('club');
  });

  it('imports every inclusion and exclusion from page 8, verbatim', () => {
    expect(VIETNAM_WWS_7D6N_INGEST.ok).toBe(true);
    if (!VIETNAM_WWS_7D6N_INGEST.ok) return;

    expect(VIETNAM_WWS_7D6N_INGEST.data.inclusions).toHaveLength(18);
    expect(VIETNAM_WWS_7D6N_INGEST.data.exclusions).toHaveLength(14);
    expect(VIETNAM_WWS_7D6N_INGEST.data.exclusions).toContain(
      'Visa Fees (E-Visa for Indians: ₹2900)',
    );
    expect(VIETNAM_WWS_7D6N_INGEST.data.inclusions).toContain('Hanoi Train Street Tour');
  });

  it('imports only the genuinely practical destination facts as traveller notes', () => {
    expect(VIETNAM_WWS_7D6N_INGEST.ok).toBe(true);
    if (!VIETNAM_WWS_7D6N_INGEST.ok) return;

    const notes = VIETNAM_WWS_7D6N_INGEST.data.importantNotes ?? [];
    expect(notes).toHaveLength(3);
    expect(notes.every((n) => n.category === 'other')).toBe(true);
    const titles = notes.map((n) => n.title);
    // Marketing trivia from the same source pages must not appear here.
    expect(titles.some((t) => /cave|egg coffee|cheapest|cable car|lantern/i.test(t))).toBe(false);
  });

  it('does not extract any media from the source PDF', () => {
    expect(VIETNAM_WWS_7D6N_INGEST.ok).toBe(true);
    if (!VIETNAM_WWS_7D6N_INGEST.ok) return;

    expect(VIETNAM_WWS_7D6N_INGEST.data.heroMedia).toEqual({ kind: 'placeholder' });
    expect(VIETNAM_WWS_7D6N_INGEST.data.gallery).toEqual([]);
  });

  it('carries review notes flagging what still needs a human before this can publish', () => {
    expect(VIETNAM_WWS_7D6N_RECORD).toBeDefined();
    expect(VIETNAM_WWS_7D6N_RECORD?.status).toBe('draft');
    expect(VIETNAM_WWS_7D6N_RECORD?.reviewNotes).toMatch(/price|departure date|availability|host/i);
    expect(VIETNAM_WWS_7D6N_RECORD?.reviewNotes).toMatch(/2900|visa/i);
  });
});

describe('content status', () => {
  it('isPublishable is true only for status "published"', () => {
    expect(isPublishable({ status: 'draft', data: {} })).toBe(false);
    expect(isPublishable({ status: 'review', data: {} })).toBe(false);
    expect(isPublishable({ status: 'approved', data: {} })).toBe(false);
    expect(isPublishable({ status: 'archived', data: {} })).toBe(false);
    expect(isPublishable({ status: 'published', data: {} })).toBe(true);
  });
});
