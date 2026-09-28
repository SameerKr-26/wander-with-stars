/**
 * Admin content-administration & publishing workflow — Phase 4.3.
 *
 * Real local-database integration tests, not mocks (this project's own
 * convention — see tests/integration/trip-content-schema.test.ts): creates
 * real Supabase Auth users with real `admin_roles` rows, and exercises the
 * real `lib/admin/repository.ts` / `lib/admin/transitions.ts` functions
 * against the local dev database from Phase 4.2A. Skips — does not fail —
 * when no reachable, migrated database is configured
 * (`NEXT_PUBLIC_SUPABASE_URL` / `NEXT_PUBLIC_SUPABASE_ANON_KEY` /
 * `SUPABASE_SERVICE_ROLE_KEY`, or `.env.local`).
 *
 * Deliberately does NOT call `lib/content/queries.ts` itself: its
 * database-backed functions go through `lib/supabase/server.ts`, which
 * calls Next's `cookies()` — a "dynamic API" Next.js 15+ refuses to run
 * outside a real request/render context, which a plain Vitest test never
 * has. `tests/unit/content-queries-db.test.ts` already covers that
 * function's own branching logic with the repository mocked; this file
 * instead re-verifies, directly at the RLS boundary that logic depends on,
 * that published content is genuinely visible to `anon` and archived/draft
 * content genuinely is not — for the exact rows this workflow produces.
 *
 * `server-only` is mocked to an empty module so `lib/admin/repository.ts`
 * (which imports it) can be imported here at all — see
 * tests/unit/admin-authorize.test.ts's own comment on why.
 */
import { existsSync, readFileSync } from 'node:fs';
import { resolve } from 'node:path';

import { createClient, type SupabaseClient } from '@supabase/supabase-js';
import { afterAll, beforeAll, describe, expect, it, vi } from 'vitest';

vi.mock('server-only', () => ({}));

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

let isReachable = false;
if (hasCredentials) {
  const admin = createClient(url!, serviceRoleKey!, {
    auth: { autoRefreshToken: false, persistSession: false, detectSessionInUrl: false },
  });
  try {
    const { error } = await admin.from('admin_roles').select('id').limit(1);
    isReachable = !error;
  } catch {
    isReachable = false;
  }
}

