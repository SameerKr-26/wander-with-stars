/**
 * Seeds the real, live-WWS-sourced catalogue captured in Phase 4.4A —
 * Thailand Full Moon Party and BALI New Year Special (content +
 * departures), plus a real departure row for the existing Vietnam trip
 * (content unchanged, seeded separately by scripts/seed-vietnam-draft.ts).
 *
 * Every trip stays `content_status: 'draft'` and every departure stays
 * `status: 'draft'` — this script performs automated content capture, not
 * a human editorial review/approval, so publishing is deliberately left to
 * that separate, future step (Phase 4.3's admin workflow) rather than
 * assumed here. See docs/source-material/wws-live/README.md and the
 * Phase 4.4A report for the full reasoning.
 *
 * Departures are inserted directly against `trip_departures`, not through
 * the content-ingestion schema — see
 * lib/content/ingest/sources/thailand-full-moon-party.ts's header for why
 * (that schema has no way to represent more than one departure per trip;
 * `trip_departures` already does, by design, since Phase 4.1).
 *
 * Idempotent: re-running replaces each trip's content/departures rather
 * than duplicating them, the same as scripts/seed-vietnam-draft.ts.
 *
 * Usage (requires a reachable Supabase project and its service-role key —
 * see .env.local; run scripts/seed-vietnam-draft.ts FIRST if the Vietnam
 * trip row does not already exist):
 *
 *   npx tsx scripts/seed-live-catalogue.ts
 */
import { existsSync, readFileSync } from 'node:fs';
import { resolve } from 'node:path';

import { createClient } from '@supabase/supabase-js';

import { BALI_NEW_YEAR_SPECIAL_RECORD } from '../lib/content/ingest/sources/bali-new-year-special';
import { THAILAND_FULL_MOON_PARTY_RECORD } from '../lib/content/ingest/sources/thailand-full-moon-party';
import type { DraftTripDetail } from '../lib/content/ingest/types';
import type { ContentRecord } from '../lib/content/ingest/types';

function loadDotEnvLocal(): void {
  const path = resolve(process.cwd(), '.env.local');
  if (!existsSync(path)) return;

  for (const line of readFileSync(path, 'utf8').split('\n')) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#')) continue;
    const eq = trimmed.indexOf('=');
    if (eq === -1) continue;
    const key = trimmed.slice(0, eq).trim();
    let value = trimmed.slice(eq + 1).trim();
    if (
      (value.startsWith('"') && value.endsWith('"')) ||
      (value.startsWith("'") && value.endsWith("'"))
    ) {
      value = value.slice(1, -1);
    }
    if (process.env[key] === undefined) process.env[key] = value;
  }
}

loadDotEnvLocal();

// See scripts/seed-vietnam-draft.ts's own comment on why this doesn't
// import lib/supabase/admin.ts (`server-only` throws outside Next's build).
function createStandaloneAdminClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !serviceRoleKey) {
    throw new Error(
      'NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY are required (see .env.local).',
    );
  }
  return createClient(url, serviceRoleKey, {
    auth: { autoRefreshToken: false, persistSession: false, detectSessionInUrl: false },
  });
}

type SupabaseLike = ReturnType<typeof createStandaloneAdminClient>;

interface DepartureSeed {
  departure_date: string;
  return_date: string | null;
  price_amount: number;
  price_currency: string;
}

async function seedTripContent(
  supabase: SupabaseLike,
  record: ContentRecord<DraftTripDetail>,
  sourceReference: string,
): Promise<string> {
  const draft = record.data;

  console.log(`Seeding trip "${draft.slug}" as content_status: draft…`);

  const { data: trip, error: tripError } = await supabase
    .from('trips')
    .upsert(
      {
        slug: draft.slug,
        title: draft.title,
        destination: draft.destination,
        country: draft.country,
        duration_nights: draft.durationNights,
        overview: draft.overview,
        style_scores: draft.styleScores ?? {},
        content_status: 'draft',
        source_reference: sourceReference,
        review_notes: record.reviewNotes ?? null,
      },
      { onConflict: 'slug' },
    )
    .select('id')
    .single();
  if (tripError || !trip)
    throw new Error(`Failed to upsert trip "${draft.slug}": ${tripError?.message}`);
  const tripId = (trip as { id: string }).id;

  await Promise.all(
    ['itinerary_days', 'trip_media', 'trip_inclusions', 'trip_exclusions'].map((table) =>
      supabase.from(table).delete().eq('trip_id', tripId),
    ),
  );

  const { error: itineraryError } = await supabase.from('itinerary_days').insert(
    draft.itineraryPreview.map((day) => ({
      trip_id: tripId,
      day_number: day.day,
      title: day.title,
      summary: day.summary,
    })),
  );
  if (itineraryError) throw new Error(`Failed to insert itinerary_days: ${itineraryError.message}`);

  const { error: mediaError } = await supabase
    .from('trip_media')
    .insert({ trip_id: tripId, kind: 'placeholder', is_hero: true, display_order: 0 });
  if (mediaError) throw new Error(`Failed to insert trip_media: ${mediaError.message}`);

  const { error: inclusionsError } = await supabase
    .from('trip_inclusions')
    .insert(
      draft.inclusions.map((label, index) => ({ trip_id: tripId, label, display_order: index })),
    );
  if (inclusionsError)
    throw new Error(`Failed to insert trip_inclusions: ${inclusionsError.message}`);

  const { error: exclusionsError } = await supabase
    .from('trip_exclusions')
    .insert(
      draft.exclusions.map((label, index) => ({ trip_id: tripId, label, display_order: index })),
    );
  if (exclusionsError)
    throw new Error(`Failed to insert trip_exclusions: ${exclusionsError.message}`);

  console.log(`  Trip content seeded (id: ${tripId}).`);
  return tripId;
}

