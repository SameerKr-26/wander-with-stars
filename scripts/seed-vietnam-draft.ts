/**
 * Seeds the real Vietnam draft trip content — `VIETNAM_WWS_7D6N_RAW`
 * (lib/content/ingest/sources/vietnam-wws-7d6n.ts), the actual PDF-sourced
 * content from Phase 3.7 — into the `trips` table and its content children,
 * as `content_status: 'draft'`.
 *
 * A TypeScript script, not a `supabase/seed.sql` INSERT, deliberately: the
 * source text contains apostrophes, em-dashes and an emoji transcribed
 * verbatim from the PDF (see that file's own comments on preserved source
 * artifacts). Retyping that into a SQL string literal by hand risks exactly
 * the kind of silent transcription error this project has been careful to
 * avoid elsewhere; importing the TypeScript constant that already exists
 * carries it over byte-for-byte instead.
 *
 * Deliberately does NOT insert `trip_accommodation` / `trip_transport` /
 * `trip_meeting_points`, even though `VIETNAM_WWS_7D6N_RAW` has
 * `accommodation` and `transport` data: those three tables are scoped to
 * `trip_departure_id` (docs/DATABASE.md), and this content has no real
 * departure — no confirmed date, price or availability anywhere in the
 * source. `trip_departures.departure_date` is `not null`, so there is no
 * honest row to attach that data to without inventing a date. It stays
 * unseeded until a real departure is scheduled; nothing here works around
 * that by fabricating one just to hold logistics text.
 *
 * Idempotent: re-running this script replaces the same trip's content
 * rather than duplicating it (upsert on `slug`, then delete-and-reinsert
 * children by `trip_id`).
 *
 * Usage (requires a reachable Supabase project and its service-role key —
 * see .env.local; not run automatically by `supabase db reset`):
 *
 *   npx tsx scripts/seed-vietnam-draft.ts
 */
import { existsSync, readFileSync } from 'node:fs';
import { resolve } from 'node:path';

import { createClient } from '@supabase/supabase-js';

import { VIETNAM_WWS_7D6N_RECORD } from '../lib/content/ingest/sources/vietnam-wws-7d6n';

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

/**
 * A standalone service-role client, NOT `lib/supabase/admin.ts`'s
 * `createAdminClient()`: that module `import`s the `server-only` package,
 * which throws unconditionally unless Next's webpack build aliases it away
 * for a server bundle (see `node_modules/server-only/index.js` and
 * `package.json`'s `"react-server"` export condition). This script runs
 * under plain Node/tsx, outside that build graph, so it constructs the
 * same minimal client directly instead. Every rule `admin.ts` documents
 * still applies here — this script exists only because it is authorised,
 * server-side, offline tooling, not a way around them.
 *
 * Untyped (no `Database` generic): `lib/supabase/database.types.ts` is
 * still the committed placeholder (`Tables: Record<string, never>`) —
 * it can only be regenerated from a real, reachable database connection
 * (`npm run db:types`), which this environment does not have. Typing this
 * client against the placeholder would make every `.from(...)` call below
 * a type error; typing it correctly has to wait for that regeneration.
 */
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

async function main() {
  if (!VIETNAM_WWS_7D6N_RECORD) {
    throw new Error(
      'VIETNAM_WWS_7D6N_INGEST did not succeed — VIETNAM_WWS_7D6N_RECORD is undefined. ' +
        'Fix the ingestion failure (see tests/unit/content-ingest.test.ts) before seeding.',
    );
  }

  // `VIETNAM_WWS_7D6N_RECORD` is a `ContentRecord<DraftTripDetail>` — the
  // actual trip fields live under `.data`, not on the record itself.
  const draft = VIETNAM_WWS_7D6N_RECORD.data;
  const reviewNotes = VIETNAM_WWS_7D6N_RECORD.reviewNotes;
  const supabase = createStandaloneAdminClient();

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
        source_reference:
          'docs/source-material/vietnam/Vietnam X WWS 7D6N  (1).pdf (Phase 3.7 ingestion)',
        review_notes: reviewNotes ?? null,
      },
      { onConflict: 'slug' },
    )
    .select('id')
    .single();

  if (tripError || !trip) {
    throw new Error(`Failed to upsert trip: ${tripError?.message}`);
  }

  const tripId = trip.id as string;

  // Delete-and-reinsert children so re-running this script replaces content
  // rather than duplicating it.
  await Promise.all(
    [
      'itinerary_days',
      'trip_media',
      'trip_inclusions',
      'trip_exclusions',
      'trip_important_notes',
    ].map((table) => supabase.from(table).delete().eq('trip_id', tripId)),
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

  // No real photography exists for this trip (Phase 3.7 note) — a single
  // hero placeholder, matching `heroMedia: { kind: 'placeholder' }` in the
  // source record. `gallery` is empty in the source, so nothing else to add.
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

  const importantNotes = draft.importantNotes ?? [];
  if (importantNotes.length > 0) {
    const { error: notesError } = await supabase.from('trip_important_notes').insert(
      importantNotes.map((note, index) => ({
        trip_id: tripId,
        title: note.title,
        detail: note.detail,
        category: note.category ?? null,
        display_order: index,
      })),
    );
    if (notesError) throw new Error(`Failed to insert trip_important_notes: ${notesError.message}`);
  }

  console.log(`Done. Trip id: ${tripId} (content_status: draft — not publicly visible).`);
  console.log(
    'Not seeded: trip_accommodation, trip_transport, trip_meeting_points, trip_departures — ' +
      'the source has no confirmed departure date, price or availability to attach them to.',
  );
}

main().catch((error: unknown) => {
  console.error(error);
  process.exitCode = 1;
});
