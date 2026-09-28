/**
 * Live WWS catalogue capture — Phase 4.4A.
 *
 * Real local-database integration tests (this project's own convention —
 * see tests/integration/trip-content-schema.test.ts): verifies the three
 * live-captured trips (seeded via scripts/seed-vietnam-draft.ts and
 * scripts/seed-live-catalogue.ts) exist with the correct commercial facts
 * and, critically, stay invisible to anonymous/public readers — draft
 * content, exactly like every other trip this project has ingested so far.
 *
 * Skips — does not fail — when no reachable, migrated database is
 * configured, or when the seed scripts have not been run against it yet.
 */
import { existsSync, readFileSync } from 'node:fs';
import { resolve } from 'node:path';

import { createClient } from '@supabase/supabase-js';
import { describe, expect, it } from 'vitest';

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

const LIVE_SLUGS = ['thailand-full-moon-party', 'bali-new-year-special', 'vietnam-6n7d'] as const;

let isReachable = false;
let seeded = false;
if (hasCredentials) {
  const admin = createClient(url!, serviceRoleKey!, {
    auth: { autoRefreshToken: false, persistSession: false, detectSessionInUrl: false },
  });
  try {
    const { data, error } = await admin.from('trips').select('slug').in('slug', LIVE_SLUGS);
    isReachable = !error;
    seeded = !error && (data?.length ?? 0) === LIVE_SLUGS.length;
  } catch {
    isReachable = false;
  }
}

interface TripRow {
  slug: string;
  content_status: string;
}
interface DepartureRow {
  departure_date: string;
  price_amount: string | number;
  price_currency: string;
  status: string;
}

