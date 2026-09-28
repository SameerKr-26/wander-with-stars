/**
 * Integration tests for the Phase 4.1 content schema — RLS-driven public
 * visibility, slug uniqueness, and anonymous write rejection.
 *
 * These hit a REAL Supabase project (local or remote), never a mock: RLS
 * policies are database behaviour, not application code, so the only way
 * to actually verify one is to run a query against Postgres and see what
 * comes back. `tests/README.md` scopes `integration/` to exactly this
 * ("route handlers, RLS policies, webhooks").
 *
 * Skips itself — rather than failing — when no reachable database is
 * configured, so `npm run test` stays green in any environment (including
 * this one, where no local Docker/Postgres is available to point it at).
 * A skipped suite here is a real gap, not a pass: see this phase's final
 * report for the explicit disclosure that these have not been executed
 * against a live database in this environment. Point `NEXT_PUBLIC_SUPABASE_URL`
 * / `NEXT_PUBLIC_SUPABASE_ANON_KEY` / `SUPABASE_SERVICE_ROLE_KEY` (or
 * `.env.local`) at a migrated database to actually run them.
 */
import { existsSync, readFileSync } from 'node:fs';
import { resolve } from 'node:path';

import { createClient } from '@supabase/supabase-js';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';

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

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
const hasCredentials = Boolean(url && anonKey && serviceRoleKey);

/** True once a lightweight query has actually reached a migrated database. */
let isReachable = false;

if (hasCredentials) {
  const admin = createClient(url!, serviceRoleKey!, {
    auth: { autoRefreshToken: false, persistSession: false, detectSessionInUrl: false },
  });
  try {
    const { error } = await admin.from('trips').select('id').limit(1);
    isReachable = !error;
  } catch {
    isReachable = false;
  }
}

describe.skipIf(!hasCredentials || !isReachable)('trip content schema — RLS', () => {
  const admin = createClient(url!, serviceRoleKey!, {
    auth: { autoRefreshToken: false, persistSession: false, detectSessionInUrl: false },
  });
  const anon = createClient(url!, anonKey!, {
    auth: { autoRefreshToken: false, persistSession: false, detectSessionInUrl: false },
  });

  // A unique slug pair per test run so repeated runs never collide with a
  // still-cleaning-up previous run.
  const runId = Date.now().toString(36);
  const publishedSlug = `test-published-${runId}`;
  const draftSlug = `test-draft-${runId}`;
  let publishedTripId: string;
  let draftTripId: string;
  let visibleDepartureId: string;
  let hiddenDepartureId: string;

  beforeAll(async () => {
    const { data: published, error: publishedError } = await admin
      .from('trips')
      .insert({
        slug: publishedSlug,
        title: 'Integration Test — Published Trip',
        destination: 'Nowhere',
        country: 'Testland',
        duration_nights: 1,
        overview: 'A trip inserted only to exercise RLS in tests/integration.',
        content_status: 'published',
        published_at: new Date().toISOString(),
      })
      .select('id')
      .single();
    if (publishedError || !published) throw new Error(`setup: ${publishedError?.message}`);
    publishedTripId = published.id as string;

    const { data: draft, error: draftError } = await admin
      .from('trips')
      .insert({
        slug: draftSlug,
        title: 'Integration Test — Draft Trip',
        destination: 'Nowhere',
        country: 'Testland',
        duration_nights: 1,
        overview: 'A trip inserted only to exercise RLS in tests/integration.',
        content_status: 'draft',
      })
      .select('id')
      .single();
    if (draftError || !draft) throw new Error(`setup: ${draftError?.message}`);
    draftTripId = draft.id as string;

    await admin.from('itinerary_days').insert([
      { trip_id: publishedTripId, day_number: 1, title: 'Day 1', summary: 'Test summary.' },
      { trip_id: draftTripId, day_number: 1, title: 'Day 1', summary: 'Test summary.' },
    ]);

    const { data: visible, error: visibleError } = await admin
      .from('trip_departures')
      .insert({
        trip_id: publishedTripId,
        departure_date: '2099-01-01',
        status: 'booking_open',
      })
      .select('id')
      .single();
    if (visibleError || !visible) throw new Error(`setup: ${visibleError?.message}`);
    visibleDepartureId = visible.id as string;

    const { data: hidden, error: hiddenError } = await admin
      .from('trip_departures')
      .insert({ trip_id: publishedTripId, departure_date: '2099-02-01', status: 'draft' })
      .select('id')
      .single();
    if (hiddenError || !hidden) throw new Error(`setup: ${hiddenError?.message}`);
    hiddenDepartureId = hidden.id as string;
  });

  afterAll(async () => {
    // `on delete cascade` on every child table (see the migrations in this
    // phase) means deleting the two trips is enough to remove everything
    // this suite created.
    await admin.from('trips').delete().in('id', [publishedTripId, draftTripId]);
  });

  it('lets anonymous readers see a published trip', async () => {
    const { data, error } = await anon.from('trips').select('id').eq('slug', publishedSlug);
    expect(error).toBeNull();
    expect(data).toHaveLength(1);
  });

  it('hides a draft trip from anonymous readers', async () => {
    const { data, error } = await anon.from('trips').select('id').eq('slug', draftSlug);
    expect(error).toBeNull();
    expect(data).toHaveLength(0);
  });

  it('shows itinerary days of a published trip to anonymous readers', async () => {
    const { data, error } = await anon
      .from('itinerary_days')
      .select('id')
      .eq('trip_id', publishedTripId);
    expect(error).toBeNull();
    expect(data).toHaveLength(1);
  });

  it('hides itinerary days of a draft trip from anonymous readers, even by direct id', async () => {
    const { data, error } = await anon
      .from('itinerary_days')
      .select('id')
      .eq('trip_id', draftTripId);
    expect(error).toBeNull();
    expect(data).toHaveLength(0);
  });

  it('shows a booking_open departure of a published trip to anonymous readers', async () => {
    const { data, error } = await anon
      .from('trip_departures')
      .select('id')
      .eq('id', visibleDepartureId);
    expect(error).toBeNull();
    expect(data).toHaveLength(1);
  });

  it('hides a draft-status departure even though its trip is published', async () => {
    const { data, error } = await anon
      .from('trip_departures')
      .select('id')
      .eq('id', hiddenDepartureId);
    expect(error).toBeNull();
    expect(data).toHaveLength(0);
  });

  it('rejects an anonymous write to trips', async () => {
    const { error } = await anon.from('trips').insert({
      slug: `${publishedSlug}-anon-write`,
      title: 'Should never be written',
      destination: 'Nowhere',
      country: 'Testland',
      duration_nights: 1,
      overview: 'Anonymous clients have no INSERT policy on trips.',
    });
    expect(error).not.toBeNull();
  });

  it('rejects a duplicate trip slug', async () => {
    const { error } = await admin.from('trips').insert({
      slug: publishedSlug,
      title: 'Duplicate slug attempt',
      destination: 'Nowhere',
      country: 'Testland',
      duration_nights: 1,
      overview: 'trips.slug is unique — this insert must fail.',
    });
    expect(error).not.toBeNull();
  });

  it('rejects a departure with no parent trip', async () => {
    const { error } = await admin.from('trip_departures').insert({
      trip_id: '00000000-0000-0000-0000-000000000000',
      departure_date: '2099-01-01',
    });
    expect(error).not.toBeNull();
  });
});

describe.skipIf(hasCredentials && isReachable)('trip content schema — RLS (unreachable)', () => {
  it('is skipped: no reachable, migrated Supabase database is configured', () => {
    expect(true).toBe(true);
  });
});
