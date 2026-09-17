import { describe, expect, it } from 'vitest';

import { getTripBySlug, getUpcomingTrips } from '@/lib/content/queries';
import type {
  GuidePreview,
  TripAccommodation,
  TripDetail,
  TripExtra,
  TripFAQ,
  TripImportantNote,
  TripMeetingPoint,
  TripPolicy,
  TripTransport,
} from '@/lib/content/types';

/**
 * Phase 3.5A — the extended TripDetail content contract.
 *
 * These are shape/contract tests, not fixture content: every string below
 * is deliberately synthetic ("Example ...", "Shape-test ...") and exists
 * only in this file, never in lib/content/fixtures.ts — this suite proves
 * the TYPES are usable and correctly optional, not that any real WWS
 * accommodation, transport, policy or FAQ content exists yet (none does).
 *
 * Because `tsc --noEmit` (npm run typecheck) type-checks this file as part
 * of the whole repo, a wrong field name or shape here fails the build even
 * though Vitest's own transform doesn't type-check — the real enforcement
 * of "does this compile against the interfaces" is that command, not this
 * test runner. What this file adds on top is a runtime check that objects
 * built to satisfy the types behave as expected, and that every existing
 * fixture trip is untouched by the extension.
 */

describe('existing fixtures are untouched by the Phase 3.5A extension', () => {
  it('no fixture trip has any of the new optional commercial fields set', async () => {
    const upcoming = await getUpcomingTrips();
    if (upcoming.status !== 'ready') throw new Error('expected fixtures to be ready');

    for (const preview of upcoming.data) {
      const state = await getTripBySlug(preview.slug);
      if (state.status !== 'ready') throw new Error(`expected ${preview.slug} to be ready`);

      const trip = state.data;
      expect(trip.accommodation).toBeUndefined();
      expect(trip.transport).toBeUndefined();
      expect(trip.meetingPoint).toBeUndefined();
      expect(trip.thingsToCarry).toBeUndefined();
      expect(trip.importantNotes).toBeUndefined();
      expect(trip.faqs).toBeUndefined();
      expect(trip.policy).toBeUndefined();
      expect(trip.extras).toBeUndefined();
      expect(trip.guide).toBeUndefined();
    }
  });

  it('existing inclusions/exclusions remain plain string arrays, not restructured', async () => {
    const state = await getTripBySlug('sample-northern-vietnam');
    if (state.status !== 'ready') throw new Error('expected fixture to be ready');

    expect(Array.isArray(state.data.inclusions)).toBe(true);
    expect(typeof state.data.inclusions[0]).toBe('string');
    expect(Array.isArray(state.data.exclusions)).toBe(true);
    expect(typeof state.data.exclusions[0]).toBe('string');
  });
});

describe('a TripDetail with none of the new fields is still valid', () => {
  it('compiles and reads back correctly with every new field omitted', () => {
    const minimal: TripDetail = {
      id: 'contract-test-minimal',
      slug: 'contract-test-minimal',
      title: 'Shape-test trip',
      destination: 'Shape-test City',
      country: 'Shape-test Country',
      departureDate: '2027-01-01',
      durationNights: 3,
      price: { amount: 1000, currency: 'INR' },
      availability: { status: 'open' },
      host: { name: 'Shape-test Host' },
      heroMedia: { kind: 'placeholder' },
      styleScores: {},
      overview: 'Shape-test overview.',
      inclusions: [],
      exclusions: [],
      gallery: [],
      itineraryPreview: [],
    };

    expect(minimal.accommodation).toBeUndefined();
    expect(minimal.policy).toBeUndefined();
    expect(minimal.faqs).toBeUndefined();
  });
});

