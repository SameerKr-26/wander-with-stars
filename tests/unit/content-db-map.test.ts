import { describe, expect, it } from 'vitest';

import {
  mapTripDetail,
  mapTripPreview,
  selectPresentableDeparture,
  selectPresentableDepartures,
} from '@/lib/content/db/map';
import type { GuideRow, HostRow, TripDepartureRow, TripDetailRow } from '@/lib/content/db/schema';

/**
 * Pure mapping tests for lib/content/db/map.ts — no Supabase, no database,
 * no React. Constructs normalized-schema rows by hand (the exact shape
 * lib/content/db/repository.ts's queries produce) and asserts the domain
 * objects `lib/content/queries.ts` hands to existing, unmodified UI
 * components come out correctly shaped.
 */

const HOST: HostRow = {
  id: 'host-1',
  name: 'Test Host',
  tagline: 'A host used only in tests',
  avatar_kind: null,
  avatar_src: null,
  avatar_alt: null,
  avatar_poster: null,
};

const GUIDE: GuideRow = {
  id: 'guide-1',
  name: 'Test Guide',
  tagline: null,
  avatar_kind: 'image',
  avatar_src: 'https://example.com/guide.jpg',
  avatar_alt: 'Test guide portrait',
  avatar_poster: null,
};

function makeDeparture(overrides: Partial<TripDepartureRow> = {}): TripDepartureRow {
  return {
    id: 'departure-1',
    departure_date: '2099-06-01',
    return_date: null,
    price_amount: 50000,
    price_currency: 'INR',
    capacity: 20,
    seats_reserved: 5,
    seats_confirmed: 5,
    status: 'booking_open',
    guides: null,
    trip_accommodation: [],
    trip_transport: [],
    trip_meeting_points: null,
    ...overrides,
  };
}

function makeTripDetailRow(overrides: Partial<TripDetailRow> = {}): TripDetailRow {
  return {
    id: 'trip-1',
    slug: 'test-trip',
    title: 'Test Trip',
    destination: 'Testland',
    country: 'Testland',
    duration_nights: 5,
    tagline: null,
    overview: 'A trip used only in tests.',
    style_scores: { adventure: 60 },
    hosts: HOST,
    trip_media: [],
    trip_departures: [],
    itinerary_days: [],
    trip_inclusions: [],
    trip_exclusions: [],
    trip_important_notes: [],
    trip_extras: [],
    trip_faqs: [],
    trip_policy_sections: [],
    ...overrides,
  };
}

describe('selectPresentableDeparture', () => {
  it('picks the earliest presentable departure', () => {
    const later = makeDeparture({ id: 'later', departure_date: '2099-08-01' });
    const sooner = makeDeparture({ id: 'sooner', departure_date: '2099-06-01' });
    expect(selectPresentableDeparture([later, sooner])?.id).toBe('sooner');
  });

  it('excludes draft departures', () => {
    const draft = makeDeparture({ status: 'draft' });
    expect(selectPresentableDeparture([draft])).toBeUndefined();
  });

  it('excludes published (announced-but-not-bookable), in_progress and completed departures', () => {
    const announced = makeDeparture({ status: 'published' });
    const inProgress = makeDeparture({ status: 'in_progress' });
    const completed = makeDeparture({ status: 'completed' });
    expect(selectPresentableDeparture([announced])).toBeUndefined();
    expect(selectPresentableDeparture([inProgress])).toBeUndefined();
    expect(selectPresentableDeparture([completed])).toBeUndefined();
  });

  it('includes booking_open, almost_full and sold_out departures', () => {
    for (const status of ['booking_open', 'almost_full', 'sold_out'] as const) {
      expect(selectPresentableDeparture([makeDeparture({ status })])).toBeDefined();
    }
  });

  it('returns undefined for an empty list', () => {
    expect(selectPresentableDeparture([])).toBeUndefined();
  });
});

