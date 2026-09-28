/**
 * Publishes the three live-captured trips (Thailand, Vietnam, Bali) — the
 * one part of this catalogue's activation that must go through the
 * established content lifecycle (`draft -> review -> approved ->
 * published`), not a direct `UPDATE ... SET content_status = 'published'`.
 *
 * Does NOT import `lib/admin/repository.ts`'s `transitionTripStatus`
 * directly: that module (and everything in `lib/admin/`) imports
 * `server-only`, which throws unconditionally outside Next's build — the
 * same constraint every other standalone script in this project works
 * around (see scripts/seed-vietnam-draft.ts's own comment). Instead, this
 * script imports `lib/admin/transitions.ts`'s pure `canTransition` — which
 * has no such dependency — and re-validates every step against the exact
 * same rules `transitionTripStatus` enforces, rather than bypassing them.
 * Every transition below runs as `role: 'admin'`, one step at a time, in
 * the same order a human using the /admin UI would have to.
 *
 * This is automated-capture content moving to published for the first
 * time deliberately, in THIS phase (Phase 4.4B) — unlike Phase 4.4A, which
 * kept everything draft on purpose. The decision to publish is this
 * phase's own explicit instruction, not something scripts assume by
 * default.
 *
 * Departure `status` has no equivalent lifecycle/trigger gate (see
 * `supabase/migrations/20260928164514_create_trip_departures_table.sql` —
 * only a CHECK constraint on valid values, no transition-validity rule);
 * each real departure is moved from `draft` to `booking_open` directly,
 * matching what the live site actually shows (an active "Join Now" CTA,
 * no sold-out/closed messaging observed).
 *
 * Usage: npx tsx scripts/publish-live-catalogue.ts
 */
import { existsSync, readFileSync } from 'node:fs';
import { resolve } from 'node:path';

import { createClient } from '@supabase/supabase-js';

import { canTransition } from '../lib/admin/transitions';
import type { ContentStatus } from '../lib/content/ingest/types';

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

const PUBLISH_PATH: ContentStatus[] = ['draft', 'review', 'approved', 'published'];
const LIVE_SLUGS = ['thailand-full-moon-party', 'vietnam-6n7d', 'bali-new-year-special'];

async function main() {
  const supabase = createStandaloneAdminClient();

  for (const slug of LIVE_SLUGS) {
    const { data: trip, error: fetchError } = await supabase
      .from('trips')
      .select('id, content_status')
      .eq('slug', slug)
      .single();
    if (fetchError || !trip)
      throw new Error(`Trip "${slug}" not found — run the seed scripts first.`);

    const tripId = (trip as { id: string }).id;
    let currentStatus = (trip as { content_status: string }).content_status as ContentStatus;

    const startIndex = PUBLISH_PATH.indexOf(currentStatus);
    if (startIndex === -1) {
      console.warn(`"${slug}" is at unexpected status "${currentStatus}" — skipping.`);
      continue;
    }

    for (let i = startIndex; i < PUBLISH_PATH.length - 1; i++) {
      const from = PUBLISH_PATH[i]!;
      const to = PUBLISH_PATH[i + 1]!;
      if (!canTransition('admin', from, to)) {
        throw new Error(`Role "admin" may not move "${slug}" from "${from}" to "${to}".`);
      }

      const { error: updateError } = await supabase
        .from('trips')
        .update({
          content_status: to,
          ...(to === 'published' ? { published_at: new Date().toISOString() } : {}),
        })
        .eq('id', tripId)
        .eq('content_status', from);
      if (updateError)
        throw new Error(`Failed to move "${slug}" ${from} -> ${to}: ${updateError.message}`);

      console.log(`  ${slug}: ${from} -> ${to}`);
      currentStatus = to;
    }

    const { error: departureError } = await supabase
      .from('trip_departures')
      .update({ status: 'booking_open' })
      .eq('trip_id', tripId)
      .eq('status', 'draft');
    if (departureError)
      throw new Error(`Failed to open departures for "${slug}": ${departureError.message}`);

    console.log(`"${slug}" is now published, with its departure(s) set to booking_open.`);
  }

  console.log('Done.');
}

main().catch((error: unknown) => {
  console.error(error);
  process.exitCode = 1;
});
