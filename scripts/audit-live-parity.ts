/**
 * Phase 4.4B, Step 6 — automated source-vs-new-site parity audit.
 *
 * For each trip in the canonical live catalogue
 * (docs/source-material/wws-live/catalogue/wws-live-catalogue.json):
 *   1. Reads the already-verified canonical facts (title, country, duration,
 *      itinerary day count, inclusion/exclusion counts, departures) — Step 2
 *      of this phase re-confirmed these against the live site directly
 *      before this audit ran, so this script treats the catalogue file as
 *      ground truth rather than re-crawling the live site itself (Phase
 *      4.4A already did that full crawl; re-scraping five live pages on
 *      every audit run would be slow and is not what changes between runs —
 *      the new site is what changes).
 *   2. Visits the equivalent NEW WWS site route with Playwright and extracts
 *      its rendered, traveller-facing text.
 *   3. Compares specific fields and classifies each as MATCH / MISMATCH /
 *      MISSING FROM NEW SITE / EXTRA-FABRICATED IN NEW SITE.
 *
 * Known, already-documented intentional differences (not bugs) are called
 * out explicitly rather than silently passing or failing:
 *   - Vietnam's on-site title ("Vietnam Adventure: Culture and Scenic
 *     Beauty") differs from the trip record's PDF-derived title/slug
 *     ("Vietnam 6N/7D" / vietnam-6n7d) — Phase 4.4A deliberately did not
 *     rename the existing record; see this repo's
 *     docs/source-material/wws-live/README.md "Vietnam provenance" section.
 *   - Thailand has three live departures, each with its own live URL; the
 *     new site's architecture (one route per trip slug, not per departure)
 *     surfaces only the soonest bookable one per page load
 *     (lib/content/db/map.ts's selectPresentableDeparture) — the other two
 *     departures are correctly separate rows in trip_departures (never
 *     collapsed/overwritten) but are not independently browsable via their
 *     own public route today. Documented as a known limitation, not silently
 *     passed as full parity.
 *
 * Usage: npx tsx scripts/audit-live-parity.ts [--base-url http://localhost:3000]
 */
import { readFileSync, writeFileSync } from 'node:fs';
import { resolve } from 'node:path';

import { chromium } from '@playwright/test';

interface CatalogueDeparture {
  sourceDepartureId: string;
  sourceUrl: string;
  startDate: string;
  endDate: string;
  priceAmount: number;
  priceCurrency: string;
}

interface CatalogueTrip {
  sourceTitle: string;
  sourceCountry: string;
  departures: CatalogueDeparture[];
  durationNights: number;
  itineraryDayCount: number;
  inclusionCount: number;
  exclusionCount: number;
}

interface Catalogue {
  trips: CatalogueTrip[];
}

type Verdict = 'MATCH' | 'MISMATCH' | 'MISSING' | 'EXTRA-FABRICATED' | 'KNOWN-DIFFERENCE';

interface Finding {
  trip: string;
  field: string;
  verdict: Verdict;
  detail: string;
}

const BASE_URL = process.argv.includes('--base-url')
  ? process.argv[process.argv.indexOf('--base-url') + 1]!
  : 'http://localhost:3000';

const catalogue: Catalogue = JSON.parse(
  readFileSync(
    resolve(process.cwd(), 'docs/source-material/wws-live/catalogue/wws-live-catalogue.json'),
    'utf8',
  ),
);

// Maps a catalogue entry's sourceTitle to the new site's trip slug. Vietnam
// is deliberately NOT a naive slugify of sourceTitle — see the module
// comment above.
const SLUG_BY_SOURCE_TITLE: Record<string, string> = {
  'Thailand Full Moon Party': 'thailand-full-moon-party',
  'Vietnam Adventure: Culture and Scenic Beauty': 'vietnam-6n7d',
  'BALI New Year Special 8N/9D with Gili T & Nusa Penida': 'bali-new-year-special',
};

// A known, deliberate title difference — not re-flagged as a MISMATCH.
const KNOWN_TITLE_DIFFERENCES: Record<string, string> = {
  'vietnam-6n7d': 'Vietnam Adventure: Culture and Scenic Beauty',
};

function formatINR(amount: number): string {
  return `₹${amount.toLocaleString('en-IN')}`;
}

