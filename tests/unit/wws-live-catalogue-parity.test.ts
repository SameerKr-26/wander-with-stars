import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

import { describe, expect, it } from 'vitest';

import { BALI_NEW_YEAR_SPECIAL_RAW } from '@/lib/content/ingest/sources/bali-new-year-special';
import { THAILAND_FULL_MOON_PARTY_RAW } from '@/lib/content/ingest/sources/thailand-full-moon-party';
import { VIETNAM_WWS_7D6N_RAW } from '@/lib/content/ingest/sources/vietnam-wws-7d6n';
import { DEV_UPCOMING_TRIPS } from '@/lib/content/fixtures';

/**
 * Content-parity tests — Phase 4.4A.
 *
 * Asserts the ingestion source files in lib/content/ingest/sources/ match
 * docs/source-material/wws-live/catalogue/wws-live-catalogue.json, the
 * canonical structured capture of the live WWS website. No network access,
 * no database — pure comparison against the committed capture, so this
 * stays fast and fails loudly the moment either drifts from the other.
 */

interface CatalogueDeparture {
  sourceDepartureId: string;
  sourceUrl: string;
  startDate: string;
  endDate: string;
  priceAmount: number;
  priceCurrency: string;
}

interface CatalogueTrip {
  packageItineraryId: string;
  sourceTitle: string;
  sourceCountry: string;
  maxGroupSize: number;
  departures: CatalogueDeparture[];
  durationDays: number;
  durationNights: number;
  itineraryDayCount: number;
  inclusionCount: number;
  exclusionCount: number;
}

interface Catalogue {
  trips: CatalogueTrip[];
}

const catalogue: Catalogue = JSON.parse(
  readFileSync(
    resolve(process.cwd(), 'docs/source-material/wws-live/catalogue/wws-live-catalogue.json'),
    'utf8',
  ),
);

function findTrip(sourceTitle: string): CatalogueTrip {
  const trip = catalogue.trips.find((t) => t.sourceTitle === sourceTitle);
  if (!trip) throw new Error(`Catalogue fixture is missing an entry for "${sourceTitle}"`);
  return trip;
}

// Type assertion helper: RawTripInput fields are `unknown`; these tests
// know the concrete shape each ingestion source actually populates.
function asRecord(raw: unknown): Record<string, unknown> {
  return raw as Record<string, unknown>;
}

describe('Thailand Full Moon Party — live catalogue parity', () => {
  const catalogueTrip = findTrip('Thailand Full Moon Party');
  const raw = asRecord(THAILAND_FULL_MOON_PARTY_RAW);

  it('title matches the live source exactly', () => {
    expect(raw.title).toBe(catalogueTrip.sourceTitle);
  });

  it('country matches the live source', () => {
    expect(raw.country).toBe(catalogueTrip.sourceCountry);
  });

  it('duration (nights) matches the live source', () => {
    expect(raw.durationNights).toBe(catalogueTrip.durationNights);
  });

  it('itinerary day count matches the live source, days in order 1..N', () => {
    const itinerary = raw.itineraryPreview as { day: number }[];
    expect(itinerary).toHaveLength(catalogueTrip.itineraryDayCount);
    expect(itinerary.map((d) => d.day)).toEqual(
      Array.from({ length: catalogueTrip.itineraryDayCount }, (_, i) => i + 1),
    );
  });

  it('inclusion count matches the live source', () => {
    expect((raw.inclusions as string[]).length).toBe(catalogueTrip.inclusionCount);
  });

  it('exclusion count matches the live source', () => {
    expect((raw.exclusions as string[]).length).toBe(catalogueTrip.exclusionCount);
  });

  it('has exactly the three departure variants captured, each with its own date and price', () => {
    expect(catalogueTrip.departures).toHaveLength(3);
    const prices = catalogueTrip.departures.map((d) => d.priceAmount).sort((a, b) => a - b);
    expect(prices).toEqual([49999, 59999, 64999]);
    // Every departure independently priced/dated — never collapsed to one.
    const dates = new Set(catalogueTrip.departures.map((d) => d.startDate));
    expect(dates.size).toBe(3);
  });

  it('does not fabricate optional sections the source never provided', () => {
    expect(raw.importantNotes).toBeUndefined();
    expect(raw.host).toBeUndefined();
    expect(raw.guide).toBeUndefined();
    expect(raw.policy).toBeUndefined();
    expect(raw.faqs).toBeUndefined();
  });
});