describe('mapTripPreview', () => {
  it('maps trip + departure fields into a TripPreview', () => {
    const trip = makeTripDetailRow();
    const departure = makeDeparture({ status: 'almost_full' });
    const preview = mapTripPreview(trip, departure);

    expect(preview.slug).toBe('test-trip');
    expect(preview.departureDate).toBe('2099-06-01');
    expect(preview.price).toEqual({ amount: 50000, currency: 'INR' });
    expect(preview.availability.status).toBe('almost-full');
    expect(preview.host?.name).toBe('Test Host');
  });

  it('computes spotsLeft from capacity minus seats_reserved', () => {
    const preview = mapTripPreview(
      makeTripDetailRow(),
      makeDeparture({ capacity: 20, seats_reserved: 17 }),
    );
    expect(preview.availability.spotsLeft).toBe(3);
  });

  it('omits spotsLeft when capacity is unknown', () => {
    const preview = mapTripPreview(makeTripDetailRow(), makeDeparture({ capacity: null }));
    expect(preview.availability.spotsLeft).toBeUndefined();
  });

  it('picks the media row flagged is_hero for heroMedia', () => {
    const trip = makeTripDetailRow({
      trip_media: [
        {
          id: 'm1',
          kind: 'image',
          src: 'https://example.com/a.jpg',
          alt: 'A',
          poster: null,
          focal_point: null,
          is_hero: false,
          display_order: 0,
        },
        {
          id: 'm2',
          kind: 'image',
          src: 'https://example.com/hero.jpg',
          alt: 'Hero',
          poster: null,
          focal_point: 'top',
          is_hero: true,
          display_order: 1,
        },
      ],
    });
    const preview = mapTripPreview(trip, makeDeparture());
    expect(preview.heroMedia).toEqual({
      kind: 'image',
      src: 'https://example.com/hero.jpg',
      alt: 'Hero',
      focalPoint: 'top',
    });
  });

  it('falls back to a placeholder heroMedia when no media row is flagged hero', () => {
    const preview = mapTripPreview(makeTripDetailRow({ trip_media: [] }), makeDeparture());
    expect(preview.heroMedia).toEqual({ kind: 'placeholder' });
  });

  it('throws rather than mapping a non-presentable departure', () => {
    expect(() => mapTripPreview(makeTripDetailRow(), makeDeparture({ status: 'draft' }))).toThrow();
  });

  it('throws rather than mapping a departure with no price', () => {
    expect(() =>
      mapTripPreview(makeTripDetailRow(), makeDeparture({ price_amount: null })),
    ).toThrow();
  });

  it('Phase 4.4B: omits host (does not throw or fabricate one) when a trip has no host on record', () => {
    const preview = mapTripPreview(makeTripDetailRow({ hosts: null }), makeDeparture());
    expect(preview.host).toBeUndefined();
  });
});