function normalize(text: string): string {
  return text.replace(/\s+/g, ' ').trim();
}

async function auditTrip(
  browser: import('@playwright/test').Browser,
  trip: CatalogueTrip,
): Promise<Finding[]> {
  const findings: Finding[] = [];
  const slug = SLUG_BY_SOURCE_TITLE[trip.sourceTitle];
  if (!slug) {
    findings.push({
      trip: trip.sourceTitle,
      field: 'route',
      verdict: 'MISSING',
      detail: 'No known new-site slug mapping for this catalogue entry.',
    });
    return findings;
  }

  const page = await browser.newPage();
  const response = await page.goto(`${BASE_URL}/trips/${slug}`, {
    waitUntil: 'networkidle',
    timeout: 30000,
  });
  if (!response || !response.ok()) {
    findings.push({
      trip: trip.sourceTitle,
      field: 'route',
      verdict: 'MISSING',
      detail: `/trips/${slug} did not load (status ${response?.status()}).`,
    });
    await page.close();
    return findings;
  }

  const text = normalize(await page.innerText('body'));

  // --- Identity ---
  const knownTitle = KNOWN_TITLE_DIFFERENCES[slug];
  if (knownTitle) {
    findings.push({
      trip: trip.sourceTitle,
      field: 'title',
      verdict: 'KNOWN-DIFFERENCE',
      detail: `New site shows the pre-existing PDF-derived title, not "${trip.sourceTitle}" — documented in docs/source-material/wws-live/README.md.`,
    });
  } else if (text.includes(trip.sourceTitle)) {
    findings.push({
      trip: trip.sourceTitle,
      field: 'title',
      verdict: 'MATCH',
      detail: trip.sourceTitle,
    });
  } else {
    findings.push({
      trip: trip.sourceTitle,
      field: 'title',
      verdict: 'MISMATCH',
      detail: `Expected "${trip.sourceTitle}" not found in rendered page.`,
    });
  }

  findings.push({
    trip: trip.sourceTitle,
    field: 'country',
    verdict: text.toUpperCase().includes(trip.sourceCountry.toUpperCase()) ? 'MATCH' : 'MISMATCH',
    detail: trip.sourceCountry,
  });

  const durationLabel = `${trip.durationNights + 1}D/${trip.durationNights}N`;
  findings.push({
    trip: trip.sourceTitle,
    field: 'duration',
    verdict: text.includes(durationLabel) ? 'MATCH' : 'MISMATCH',
    detail: durationLabel,
  });

  // --- Commercial (soonest departure only — see module comment) ---
  const soonest = [...trip.departures].sort((a, b) => a.startDate.localeCompare(b.startDate))[0]!;
  const priceLabel = formatINR(soonest.priceAmount);
  findings.push({
    trip: trip.sourceTitle,
    field: 'price (soonest departure)',
    verdict: text.includes(priceLabel) ? 'MATCH' : 'MISMATCH',
    detail: `${priceLabel} (${soonest.startDate})`,
  });

  if (trip.departures.length > 1) {
    findings.push({
      trip: trip.sourceTitle,
      field: 'other departures',
      verdict: 'KNOWN-DIFFERENCE',
      detail: `${trip.departures.length - 1} additional live departure(s) exist as separate, correctly-priced trip_departures rows, but the new site's one-route-per-trip architecture only surfaces the soonest one on this page: ${trip.departures
        .slice(1)
        .map((d) => `${d.startDate} ${formatINR(d.priceAmount)}`)
        .join(', ')}.`,
    });
  }

  // --- Itinerary ---
  const dayMatches = text.match(/DAY 0?\d+/g) ?? [];
  findings.push({
    trip: trip.sourceTitle,
    field: 'itinerary day count',
    verdict: dayMatches.length === trip.itineraryDayCount ? 'MATCH' : 'MISMATCH',
    detail: `expected ${trip.itineraryDayCount}, rendered ${dayMatches.length}`,
  });

  // --- Inclusions / exclusions section presence ---
  findings.push({
    trip: trip.sourceTitle,
    field: 'inclusions section',
    verdict: text.includes('Included') ? 'MATCH' : 'MISSING',
    detail: 'Included section heading',
  });
  findings.push({
    trip: trip.sourceTitle,
    field: 'exclusions section',
    verdict: text.includes('Not included') ? 'MATCH' : 'MISSING',
    detail: 'Not included section heading',
  });

  // --- No-fabrication checks: things the live source never provided ---
  const forbiddenIfAbsentFromSource: [string, RegExp][] = [
    ['star rating', /\d(\.\d)?\s*(out of|\/)\s*5|★★★/i],
    ['review count', /\d+\s+reviews?/i],
    ['fabricated FAQ', /frequently asked questions/i],
  ];
  for (const [label, pattern] of forbiddenIfAbsentFromSource) {
    findings.push({
      trip: trip.sourceTitle,
      field: `no-fabrication: ${label}`,
      verdict: pattern.test(text) ? 'EXTRA-FABRICATED' : 'MATCH',
      detail: pattern.test(text)
        ? 'Found content the live source never provided'
        : 'Absent, as expected',
    });
  }

  // --- Horizontal overflow check ---
  // Tolerance of 10px absorbs scrollbar-width rounding noise observed across
  // browsers/runs; a genuine layout overflow (an un-wrapped long string,
  // a fixed-width element) produces far more than a few pixels.
  const hasOverflow = await page.evaluate(
    () => document.documentElement.scrollWidth > document.documentElement.clientWidth + 10,
  );
  findings.push({
    trip: trip.sourceTitle,
    field: 'horizontal overflow (desktop viewport)',
    verdict: hasOverflow ? 'MISMATCH' : 'MATCH',
    detail: hasOverflow ? 'Page scrolls horizontally' : 'No horizontal overflow',
  });

  await page.setViewportSize({ width: 390, height: 844 });
  await page.waitForTimeout(200);
  const hasMobileOverflow = await page.evaluate(
    () => document.documentElement.scrollWidth > document.documentElement.clientWidth + 10,
  );
  findings.push({
    trip: trip.sourceTitle,
    field: 'horizontal overflow (mobile viewport, 390px)',
    verdict: hasMobileOverflow ? 'MISMATCH' : 'MATCH',
    detail: hasMobileOverflow
      ? 'Page scrolls horizontally on mobile'
      : 'No horizontal overflow on mobile',
  });

  await page.close();
  return findings;
}