async function seedDepartures(
  supabase: SupabaseLike,
  tripId: string,
  departures: DepartureSeed[],
): Promise<void> {
  const { error: deleteError } = await supabase
    .from('trip_departures')
    .delete()
    .eq('trip_id', tripId);
  if (deleteError) throw new Error(`Failed to clear existing departures: ${deleteError.message}`);

  const { error: insertError } = await supabase.from('trip_departures').insert(
    departures.map((d) => ({
      trip_id: tripId,
      departure_date: d.departure_date,
      return_date: d.return_date,
      price_amount: d.price_amount,
      price_currency: d.price_currency,
      status: 'draft',
    })),
  );
  if (insertError) throw new Error(`Failed to insert departures: ${insertError.message}`);

  console.log(`  ${departures.length} departure(s) seeded (status: draft).`);
}

async function main() {
  if (!THAILAND_FULL_MOON_PARTY_RECORD) {
    throw new Error(
      'Thailand ingestion failed unexpectedly — see lib/content/ingest/sources/thailand-full-moon-party.ts.',
    );
  }
  if (!BALI_NEW_YEAR_SPECIAL_RECORD) {
    throw new Error(
      'Bali ingestion failed unexpectedly — see lib/content/ingest/sources/bali-new-year-special.ts.',
    );
  }

  const supabase = createStandaloneAdminClient();

  const thailandTripId = await seedTripContent(
    supabase,
    THAILAND_FULL_MOON_PARTY_RECORD,
    'https://wander-with-stars.fripo.in (Phase 4.4A live capture)',
  );
  await seedDepartures(supabase, thailandTripId, [
    {
      departure_date: '2026-10-25',
      return_date: '2026-10-31',
      price_amount: 49999,
      price_currency: 'INR',
    },
    {
      departure_date: '2026-11-22',
      return_date: '2026-11-28',
      price_amount: 59999,
      price_currency: 'INR',
    },
    {
      departure_date: '2026-12-22',
      return_date: '2026-12-28',
      price_amount: 64999,
      price_currency: 'INR',
    },
  ]);

  const baliTripId = await seedTripContent(
    supabase,
    BALI_NEW_YEAR_SPECIAL_RECORD,
    'https://wander-with-stars.fripo.in (Phase 4.4A live capture)',
  );
  await seedDepartures(supabase, baliTripId, [
    {
      departure_date: '2026-12-26',
      return_date: '2027-01-03',
      price_amount: 68999,
      price_currency: 'INR',
    },
  ]);

  // Vietnam's content is Phase 3.7's already-committed, already-tested PDF
  // capture — not touched here. Only its now-known real departure is added.
  const { data: vietnamTrip, error: vietnamLookupError } = await supabase
    .from('trips')
    .select('id')
    .eq('slug', 'vietnam-6n7d')
    .maybeSingle();
  if (vietnamLookupError)
    throw new Error(`Failed to look up Vietnam trip: ${vietnamLookupError.message}`);

  if (!vietnamTrip) {
    console.warn(
      'Vietnam trip (slug "vietnam-6n7d") not found — run scripts/seed-vietnam-draft.ts first ' +
        'to seed its content, then re-run this script to add its live-captured departure.',
    );
  } else {
    console.log("Seeding Vietnam's real departure (content already seeded separately)…");
    await seedDepartures(supabase, (vietnamTrip as { id: string }).id, [
      {
        departure_date: '2026-11-13',
        return_date: '2026-11-19',
        price_amount: 64999,
        price_currency: 'INR',
      },
    ]);
  }

  console.log('Done. All trips remain content_status: draft; all departures remain status: draft.');
}

main().catch((error: unknown) => {
  console.error(error);
  process.exitCode = 1;
});
