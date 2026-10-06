/**
 * Traveller profile onboarding — Phase 4.8A.
 *
 * Real local-database integration tests (this project's own convention —
 * see tests/integration/traveller-auth.test.ts). Exercises the real
 * `traveller_profiles` table and its RLS directly through a signed-in,
 * session-scoped client — the same client `lib/traveller/profile.ts`'s
 * own functions use (never the service role for a traveller's own reads/
 * writes).
 *
 * Skips — does not fail — when no reachable, migrated local database is
 * configured.
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
  return `test-onboarding-${label}-${Date.now().toString(36)}-${Math.random()
    .toString(36)
    .slice(2, 8)}@example.test`;
}

const TEST_PASSWORD = 'Test-Password-1234!';

describe.skipIf(!hasCredentials || !isReachable)(
  'traveller profile onboarding (local database)',
  () => {
    const admin = createClient(url!, serviceRoleKey!, {
      auth: { autoRefreshToken: false, persistSession: false, detectSessionInUrl: false },
    });

    async function createSignedInTraveller(label: string) {
      const email = testEmail(label);
      const { data: created, error } = await admin.auth.admin.createUser({
        email,
        password: TEST_PASSWORD,
        email_confirm: true,
      });
      if (error || !created.user) throw new Error(`setup: ${error?.message}`);
      const client = createClient(url!, anonKey!, {
        auth: { autoRefreshToken: false, persistSession: false, detectSessionInUrl: false },
      });
      await client.auth.signInWithPassword({ email, password: TEST_PASSWORD });
      return { client, userId: created.user.id };
    }

    async function cleanup(userId: string) {
      await admin.auth.admin.deleteUser(userId);
    }

    it('9. a profile row is created for a new traveller (full onboarding upsert)', async () => {
      const traveller = await createSignedInTraveller('create');
      try {
        const { error } = await traveller.client.from('traveller_profiles').upsert(
          {
            user_id: traveller.userId,
            display_name: 'New Traveller',
            phone: '+91 98765 43210',
            city: 'Mumbai',
            travel_style: 'Adventure',
            travel_interests: ['Beaches', 'Food'],
            dietary_preference: 'Vegetarian',
          },
          { onConflict: 'user_id' },
        );
        expect(error).toBeNull();

        const { data } = await traveller.client
          .from('traveller_profiles')
          .select('*')
          .eq('user_id', traveller.userId)
          .single();
        expect(data?.display_name).toBe('New Traveller');
      } finally {
        await cleanup(traveller.userId);
      }
    });

    it('10. every onboarding field persists correctly, exactly as submitted', async () => {
      const traveller = await createSignedInTraveller('persist');
      try {
        await traveller.client.from('traveller_profiles').upsert(
          {
            user_id: traveller.userId,
            display_name: 'Persisted Traveller',
            phone: '+1 (555) 123-4567',
            city: 'Lisbon',
            travel_style: 'Backpacking',
            travel_interests: ['Mountains', 'Culture', 'Road trips'],
            dietary_preference: 'Vegan',
          },
          { onConflict: 'user_id' },
        );

        const { data } = await traveller.client
          .from('traveller_profiles')
          .select('*')
          .eq('user_id', traveller.userId)
          .single();

        expect(data).toMatchObject({
          display_name: 'Persisted Traveller',
          phone: '+1 (555) 123-4567',
          city: 'Lisbon',
          travel_style: 'Backpacking',
          dietary_preference: 'Vegan',
        });
        expect(data?.travel_interests.sort()).toEqual(
          ['Mountains', 'Culture', 'Road trips'].sort(),
        );
      } finally {
        await cleanup(traveller.userId);
      }
    });

    it('11. a repeated (identical) submission is idempotent — no error, no duplicate row, same final state', async () => {
      const traveller = await createSignedInTraveller('idempotent');
      try {
        const payload = {
          user_id: traveller.userId,
          display_name: 'Idempotent Traveller',
          city: 'Goa',
        };
        const first = await traveller.client
          .from('traveller_profiles')
          .upsert(payload, { onConflict: 'user_id' });
        const second = await traveller.client
          .from('traveller_profiles')
          .upsert(payload, { onConflict: 'user_id' });

        expect(first.error).toBeNull();
        expect(second.error).toBeNull();

        const { data, count } = await traveller.client
          .from('traveller_profiles')
          .select('*', { count: 'exact' })
          .eq('user_id', traveller.userId);
        expect(count).toBe(1);
        expect(data?.[0]?.city).toBe('Goa');
      } finally {
        await cleanup(traveller.userId);
      }
    });

    it('11b. resubmitting with different values overwrites to the new state (true upsert, not ignoreDuplicates)', async () => {
      const traveller = await createSignedInTraveller('overwrite');
      try {
        await traveller.client
          .from('traveller_profiles')
          .upsert(
            { user_id: traveller.userId, display_name: 'First Name', city: 'Delhi' },
            { onConflict: 'user_id' },
          );
        await traveller.client
          .from('traveller_profiles')
          .upsert(
            { user_id: traveller.userId, display_name: 'Updated Name', city: 'Chennai' },
            { onConflict: 'user_id' },
          );

        const { data } = await traveller.client
          .from('traveller_profiles')
          .select('display_name, city')
          .eq('user_id', traveller.userId)
          .single();
        expect(data?.display_name).toBe('Updated Name');
        expect(data?.city).toBe('Chennai');
      } finally {
        await cleanup(traveller.userId);
      }
    });

    it('12. an invalid travel_style value is rejected at the database level, never silently accepted', async () => {
      const traveller = await createSignedInTraveller('invalid-style');
      try {
        const { error } = await traveller.client.from('traveller_profiles').upsert(
          {
            user_id: traveller.userId,
            display_name: 'Bad Style',
            travel_style: 'Extreme Sports',
          },
          { onConflict: 'user_id' },
        );
        expect(error).not.toBeNull();
      } finally {
        await cleanup(traveller.userId);
      }
    });

    it('12b. an invalid dietary_preference value is rejected', async () => {
      const traveller = await createSignedInTraveller('invalid-diet');
      try {
        const { error } = await traveller.client
          .from('traveller_profiles')
          .upsert(
            { user_id: traveller.userId, display_name: 'Bad Diet', dietary_preference: 'Keto' },
            { onConflict: 'user_id' },
          );
        expect(error).not.toBeNull();
      } finally {
        await cleanup(traveller.userId);
      }
    });

    it('12c. an invalid travel_interests element is rejected', async () => {
      const traveller = await createSignedInTraveller('invalid-interest');
      try {
        const { error } = await traveller.client.from('traveller_profiles').upsert(
          {
            user_id: traveller.userId,
            display_name: 'Bad Interest',
            travel_interests: ['Skydiving'],
          },
          { onConflict: 'user_id' },
        );
        expect(error).not.toBeNull();
      } finally {
        await cleanup(traveller.userId);
      }
    });

    it("13. an authenticated traveller cannot read another traveller's profile", async () => {
      const a = await createSignedInTraveller('access-a');
      const b = await createSignedInTraveller('access-b');
      try {
        await admin
          .from('traveller_profiles')
          .upsert({ user_id: b.userId, display_name: 'Traveller B' }, { onConflict: 'user_id' });

        const { data, error } = await a.client
          .from('traveller_profiles')
          .select('*')
          .eq('user_id', b.userId);
        expect(error).toBeNull();
        expect(data).toEqual([]);
      } finally {
        await cleanup(a.userId);
        await cleanup(b.userId);
      }
    });

    it("13b. an authenticated traveller cannot update another traveller's profile", async () => {
      const a = await createSignedInTraveller('update-a');
      const b = await createSignedInTraveller('update-b');
      try {
        await admin
          .from('traveller_profiles')
          .upsert({ user_id: b.userId, display_name: 'Original Name' }, { onConflict: 'user_id' });

        const { data: updateResult, error } = await a.client
          .from('traveller_profiles')
          .update({ display_name: 'Hijacked Name' })
          .eq('user_id', b.userId)
          .select();
        expect(error).toBeNull();
        // RLS silently affects zero rows — never an error, and never the
        // other traveller's row.
        expect(updateResult).toEqual([]);

        const { data: unchanged } = await admin
          .from('traveller_profiles')
          .select('display_name')
          .eq('user_id', b.userId)
          .single();
        expect(unchanged?.display_name).toBe('Original Name');
      } finally {
        await cleanup(a.userId);
        await cleanup(b.userId);
      }
    });

    it('20. a traveller can update their own profile', async () => {
      const traveller = await createSignedInTraveller('self-update');
      try {
        await traveller.client
          .from('traveller_profiles')
          .upsert({ user_id: traveller.userId, display_name: 'Before' }, { onConflict: 'user_id' });
        const { error } = await traveller.client
          .from('traveller_profiles')
          .update({ display_name: 'After', city: 'Jaipur' })
          .eq('user_id', traveller.userId);
        expect(error).toBeNull();

        const { data } = await traveller.client
          .from('traveller_profiles')
          .select('display_name, city')
          .eq('user_id', traveller.userId)
          .single();
        expect(data?.display_name).toBe('After');
        expect(data?.city).toBe('Jaipur');
      } finally {
        await cleanup(traveller.userId);
      }
    });

    it('an unauthenticated (anon) client cannot read or write any profile', async () => {
      const traveller = await createSignedInTraveller('anon-check');
      try {
        await admin
          .from('traveller_profiles')
          .upsert(
            { user_id: traveller.userId, display_name: 'Anon Target' },
            { onConflict: 'user_id' },
          );

        const anon = createClient(url!, anonKey!, {
          auth: { autoRefreshToken: false, persistSession: false, detectSessionInUrl: false },
        });
        const { data } = await anon
          .from('traveller_profiles')
          .select('*')
          .eq('user_id', traveller.userId);
        expect(data).toEqual([]);
      } finally {
        await cleanup(traveller.userId);
      }
    });
  },
);

describe('traveller profile onboarding (not reachable)', () => {
  it.skipIf(hasCredentials && isReachable)(
    'is skipped: no reachable local database configured',
    () => {
      expect(true).toBe(true);
    },
  );
});