describe('mapTripDetail', () => {
  it('maps itinerary days sorted by day_number regardless of row order', () => {
    const trip = makeTripDetailRow({
      itinerary_days: [
        { day_number: 2, title: 'Day two', summary: 'Second' },
        { day_number: 1, title: 'Day one', summary: 'First' },
      ],
    });
    const detail = mapTripDetail(trip, makeDeparture());
    expect(detail.itineraryPreview.map((d) => d.day)).toEqual([1, 2]);
    expect(detail.itineraryPreview[0]).toEqual({ day: 1, title: 'Day one', summary: 'First' });
  });

  it('maps inclusions and exclusions as ordered label lists', () => {
    const trip = makeTripDetailRow({
      trip_inclusions: [
        { label: 'Second', display_order: 1 },
        { label: 'First', display_order: 0 },
      ],
      trip_exclusions: [{ label: 'Only exclusion', display_order: 0 }],
    });
    const detail = mapTripDetail(trip, makeDeparture());
    expect(detail.inclusions).toEqual(['First', 'Second']);
    expect(detail.exclusions).toEqual(['Only exclusion']);
  });

  it('leaves optional sections undefined, never a fake placeholder, when the source has no rows', () => {
    const detail = mapTripDetail(makeTripDetailRow(), makeDeparture());
    expect(detail.accommodation).toBeUndefined();
    expect(detail.transport).toBeUndefined();
    expect(detail.meetingPoint).toBeUndefined();
    expect(detail.importantNotes).toBeUndefined();
    expect(detail.faqs).toBeUndefined();
    expect(detail.policy).toBeUndefined();
    expect(detail.extras).toBeUndefined();
    expect(detail.guide).toBeUndefined();
  });

  it('maps departure-scoped accommodation, transport and meeting point when present', () => {
    const departure = makeDeparture({
      trip_accommodation: [{ name: 'Test Hotel', type: 'Boutique', description: null, nights: 2 }],
      trip_transport: [{ mode: 'Flight', description: 'A to B', display_order: 0 }],
      trip_meeting_points: {
        location: 'Lobby',
        meeting_time: '9:00 AM',
        instructions: 'Bring your passport',
      },
      guides: GUIDE,
    });
    const detail = mapTripDetail(makeTripDetailRow(), departure);

    expect(detail.accommodation).toEqual([{ name: 'Test Hotel', type: 'Boutique', nights: 2 }]);
    expect(detail.transport).toEqual([{ mode: 'Flight', description: 'A to B' }]);
    expect(detail.meetingPoint).toEqual({
      location: 'Lobby',
      time: '9:00 AM',
      instructions: 'Bring your passport',
    });
    expect(detail.guide).toEqual({
      name: 'Test Guide',
      avatar: {
        kind: 'image',
        src: 'https://example.com/guide.jpg',
        alt: 'Test guide portrait',
      },
    });
  });

  it('maps FAQs in display order', () => {
    const trip = makeTripDetailRow({
      trip_faqs: [
        { question: 'Second?', answer: 'B', display_order: 1 },
        { question: 'First?', answer: 'A', display_order: 0 },
      ],
    });
    const detail = mapTripDetail(trip, makeDeparture());
    expect(detail.faqs).toEqual([
      { question: 'First?', answer: 'A' },
      { question: 'Second?', answer: 'B' },
    ]);
  });

  it('maps named policy sections into their TripPolicy slots, and additional sections into an array', () => {
    const trip = makeTripDetailRow({
      trip_policy_sections: [
        {
          kind: 'cancellation',
          title: 'Cancellation',
          body: 'Cancel up to 30 days.',
          display_order: 0,
        },
        { kind: 'refund', title: 'Refund', body: 'Refunds within 14 days.', display_order: 1 },
        {
          kind: 'additional',
          title: 'Altitude waiver',
          body: 'Sign before departure.',
          display_order: 2,
        },
      ],
    });
    const detail = mapTripDetail(trip, makeDeparture());
    expect(detail.policy?.cancellation).toEqual({
      title: 'Cancellation',
      body: 'Cancel up to 30 days.',
    });
    expect(detail.policy?.refund).toEqual({ title: 'Refund', body: 'Refunds within 14 days.' });
    expect(detail.policy?.paymentTerms).toBeUndefined();
    expect(detail.policy?.additionalTerms).toEqual([
      { title: 'Altitude waiver', body: 'Sign before departure.' },
    ]);
  });

  it('maps extras only with a price when both amount and currency are present', () => {
    const trip = makeTripDetailRow({
      trip_extras: [
        {
          name: 'Priced extra',
          price_amount: 500,
          price_currency: 'INR',
          description: null,
          display_order: 0,
        },
        {
          name: 'Unpriced extra',
          price_amount: null,
          price_currency: null,
          description: null,
          display_order: 1,
        },
      ],
    });
    const detail = mapTripDetail(trip, makeDeparture());
    expect(detail.extras).toEqual([
      { name: 'Priced extra', price: { amount: 500, currency: 'INR' } },
      { name: 'Unpriced extra' },
    ]);
  });

  it('maps important notes with and without a category', () => {
    const trip = makeTripDetailRow({
      trip_important_notes: [
        { title: 'Weather', detail: 'Pack layers.', category: 'weather', display_order: 0 },
        { title: 'General', detail: 'Be on time.', category: null, display_order: 1 },
      ],
    });
    const detail = mapTripDetail(trip, makeDeparture());
    expect(detail.importantNotes).toEqual([
      { title: 'Weather', detail: 'Pack layers.', category: 'weather' },
      { title: 'General', detail: 'Be on time.' },
    ]);
  });
});