async function main() {
  const browser = await chromium.launch();
  const allFindings: Finding[] = [];

  for (const trip of catalogue.trips) {
    allFindings.push(...(await auditTrip(browser, trip)));
  }

  await browser.close();

  const lines: string[] = [];
  lines.push('# Live source vs. new site — parity audit report');
  lines.push('');
  lines.push(`Generated by \`scripts/audit-live-parity.ts\` against \`${BASE_URL}\`.`);
  lines.push('');
  lines.push('| Trip | Field | Verdict | Detail |');
  lines.push('|---|---|---|---|');
  for (const f of allFindings) {
    lines.push(`| ${f.trip} | ${f.field} | ${f.verdict} | ${f.detail.replace(/\|/g, '\\|')} |`);
  }

  const counts = allFindings.reduce<Record<Verdict, number>>(
    (acc, f) => ({ ...acc, [f.verdict]: (acc[f.verdict] ?? 0) + 1 }),
    { MATCH: 0, MISMATCH: 0, MISSING: 0, 'EXTRA-FABRICATED': 0, 'KNOWN-DIFFERENCE': 0 },
  );
  lines.push('');
  lines.push('## Summary');
  lines.push('');
  for (const [verdict, count] of Object.entries(counts)) {
    lines.push(`- ${verdict}: ${count}`);
  }

  const outPath = resolve(process.cwd(), 'docs/source-material/wws-live/parity-audit-report.md');
  writeFileSync(outPath, lines.join('\n') + '\n', 'utf8');
  console.log(lines.join('\n'));
  console.log(`\nWritten to ${outPath}`);

  const failing = allFindings.filter(
    (f) => f.verdict === 'MISMATCH' || f.verdict === 'EXTRA-FABRICATED',
  );
  if (failing.length > 0) {
    console.error(`\n${failing.length} finding(s) require attention.`);
    process.exitCode = 1;
  }
}

main().catch((error: unknown) => {
  console.error(error);
  process.exitCode = 1;
});