describe('a TripDetail with every new field populated is a valid shape', () => {
  const accommodation: TripAccommodation[] = [
    { name: 'Example Guesthouse', type: 'Guesthouse', description: 'Shape-test only.', nights: 2 },
  ];
  const transport: TripTransport[] = [{ mode: 'Private minibus', description: 'Shape-test only.' }];
  const meetingPoint: TripMeetingPoint = {
    location: 'Example arrivals hall',
    time: '10:00',
    instructions: 'Shape-test only.',
  };
  const importantNotes: TripImportantNote[] = [
    { title: 'Example note', detail: 'Shape-test detail text.' },
  ];
  const faqs: TripFAQ[] = [{ question: 'Example question?', answer: 'Shape-test answer.' }];
  const policy: TripPolicy = {
    cancellation: { title: 'Example cancellation section', body: 'Shape-test body text.' },
    refund: { title: 'Example refund section', body: 'Shape-test body text.' },
    paymentTerms: { title: 'Example payment terms', body: 'Shape-test body text.' },
    additionalTerms: [{ title: 'Example condition', body: 'Shape-test body text.' }],
  };
  const extras: TripExtra[] = [
    { name: 'Example add-on', price: { amount: 500, currency: 'INR' }, description: 'Shape-test.' },
  ];

  const full: TripDetail = {
    id: 'contract-test-full',
    slug: 'contract-test-full',
    title: 'Shape-test trip (full)',
    destination: 'Shape-test City',
    country: 'Shape-test Country',
    departureDate: '2027-01-01',
    durationNights: 3,
    price: { amount: 1000, currency: 'INR' },
    availability: { status: 'open' },
    host: { name: 'Shape-test Host' },
    heroMedia: { kind: 'placeholder' },
    styleScores: {},
    overview: 'Shape-test overview.',
    inclusions: ['Shape-test inclusion'],
    exclusions: ['Shape-test exclusion'],
    gallery: [],
    itineraryPreview: [],
    accommodation,
    transport,
    meetingPoint,
    thingsToCarry: ['Shape-test packing item'],
    importantNotes,
    faqs,
    policy,
    extras,
  };

  it('carries every new field with the expected shape', () => {
    expect(full.accommodation?.[0]?.nights).toBe(2);
    expect(full.transport?.[0]?.mode).toBe('Private minibus');
    expect(full.meetingPoint?.location).toBe('Example arrivals hall');
    expect(full.thingsToCarry).toHaveLength(1);
    expect(full.importantNotes?.[0]?.title).toBe('Example note');
    expect(full.faqs?.[0]?.question).toBe('Example question?');
    expect(full.extras?.[0]?.price?.amount).toBe(500);
  });

  it('policy sections are independently optional, not one giant string', () => {
    expect(full.policy?.cancellation?.body).toBe('Shape-test body text.');
    expect(full.policy?.additionalTerms).toHaveLength(1);

    const cancellationOnly: TripPolicy = {
      cancellation: { title: 'Example cancellation section', body: 'Shape-test body text.' },
    };
    expect(cancellationOnly.refund).toBeUndefined();
    expect(cancellationOnly.paymentTerms).toBeUndefined();
  });
});

describe('Phase 3.5C — GuidePreview and TripImportantNote.category', () => {
  it('GuidePreview accepts exactly a HostPreview-shaped value — it is a type alias, not a copy', () => {
    const guide: GuidePreview = { name: 'Example Guide', tagline: 'Shape-test tagline.' };
    expect(guide.name).toBe('Example Guide');

    const minimalGuide: GuidePreview = { name: 'Example Guide Only Name' };
    expect(minimalGuide.tagline).toBeUndefined();
  });

  it('TripDetail.guide is optional and independent of host', () => {
    const withoutGuide: TripDetail = {
      id: 'id',
      slug: 'slug',
      title: 'Shape-test trip',
      destination: 'Shape-test City',
      country: 'Shape-test Country',
      departureDate: '2027-01-01',
      durationNights: 3,
      price: { amount: 1000, currency: 'INR' },
      availability: { status: 'open' },
      host: { name: 'Shape-test Host' },
      heroMedia: { kind: 'placeholder' },
      styleScores: {},
      overview: 'Shape-test overview.',
      inclusions: [],
      exclusions: [],
      gallery: [],
      itineraryPreview: [],
    };
    expect(withoutGuide.guide).toBeUndefined();

    const withGuide: TripDetail = { ...withoutGuide, guide: { name: 'Example Guide' } };
    expect(withGuide.guide?.name).toBe('Example Guide');
    expect(withGuide.host.name).toBe('Shape-test Host');
  });

  it('TripImportantNote.category is optional and does not force every note into a bucket', () => {
    const categorised: TripImportantNote = {
      title: 'Example note',
      detail: 'Shape-test detail.',
      category: 'etiquette',
    };
    const uncategorised: TripImportantNote = {
      title: 'Example note',
      detail: 'Shape-test detail.',
    };

    expect(categorised.category).toBe('etiquette');
    expect(uncategorised.category).toBeUndefined();
  });
});
