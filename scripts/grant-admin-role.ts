/**
 * Provisions (or updates) an admin identity — Phase 4.3.
 *
 * Deliberately a script, not a UI: docs/RBAC.md reserves "Manage
 * users/roles" for Admin/Super Admin, and no admin-facing UI for that
 * exists yet (out of scope this phase — see the Phase 4.3 report). This is
 * the "smallest safe mechanism" instead: a human with the service-role key
 * runs it locally, against the local dev database, to create the first
 * admin account(s) to actually sign in and test the workflow with.
 *
 * Finds-or-creates the Supabase Auth user by email, then upserts their
 * `admin_roles` row. If the user is newly created, prints a one-time
 * temporary password — there is no self-service password reset flow yet
 * (out of scope; that belongs to the future traveller/admin account system,
 * Phase 4.5+), so change it via Supabase Studio or `auth.admin.updateUserById`
 * once signed in, or just re-run this script's underlying flow through Studio.
 *
 * Usage (local dev database only — see supabase/migrations/README.md):
 *
 *   npx tsx scripts/grant-admin-role.ts <email> <content_manager|admin|super_admin>
 */
import { existsSync, readFileSync } from 'node:fs';
import { randomUUID } from 'node:crypto';
import { resolve } from 'node:path';

import { createClient } from '@supabase/supabase-js';

import { ADMIN_ROLES, isAdminRole } from '../lib/admin/roles';

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

// Not `lib/supabase/admin.ts` — see scripts/seed-vietnam-draft.ts's own
// comment on why a standalone script can't import a module that pulls in
// `server-only`.
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
  const [, , email, role] = process.argv;
  if (!email || !role || !isAdminRole(role)) {
    console.error(`Usage: npx tsx scripts/grant-admin-role.ts <email> <${ADMIN_ROLES.join('|')}>`);
    process.exitCode = 1;
    return;
  }

  const supabase = createStandaloneAdminClient();

  // supabase-js's admin API has no `getUserByEmail`; listing and matching is
  // fine at this project's current, tiny admin-user scale.
  let userId: string | undefined;
  let page = 1;
  for (;;) {
    const { data, error } = await supabase.auth.admin.listUsers({ page, perPage: 200 });
    if (error) throw error;
    const match = data.users.find((u) => u.email?.toLowerCase() === email.toLowerCase());
    if (match) {
      userId = match.id;
      break;
    }
    if (data.users.length < 200) break;
    page += 1;
  }

  if (!userId) {
    const temporaryPassword = randomUUID();
    const { data, error } = await supabase.auth.admin.createUser({
      email,
      password: temporaryPassword,
      email_confirm: true,
    });
    if (error || !data.user)
      throw error ?? new Error('User creation failed with no error returned.');
    userId = data.user.id;
    console.log(`Created new user ${email} (id: ${userId}).`);
    console.log(`Temporary password: ${temporaryPassword}`);
    console.log(
      'There is no self-service reset yet — change it via Supabase Studio after first sign-in.',
    );
  } else {
    console.log(`Found existing user ${email} (id: ${userId}).`);
  }

  const { error: upsertError } = await supabase
    .from('admin_roles')
    .upsert({ id: userId, role }, { onConflict: 'id' });
  if (upsertError) throw upsertError;

  console.log(`Granted role "${role}" to ${email}.`);
}

main().catch((error: unknown) => {
  console.error(error);
  process.exitCode = 1;
});