describe.skipIf(!hasCredentials || !isReachable || !seeded)('live WWS catalogue (seeded)', () => {
  const admin = createClient(url!, serviceRoleKey!, {
    auth: { autoRefreshToken: false, persistSession: false, detectSessionInUrl: false },
  });
  const anon = createClient(url!, anonKey!, {
    auth: { autoRefreshToken: false, persistSession: false, detectSessionInUrl: false },
  });

  it('every discovered live trip has a canonical local representation', async () => {
    const { data } = await admin.from('trips').select('slug').in('slug', LIVE_SLUGS);
    expect((data as TripRow[]).map((t) => t.slug).sort()).toEqual([...LIVE_SLUGS].sort());
  });

  it('every live trip is seeded as content_status: draft — none auto-published', async () => {
    const { data } = await admin
      .from('trips')
      .select('slug, content_status')
      .in('slug', LIVE_SLUGS);
    for (const row of data as TripRow[]) {
      expect(row.content_status).toBe('draft');
    }
  });

  it('Thailand Full Moon Party has exactly its three distinct, correctly-priced departures', async () => {
    const { data: trip } = await admin
      .from('trips')
      .select('id')
      .eq('slug', 'thailand-full-moon-party')
      .single();
    const { data: departures } = await admin
      .from('trip_departures')
      .select('departure_date, price_amount, price_currency, status')
      .eq('trip_id', (trip as { id: string }).id)
      .order('departure_date');

    const rows = departures as DepartureRow[];
    expect(rows).toHaveLength(3);
    expect(rows.map((d) => d.departure_date)).toEqual(['2026-10-25', '2026-11-22', '2026-12-22']);
    expect(rows.map((d) => Number(d.price_amount))).toEqual([49999, 59999, 64999]);
    for (const row of rows) {
      expect(row.price_currency).toBe('INR');
      expect(row.status).toBe('draft');
    }
  });

  it('BALI New Year Special has its one real departure, matching the source exactly', async () => {
    const { data: trip } = await admin
      .from('trips')
      .select('id')
      .eq('slug', 'bali-new-year-special')
      .single();
    const { data: departures } = await admin
      .from('trip_departures')
      .select('departure_date, return_date, price_amount, price_currency, status')
      .eq('trip_id', (trip as { id: string }).id);

    const rows = departures as (DepartureRow & { return_date: string })[];
    expect(rows).toHaveLength(1);
    expect(rows[0]?.departure_date).toBe('2026-12-26');
    expect(rows[0]?.return_date).toBe('2027-01-03');
    expect(Number(rows[0]?.price_amount)).toBe(68999);
    expect(rows[0]?.status).toBe('draft');
  });

  it('Vietnam now has a real departure alongside its unchanged Phase 3.7 content', async () => {
    const { data: trip } = await admin
      .from('trips')
      .select('id, title')
      .eq('slug', 'vietnam-6n7d')
      .single();
    expect((trip as { title: string }).title).toBe('Vietnam 6N/7D');

    const { data: departures } = await admin
      .from('trip_departures')
      .select('departure_date, price_amount, status')
      .eq('trip_id', (trip as { id: string }).id);
    const rows = departures as DepartureRow[];
    expect(rows).toHaveLength(1);
    expect(rows[0]?.departure_date).toBe('2026-11-13');
    expect(Number(rows[0]?.price_amount)).toBe(64999);
  });

  it('itinerary day count matches the captured source for every live trip', async () => {
    const expectedDays: Record<string, number> = {
      'thailand-full-moon-party': 7,
      'bali-new-year-special': 9,
      'vietnam-6n7d': 7,
    };
    for (const slug of LIVE_SLUGS) {
      const { data: trip } = await admin.from('trips').select('id').eq('slug', slug).single();
      const { data: days } = await admin
        .from('itinerary_days')
        .select('day_number')
        .eq('trip_id', (trip as { id: string }).id);
      expect(days).toHaveLength(expectedDays[slug]!);
    }
  });

  it('none of the three live trips are visible to an anonymous reader — draft stays private', async () => {
    const { data } = await anon.from('trips').select('slug').in('slug', LIVE_SLUGS);
    expect(data).toEqual([]);
  });

  it('none of the seeded departures are visible to an anonymous reader either', async () => {
    const { data: trips } = await admin.from('trips').select('id').in('slug', LIVE_SLUGS);
    const tripIds = (trips as { id: string }[]).map((t) => t.id);

    const { data } = await anon.from('trip_departures').select('id').in('trip_id', tripIds);
    expect(data).toEqual([]);
  });

  it('a content_manager-role reader CAN see the live trips (admin visibility, Phase 4.3 policy)', async () => {
    // Reuses the existing "admins can read every trip regardless of
    // status" RLS policy — no new policy introduced by this phase.
    const email = `test-live-catalogue-admin-${Date.now().toString(36)}@example.test`;
    const password = 'Test-Password-1234!';
    const { data: created, error: createError } = await admin.auth.admin.createUser({
      email,
      password,
      email_confirm: true,
    });
    if (createError || !created.user) throw new Error(`setup: ${createError?.message}`);

    try {
      await admin.from('admin_roles').upsert({ id: created.user.id, role: 'content_manager' });

      const asAdmin = createClient(url!, anonKey!, {
        auth: { autoRefreshToken: false, persistSession: false, detectSessionInUrl: false },
      });
      const { error: signInError } = await asAdmin.auth.signInWithPassword({ email, password });
      if (signInError) throw new Error(`setup sign-in: ${signInError.message}`);

      const { data } = await asAdmin.from('trips').select('slug').in('slug', LIVE_SLUGS);
      expect((data as TripRow[]).map((t) => t.slug).sort()).toEqual([...LIVE_SLUGS].sort());
    } finally {
      await admin.auth.admin.deleteUser(created.user.id);
    }
  });
});

describe.skipIf(hasCredentials && isReachable && seeded)('live WWS catalogue (not seeded)', () => {
  it('is skipped: no reachable database, or scripts/seed-live-catalogue.ts has not been run', () => {
    expect(true).toBe(true);
  });
});