describe('Phase 4.4C — multi-departure selection', () => {
  const THAILAND_STYLE_DEPARTURES: TripDepartureRow[] = [
    makeDeparture({
      id: 'dep-oct',
      departure_date: '2026-10-25',
      return_date: '2026-10-31',
      price_amount: 49999,
    }),
    makeDeparture({
      id: 'dep-nov',
      departure_date: '2026-11-22',
      return_date: '2026-11-28',
      price_amount: 59999,
    }),
    makeDeparture({
      id: 'dep-dec',
      departure_date: '2026-12-22',
      return_date: '2026-12-28',
      price_amount: 64999,
    }),
  ];

  it('1. a multi-departure trip exposes every public departure, not just the presentable one', () => {
    const trip = makeTripDetailRow();
    const detail = mapTripDetail(trip, THAILAND_STYLE_DEPARTURES[0]!, THAILAND_STYLE_DEPARTURES);
    expect(detail.departures).toHaveLength(3);
  });

  it('2. an unpublished (draft) departure never appears among the public options', () => {
    const withADraft = [
      ...THAILAND_STYLE_DEPARTURES,
      makeDeparture({ id: 'dep-draft', departure_date: '2027-01-15', status: 'draft' }),
    ];
    const all = selectPresentableDepartures(withADraft);
    expect(all).toHaveLength(3);
    expect(all.some((d) => d.id === 'dep-draft')).toBe(false);
  });

  it("3. every departure date stays paired with its OWN price, never another departure's", () => {
    const trip = makeTripDetailRow();
    const detail = mapTripDetail(trip, THAILAND_STYLE_DEPARTURES[0]!, THAILAND_STYLE_DEPARTURES);
    const byDate = Object.fromEntries(
      detail.departures!.map((d) => [d.departureDate, d.price.amount]),
    );
    expect(byDate['2026-10-25']).toBe(49999);
    expect(byDate['2026-11-22']).toBe(59999);
    expect(byDate['2026-12-22']).toBe(64999);
  });

  it('4. departure ordering is deterministic — always soonest first, regardless of input order', () => {
    const shuffled = [
      THAILAND_STYLE_DEPARTURES[2]!,
      THAILAND_STYLE_DEPARTURES[0]!,
      THAILAND_STYLE_DEPARTURES[1]!,
    ];
    const ordered = selectPresentableDepartures(shuffled);
    expect(ordered.map((d) => d.departure_date)).toEqual([
      '2026-10-25',
      '2026-11-22',
      '2026-12-22',
    ]);
  });

  it('5. the default/presentable selection is still the earliest upcoming departure', () => {
    const shuffled = [
      THAILAND_STYLE_DEPARTURES[1]!,
      THAILAND_STYLE_DEPARTURES[2]!,
      THAILAND_STYLE_DEPARTURES[0]!,
    ];
    expect(selectPresentableDeparture(shuffled)?.departure_date).toBe('2026-10-25');
  });

  it('6. alternate departures remain accessible on the mapped detail, each with its own id/price/date', () => {
    const trip = makeTripDetailRow();
    const detail = mapTripDetail(trip, THAILAND_STYLE_DEPARTURES[0]!, THAILAND_STYLE_DEPARTURES);
    expect(detail.departures).toEqual([
      {
        id: 'dep-oct',
        departureDate: '2026-10-25',
        returnDate: '2026-10-31',
        price: { amount: 49999, currency: 'INR' },
        availability: { status: 'open', spotsLeft: 15 },
      },
      {
        id: 'dep-nov',
        departureDate: '2026-11-22',
        returnDate: '2026-11-28',
        price: { amount: 59999, currency: 'INR' },
        availability: { status: 'open', spotsLeft: 15 },
      },
      {
        id: 'dep-dec',
        departureDate: '2026-12-22',
        returnDate: '2026-12-28',
        price: { amount: 64999, currency: 'INR' },
        availability: { status: 'open', spotsLeft: 15 },
      },
    ]);
  });

  it('8. trip-level content (itinerary, inclusions) is not duplicated per departure', () => {
    const trip = makeTripDetailRow({
      itinerary_days: [{ day_number: 1, title: 'Day one', summary: 'Arrival' }],
    });
    const detail = mapTripDetail(trip, THAILAND_STYLE_DEPARTURES[0]!, THAILAND_STYLE_DEPARTURES);
    // One itinerary on the trip record, shared by every departure — never
    // one copy per departure.
    expect(detail.itineraryPreview).toHaveLength(1);
    expect(detail.departures).toHaveLength(3);
  });

  it('12. a trip with more than one presentable departure reports how many additional ones exist, for the card', () => {
    const trip = makeTripDetailRow();
    const preview = mapTripPreview(trip, THAILAND_STYLE_DEPARTURES[0]!, THAILAND_STYLE_DEPARTURES);
    expect(preview.additionalDeparturesCount).toBe(2);
  });

  it('a single-departure trip reports no additionalDeparturesCount at all (not 0)', () => {
    const trip = makeTripDetailRow();
    const preview = mapTripPreview(trip, makeDeparture());
    expect(preview.additionalDeparturesCount).toBeUndefined();
  });

  it('a single-departure TripDetail carries no departures array — getDepartureOptions() derives one instead', () => {
    const trip = makeTripDetailRow();
    const detail = mapTripDetail(trip, makeDeparture());
    expect(detail.departures).toBeUndefined();
  });
});