describe.skipIf(!hasCredentials || !isReachable)('admin content workflow', () => {
  const admin = createClient(url!, serviceRoleKey!, {
    auth: { autoRefreshToken: false, persistSession: false, detectSessionInUrl: false },
  });
  const anon = createClient(url!, anonKey!, {
    auth: { autoRefreshToken: false, persistSession: false, detectSessionInUrl: false },
  });

  const runId = Date.now().toString(36);
  const contentManagerEmail = `test-content-manager-${runId}@example.test`;
  const adminEmail = `test-admin-${runId}@example.test`;
  const plainUserEmail = `test-plain-user-${runId}@example.test`;
  const password = 'Test-Password-1234!';

  let contentManagerId: string;
  let adminId: string;
  let plainUserId: string;
  let contentManagerClient: SupabaseClient;
  let adminUserClient: SupabaseClient;
  let plainUserClient: SupabaseClient;

  let tripId: string;
  const tripSlug = `test-admin-workflow-${runId}`;

  beforeAll(async () => {
    async function createSignedInUser(email: string) {
      const { data, error } = await admin.auth.admin.createUser({
        email,
        password,
        email_confirm: true,
      });
      if (error || !data.user) throw new Error(`setup: ${error?.message}`);
      const client = createClient(url!, anonKey!, {
        auth: { autoRefreshToken: false, persistSession: false, detectSessionInUrl: false },
      });
      const { error: signInError } = await client.auth.signInWithPassword({ email, password });
      if (signInError) throw new Error(`setup sign-in: ${signInError.message}`);
      return { id: data.user.id, client };
    }

    const cm = await createSignedInUser(contentManagerEmail);
    contentManagerId = cm.id;
    contentManagerClient = cm.client;

    const ad = await createSignedInUser(adminEmail);
    adminId = ad.id;
    adminUserClient = ad.client;

    const plain = await createSignedInUser(plainUserEmail);
    plainUserId = plain.id;
    plainUserClient = plain.client;

    const { error: roleError } = await admin.from('admin_roles').upsert([
      { id: contentManagerId, role: 'content_manager' },
      { id: adminId, role: 'admin' },
    ]);
    if (roleError) throw new Error(`setup roles: ${roleError.message}`);
    // plainUserId deliberately gets no admin_roles row at all.
  });

  afterAll(async () => {
    if (tripId) await admin.from('trips').delete().eq('id', tripId);
    for (const id of [contentManagerId, adminId, plainUserId]) {
      if (id) await admin.auth.admin.deleteUser(id);
    }
  });

  it('rejects a direct authenticated write to trips, even from an admin-role session — writes only ever go through the service-role path', async () => {
    const { error } = await adminUserClient.from('trips').insert({
      slug: `${tripSlug}-rls-bypass-attempt`,
      title: 'Should never be written via RLS',
      destination: 'Nowhere',
      country: 'Testland',
      duration_nights: 1,
      overview: 'Proves there is no authenticated INSERT policy on trips.',
    });
    expect(error).not.toBeNull();
  });

  it('rejects a direct authenticated write to admin_roles, even from an existing admin — role grants are service-role only', async () => {
    // No `update` policy exists for `authenticated` at all, so RLS filters
    // this to zero matching rows rather than surfacing a PostgREST error
    // (an UPDATE with a WHERE clause RLS narrows to nothing is a "success,
    // 0 rows changed", not a rejected request) — the real proof is that the
    // role genuinely did not change, checked via the service-role client.
    await adminUserClient.from('admin_roles').update({ role: 'super_admin' }).eq('id', adminId);

    const { data } = await admin.from('admin_roles').select('role').eq('id', adminId).single();
    expect((data as { role: string }).role).toBe('admin');
  });

  it('lets a user read only their own admin_roles row, never anyone else’s', async () => {
    const { data: own } = await contentManagerClient
      .from('admin_roles')
      .select('role')
      .eq('id', contentManagerId);
    expect(own).toHaveLength(1);

    const { data: someoneElses } = await contentManagerClient
      .from('admin_roles')
      .select('role')
      .eq('id', adminId);
    expect(someoneElses).toHaveLength(0);
  });

  it('creates a draft trip through the repository (as content_manager would)', async () => {
    const { createTrip } = await import('@/lib/admin/repository');
    tripId = await createTrip({
      slug: tripSlug,
      title: 'Admin Workflow Test Trip',
      destination: 'Testland',
      country: 'Testland',
      durationNights: 3,
      overview: 'Created only to exercise the Phase 4.3 admin workflow.',
    });
    expect(tripId).toBeTruthy();

    const { data } = await admin.from('trips').select('content_status').eq('id', tripId).single();
    expect((data as { content_status: string }).content_status).toBe('draft');
  });

  it('an unauthenticated/anonymous reader cannot see the draft trip at all', async () => {
    const { data } = await anon.from('trips').select('id').eq('id', tripId);
    expect(data).toHaveLength(0);
  });

  it('a signed-in user with no admin_roles row cannot see the draft trip either', async () => {
    const { data } = await plainUserClient.from('trips').select('id').eq('id', tripId);
    expect(data).toHaveLength(0);
  });

  it('a content_manager CAN see the draft trip, via the admin read policy', async () => {
    const { data } = await contentManagerClient.from('trips').select('id').eq('id', tripId);
    expect(data).toHaveLength(1);
  });

  it('content_manager can move draft -> review', async () => {
    const { transitionTripStatus } = await import('@/lib/admin/repository');
    await transitionTripStatus(tripId, 'content_manager', 'draft', 'review');
    const { data } = await admin.from('trips').select('content_status').eq('id', tripId).single();
    expect((data as { content_status: string }).content_status).toBe('review');
  });

  it('content_manager CANNOT approve — the repository itself rejects it, not just the UI', async () => {
    const { transitionTripStatus } = await import('@/lib/admin/repository');
    await expect(
      transitionTripStatus(tripId, 'content_manager', 'review', 'approved'),
    ).rejects.toThrow();

    const { data } = await admin.from('trips').select('content_status').eq('id', tripId).single();
    expect((data as { content_status: string }).content_status).toBe('review');
  });

  it('admin can approve and then publish', async () => {
    const { transitionTripStatus } = await import('@/lib/admin/repository');
    await transitionTripStatus(tripId, 'admin', 'review', 'approved');
    await transitionTripStatus(tripId, 'admin', 'approved', 'published');

    const { data } = await admin
      .from('trips')
      .select('content_status, published_at')
      .eq('id', tripId)
      .single();
    const row = data as { content_status: string; published_at: string | null };
    expect(row.content_status).toBe('published');
    expect(row.published_at).not.toBeNull();
  });

  it('adding a bookable departure does not mutate the trip content row', async () => {
    const { createDeparture } = await import('@/lib/admin/repository');
    const before = await admin.from('trips').select('title, updated_at').eq('id', tripId).single();

    await createDeparture(tripId, {
      departureDate: '2099-06-01',
      priceAmount: 1000,
      priceCurrency: 'INR',
      capacity: 10,
      status: 'booking_open',
    });

    const after = await admin.from('trips').select('title').eq('id', tripId).single();
    expect((after.data as { title: string }).title).toBe((before.data as { title: string }).title);
  });

  it('published content with a presentable departure becomes visible through the public RLS boundary lib/content/queries.ts relies on', async () => {
    // Not `getTripBySlug` itself here: it calls `lib/supabase/server.ts`'s
    // `createClient()`, which calls Next's `cookies()` — a "dynamic API"
    // that Next.js 15+ refuses to run outside an actual request/render
    // context, which a plain Vitest test never has. `tests/unit/content-queries-db.test.ts`
    // already covers `getTripBySlug`'s own branching logic (with the
    // repository mocked); this test instead re-verifies, for this exact
    // trip, the RLS policy that logic depends on to work at all — the same
    // approach tests/integration/trip-content-schema.test.ts already uses.
    const { data: tripRows } = await anon.from('trips').select('id').eq('id', tripId);
    expect(tripRows).toHaveLength(1);

    const { data: departureRows } = await anon
      .from('trip_departures')
      .select('id')
      .eq('trip_id', tripId);
    expect(departureRows).toHaveLength(1);
  });

  it('editing the trip core does not mutate its departure', async () => {
    const { updateTripCore } = await import('@/lib/admin/repository');
    const { data: departureBefore } = await admin
      .from('trip_departures')
      .select('departure_date, price_amount')
      .eq('trip_id', tripId)
      .single();

    await updateTripCore(tripId, {
      slug: tripSlug,
      title: 'Admin Workflow Test Trip (edited)',
      destination: 'Testland',
      country: 'Testland',
      durationNights: 3,
      overview: 'Edited only to exercise the Phase 4.3 admin workflow.',
    });

    const { data: departureAfter } = await admin
      .from('trip_departures')
      .select('departure_date, price_amount')
      .eq('trip_id', tripId)
      .single();
    expect(departureAfter).toEqual(departureBefore);
  });

  it('admin can archive published content, which then leaves public visibility', async () => {
    const { transitionTripStatus } = await import('@/lib/admin/repository');
    await transitionTripStatus(tripId, 'admin', 'published', 'archived');

    const { data } = await anon.from('trips').select('id').eq('id', tripId);
    expect(data).toHaveLength(0);
  });

  it('the real Vietnam draft trip stays hidden from anonymous readers', async () => {
    const { VIETNAM_WWS_7D6N_RECORD } =
      await import('@/lib/content/ingest/sources/vietnam-wws-7d6n');
    if (!VIETNAM_WWS_7D6N_RECORD) throw new Error('Vietnam draft ingestion failed unexpectedly.');
    const { createTrip } = await import('@/lib/admin/repository');

    const record = VIETNAM_WWS_7D6N_RECORD.data;
    const vietnamTripId = await createTrip({
      slug: record.slug,
      title: record.title,
      destination: record.destination,
      country: record.country,
      durationNights: record.durationNights,
      overview: record.overview,
    });

    try {
      const { data: anonRows } = await anon.from('trips').select('id').eq('id', vietnamTripId);
      expect(anonRows).toHaveLength(0);

      const { data } = await admin
        .from('trips')
        .select('content_status')
        .eq('id', vietnamTripId)
        .single();
      expect((data as { content_status: string }).content_status).toBe('draft');
    } finally {
      await admin.from('trips').delete().eq('id', vietnamTripId);
    }
  });
});

describe.skipIf(hasCredentials && isReachable)('admin content workflow (unreachable)', () => {
  it('is skipped: no reachable, migrated Supabase database is configured', () => {
    expect(true).toBe(true);
  });
});