describe('BALI New Year Special — live catalogue parity', () => {
  const catalogueTrip = findTrip('BALI New Year Special 8N/9D with Gili T & Nusa Penida');
  const raw = asRecord(BALI_NEW_YEAR_SPECIAL_RAW);

  it('title matches the live source exactly', () => {
    expect(raw.title).toBe(catalogueTrip.sourceTitle);
  });

  it('country matches the live source', () => {
    expect(raw.country).toBe(catalogueTrip.sourceCountry);
  });

  it('duration (nights) matches the live source', () => {
    expect(raw.durationNights).toBe(catalogueTrip.durationNights);
  });

  it('itinerary day count matches the live source, days in order 1..N', () => {
    const itinerary = raw.itineraryPreview as { day: number }[];
    expect(itinerary).toHaveLength(catalogueTrip.itineraryDayCount);
    expect(itinerary.map((d) => d.day)).toEqual(
      Array.from({ length: catalogueTrip.itineraryDayCount }, (_, i) => i + 1),
    );
  });

  it('inclusion count matches the live source', () => {
    expect((raw.inclusions as string[]).length).toBe(catalogueTrip.inclusionCount);
  });

  it('exclusion count matches the live source', () => {
    expect((raw.exclusions as string[]).length).toBe(catalogueTrip.exclusionCount);
  });

  it('has exactly one departure, matching the live source', () => {
    expect(catalogueTrip.departures).toHaveLength(1);
    expect(catalogueTrip.departures[0]?.priceAmount).toBe(68999);
    expect(catalogueTrip.departures[0]?.startDate).toBe('2026-12-26');
    expect(catalogueTrip.departures[0]?.endDate).toBe('2027-01-03');
  });

  it('does not fabricate optional sections the source never provided', () => {
    expect(raw.importantNotes).toBeUndefined();
    expect(raw.host).toBeUndefined();
    expect(raw.guide).toBeUndefined();
    expect(raw.policy).toBeUndefined();
    expect(raw.faqs).toBeUndefined();
  });
});

describe('Vietnam Adventure — cross-verification against the live source', () => {
  // Content unchanged from Phase 3.7 (see that source file's own header) —
  // this only confirms the already-committed PDF capture still agrees with
  // the independently-observed live site, not a new ingestion.
  const catalogueTrip = findTrip('Vietnam Adventure: Culture and Scenic Beauty');
  const raw = asRecord(VIETNAM_WWS_7D6N_RAW);

  it('itinerary day count matches the live source', () => {
    expect((raw.itineraryPreview as unknown[]).length).toBe(catalogueTrip.itineraryDayCount);
  });

  it("inclusion count matches the live source (excluding the source page's own sub-heading line)", () => {
    expect((raw.inclusions as string[]).length).toBe(catalogueTrip.inclusionCount);
  });

  it('exclusion count is one less than the live source — a real, documented drift, not a bug', () => {
    // The PDF-sourced list (Phase 3.7) has no "5% GST and 2% TCS" line;
    // the live site does. A genuine difference between the two sources
    // (the live site likely added mandatory tax disclosure after the PDF
    // was produced), not a transcription error — recorded here rather
    // than silently asserting false equality. Not touched (see this file's
    // own header): Vietnam's committed content stays exactly as Phase 3.7
    // ingested it.
    expect((raw.exclusions as string[]).length).toBe(catalogueTrip.exclusionCount - 1);
    expect(raw.exclusions).not.toContain('5% GST and 2% TCS');
  });

  it('has exactly one departure captured, now with real commercial facts', () => {
    expect(catalogueTrip.departures).toHaveLength(1);
    expect(catalogueTrip.departures[0]?.priceAmount).toBe(64999);
    expect(catalogueTrip.departures[0]?.startDate).toBe('2026-11-13');
  });

  it('remains a draft-only record — never republished with fabricated commercial fields', () => {
    expect(raw.price).toBeUndefined();
    expect(raw.departureDate).toBeUndefined();
    expect(raw.availability).toBeUndefined();
    expect(raw.host).toBeUndefined();
  });
});

describe('catalogue-wide integrity', () => {
  it('discovered exactly three distinct trips', () => {
    expect(catalogue.trips).toHaveLength(3);
  });

  it('discovered exactly five departure variants across the catalogue', () => {
    const total = catalogue.trips.reduce((sum, t) => sum + t.departures.length, 0);
    expect(total).toBe(5);
  });

  it('every departure has a distinct source id — no departure was overwritten by another', () => {
    const ids = catalogue.trips.flatMap((t) => t.departures.map((d) => d.sourceDepartureId));
    expect(new Set(ids).size).toBe(ids.length);
  });

  it('the Georgia/Tbilisi sample is no longer part of the public sample catalogue', () => {
    const titles = DEV_UPCOMING_TRIPS.map((t) => t.title);
    const destinations = DEV_UPCOMING_TRIPS.map((t) => t.destination);
    expect(titles.some((t) => /georgia/i.test(t))).toBe(false);
    expect(destinations.some((d) => /tbilisi/i.test(d))).toBe(false);
  });
});
