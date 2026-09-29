/**
 * Traveller authentication & accounts — Phase 4.5.
 *
 * Real local-database integration tests (this project's own convention —
 * see tests/integration/admin-content-workflow.test.ts). Every user this
 * file creates is clearly labelled (`test-traveller-*@example.test`) and
 * deleted in a `finally` block — no real customer credentials, no leftover
 * accounts.
 *
 * Skips — does not fail — when no reachable, migrated local database is
 * configured (the same `hasCredentials`/`isReachable` pattern every other
 * integration test in this project already uses).
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

let isReachable = false;
if (hasCredentials) {
  const admin = createClient(url!, serviceRoleKey!, {
    auth: { autoRefreshToken: false, persistSession: false, detectSessionInUrl: false },
  });
  try {
    const { error } = await admin.from('traveller_profiles').select('id').limit(1);
    isReachable = !error;
  } catch {
    isReachable = false;
  }
}

function testEmail(label: string): string {
  return `test-traveller-${label}-${Date.now().toString(36)}-${Math.random()
    .toString(36)
    .slice(2, 8)}@example.test`;
}

const TEST_PASSWORD = 'Test-Password-1234!';

describe.skipIf(!hasCredentials || !isReachable)(
  'traveller authentication (local database)',
  () => {
    const admin = createClient(url!, serviceRoleKey!, {
      auth: { autoRefreshToken: false, persistSession: false, detectSessionInUrl: false },
    });

    async function createSignedInClient(email: string, password = TEST_PASSWORD) {
      const { data: created, error: createError } = await admin.auth.admin.createUser({
        email,
        password,
        email_confirm: true,
      });
      if (createError || !created.user) throw new Error(`setup: ${createError?.message}`);

      const client = createClient(url!, anonKey!, {
        auth: { autoRefreshToken: false, persistSession: false, detectSessionInUrl: false },
      });
      const { error: signInError } = await client.auth.signInWithPassword({ email, password });
      if (signInError) throw new Error(`setup sign-in: ${signInError.message}`);

      return { client, userId: created.user.id };
    }

    async function cleanup(userId: string) {
      await admin.auth.admin.deleteUser(userId);
    }

    it('1. signup: a new auth.users row can be created', async () => {
      const email = testEmail('signup');
      const { data, error } = await admin.auth.admin.createUser({
        email,
        password: TEST_PASSWORD,
        email_confirm: true,
      });
      expect(error).toBeNull();
      expect(data.user?.email).toBe(email);
      if (data.user) await cleanup(data.user.id);
    });

    it('2. sign-in: signInWithPassword succeeds for a real account and establishes a session', async () => {
      const email = testEmail('signin');
      const { client, userId } = await createSignedInClient(email);
      try {
        const { data } = await client.auth.getUser();
        expect(data.user?.email).toBe(email);
      } finally {
        await cleanup(userId);
      }
    });

    it('3. sign-out: invalidates the client session', async () => {
      const email = testEmail('signout');
      const { client, userId } = await createSignedInClient(email);
      try {
        await client.auth.signOut();
        const { data } = await client.auth.getUser();
        expect(data.user).toBeNull();
      } finally {
        await cleanup(userId);
      }
    });

    it('6. profile creation: an upsert with ignoreDuplicates is idempotent', async () => {
      const email = testEmail('profile-create');
      const { client, userId } = await createSignedInClient(email);
      try {
        const first = await client
          .from('traveller_profiles')
          .upsert(
            { user_id: userId, display_name: 'First Name' },
            { onConflict: 'user_id', ignoreDuplicates: true },
          );
        expect(first.error).toBeNull();

        // Second call must not error and must not overwrite the display name.
        const second = await client
          .from('traveller_profiles')
          .upsert(
            { user_id: userId, display_name: 'Second Name' },
            { onConflict: 'user_id', ignoreDuplicates: true },
          );
        expect(second.error).toBeNull();

        const { data: row } = await client
          .from('traveller_profiles')
          .select('display_name')
          .eq('user_id', userId)
          .single();
        expect(row?.display_name).toBe('First Name');
      } finally {
        await cleanup(userId);
      }
    });

    it('7. profile read ownership: a traveller can read their own profile', async () => {
      const email = testEmail('read-own');
      const { client, userId } = await createSignedInClient(email);
      try {
        await client.from('traveller_profiles').insert({ user_id: userId, display_name: 'Owner' });
        const { data, error } = await client
          .from('traveller_profiles')
          .select('display_name')
          .eq('user_id', userId)
          .single();
        expect(error).toBeNull();
        expect(data?.display_name).toBe('Owner');
      } finally {
        await cleanup(userId);
      }
    });

    it('8. profile update ownership: a traveller can update their own profile', async () => {
      const email = testEmail('update-own');
      const { client, userId } = await createSignedInClient(email);
      try {
        await client.from('traveller_profiles').insert({ user_id: userId, display_name: 'Before' });
        const { error } = await client
          .from('traveller_profiles')
          .update({ display_name: 'After' })
          .eq('user_id', userId);
        expect(error).toBeNull();

        const { data } = await client
          .from('traveller_profiles')
          .select('display_name')
          .eq('user_id', userId)
          .single();
        expect(data?.display_name).toBe('After');
      } finally {
        await cleanup(userId);
      }
    });

    it("9. cross-user profile read rejection: one traveller cannot read another's profile", async () => {
      const emailA = testEmail('cross-read-a');
      const emailB = testEmail('cross-read-b');
      const a = await createSignedInClient(emailA);
      const b = await createSignedInClient(emailB);
      try {
        await admin
          .from('traveller_profiles')
          .insert({ user_id: a.userId, display_name: 'Traveller A' });

        const { data, error } = await b.client
          .from('traveller_profiles')
          .select('display_name')
          .eq('user_id', a.userId)
          .maybeSingle();
        // RLS makes another user's row invisible, not an explicit error —
        // the query succeeds and simply returns nothing.
        expect(error).toBeNull();
        expect(data).toBeNull();
      } finally {
        await cleanup(a.userId);
        await cleanup(b.userId);
      }
    });

    it('9b. a traveller cannot enumerate all profiles either', async () => {
      const emailA = testEmail('enum-a');
      const emailB = testEmail('enum-b');
      const a = await createSignedInClient(emailA);
      const b = await createSignedInClient(emailB);
      try {
        await admin
          .from('traveller_profiles')
          .insert({ user_id: a.userId, display_name: 'Traveller A' });
        await admin
          .from('traveller_profiles')
          .insert({ user_id: b.userId, display_name: 'Traveller B' });

        const { data } = await a.client.from('traveller_profiles').select('user_id');
        // Only A's own row, never B's — RLS scopes SELECT * the same way.
        expect(data).toHaveLength(1);
        expect(data?.[0]?.user_id).toBe(a.userId);
      } finally {
        await cleanup(a.userId);
        await cleanup(b.userId);
      }
    });

    it("10. cross-user profile update rejection: one traveller cannot update another's profile", async () => {
      const emailA = testEmail('cross-update-a');
      const emailB = testEmail('cross-update-b');
      const a = await createSignedInClient(emailA);
      const b = await createSignedInClient(emailB);
      try {
        await admin
          .from('traveller_profiles')
          .insert({ user_id: a.userId, display_name: 'Original' });

        await b.client
          .from('traveller_profiles')
          .update({ display_name: 'Hijacked' })
          .eq('user_id', a.userId);

        const { data } = await admin
          .from('traveller_profiles')
          .select('display_name')
          .eq('user_id', a.userId)
          .single();
        // RLS's `using` clause means the update matches zero rows — A's
        // profile is untouched.
        expect(data?.display_name).toBe('Original');
      } finally {
        await cleanup(a.userId);
        await cleanup(b.userId);
      }
    });

    it('11. unauthenticated profile access rejection: an anon client sees no profiles at all', async () => {
      const email = testEmail('anon-reject');
      const { userId } = await createSignedInClient(email);
      try {
        await admin.from('traveller_profiles').insert({ user_id: userId, display_name: 'Private' });

        const anon = createClient(url!, anonKey!, {
          auth: { autoRefreshToken: false, persistSession: false, detectSessionInUrl: false },
        });
        const { data } = await anon
          .from('traveller_profiles')
          .select('display_name')
          .eq('user_id', userId)
          .maybeSingle();
        expect(data).toBeNull();
      } finally {
        await cleanup(userId);
      }
    });

    it('12. invalid profile data rejection: an empty display_name is rejected by the CHECK constraint', async () => {
      const email = testEmail('invalid-data');
      const { client, userId } = await createSignedInClient(email);
      try {
        const { error } = await client
          .from('traveller_profiles')
          .insert({ user_id: userId, display_name: '   ' });
        expect(error).not.toBeNull();
      } finally {
        await cleanup(userId);
      }
    });

    it('13. existing admin auth still works: admin_roles is untouched by this migration', async () => {
      const email = testEmail('admin-still-works');
      const { data: created, error: createError } = await admin.auth.admin.createUser({
        email,
        password: TEST_PASSWORD,
        email_confirm: true,
      });
      if (createError || !created.user) throw new Error(`setup: ${createError?.message}`);

      try {
        await admin.from('admin_roles').upsert({ id: created.user.id, role: 'content_manager' });
        const client = createClient(url!, anonKey!, {
          auth: { autoRefreshToken: false, persistSession: false, detectSessionInUrl: false },
        });
        await client.auth.signInWithPassword({ email, password: TEST_PASSWORD });
        const { data } = await client
          .from('admin_roles')
          .select('role')
          .eq('id', created.user.id)
          .single();
        expect(data?.role).toBe('content_manager');
      } finally {
        await cleanup(created.user.id);
      }
    });

    it('14. booking traveller_id remains compatible: a traveller_profiles user_id can be referenced by bookings.traveller_id', async () => {
      const email = testEmail('booking-compat');
      const { userId } = await createSignedInClient(email);
      try {
        await admin.from('traveller_profiles').insert({ user_id: userId, display_name: 'Booker' });

        const { data: trip } = await admin.from('trips').select('id').limit(1).single();
        const { data: departure } = await admin
          .from('trip_departures')
          .select('id')
          .eq('trip_id', (trip as { id: string }).id)
          .limit(1)
          .single();

        const { error } = await admin.from('bookings').insert({
          reference: `TEST-${Date.now().toString(36)}`,
          trip_departure_id: (departure as { id: string }).id,
          traveller_id: userId,
          contact_name: 'Booker',
          contact_email: email,
          participant_count: 1,
          snapshot_trip_title: 'Test trip',
          snapshot_trip_slug: 'test-trip',
          snapshot_destination: 'Testland',
          snapshot_departure_date: '2099-01-01',
          snapshot_price_amount: 1000,
          snapshot_price_currency: 'INR',
        });
        expect(error).toBeNull();

        await admin.from('bookings').delete().eq('traveller_id', userId);
      } finally {
        await cleanup(userId);
      }
    });

    it('15. guest bookings remain structurally valid: traveller_id may still be null', async () => {
      const { data: trip } = await admin.from('trips').select('id').limit(1).single();
      const { data: departure } = await admin
        .from('trip_departures')
        .select('id')
        .eq('trip_id', (trip as { id: string }).id)
        .limit(1)
        .single();

      const reference = `TEST-GUEST-${Date.now().toString(36)}`;
      const { error } = await admin.from('bookings').insert({
        reference,
        trip_departure_id: (departure as { id: string }).id,
        traveller_id: null,
        contact_name: 'Guest Booker',
        contact_email: 'guest@example.test',
        participant_count: 1,
        snapshot_trip_title: 'Test trip',
        snapshot_trip_slug: 'test-trip',
        snapshot_destination: 'Testland',
        snapshot_departure_date: '2099-01-01',
        snapshot_price_amount: 1000,
        snapshot_price_currency: 'INR',
      });
      expect(error).toBeNull();

      await admin.from('bookings').delete().eq('reference', reference);
    });
  },
);

describe.skipIf(hasCredentials && isReachable)('traveller authentication (not reachable)', () => {
  it('is skipped: no reachable local database configured', () => {
    expect(true).toBe(true);
  });
});
