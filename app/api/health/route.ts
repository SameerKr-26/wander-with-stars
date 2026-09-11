import { NextResponse } from 'next/server';

import { createClient } from '@/lib/supabase/server';

/**
 * Operational health check — GET /api/health
 *
 * Answers one question: can this deployment reach its configured Supabase
 * backend right now? It is meant for deploy smoke tests, uptime monitoring and
 * "is it me or is it the server" triage.
 *
 * Deliberate choices:
 *
 *   - Uses the ANON client (lib/supabase/server.ts), not the service-role
 *     client. A health check has no business bypassing RLS, and an endpoint
 *     that escalates privilege is an endpoint worth attacking. If this returns
 *     ok, it proves the path real users take is working — which is the point.
 *
 *   - Returns no configuration. No project URL, no keys, no table names, no
 *     row counts, no schema details. Callers get a status and a latency, which
 *     is everything a monitor needs and nothing an attacker can use.
 *
 *   - Raw driver messages are included only in development. In production they
 *     are replaced by a stable machine-readable code, so an error string can
 *     never leak internals into a log aggregator or a status page.
 */

// Never cache: a cached health check reports the past, which is worse than no
// health check at all.
export const dynamic = 'force-dynamic';
export const revalidate = 0;

/** Probes are capped so a hung backend fails fast instead of holding the request open. */
const PROBE_TIMEOUT_MS = 5_000;

/**
 * PostgREST codes meaning "the request arrived and was understood, but the
 * table does not exist". That is a successful connectivity result: it proves
 * we reached Supabase, authenticated, and got a considered answer. Until the
 * schema lands in Phase 5 this is the expected healthy response.
 */
const TABLE_MISSING_CODES = new Set(['PGRST205', 'PGRST202', '42P01']);

/** A table name that must never exist, so the probe cannot read real data. */
const PROBE_RELATION = '__wws_health_probe__';

type CheckStatus = 'ok' | 'error';

interface Check {
  status: CheckStatus;
  /* `| undefined` is required by exactOptionalPropertyTypes: these fields are
     genuinely absent in the healthy case, and conditionally spread below. */
  latencyMs?: number | undefined;
  detail?: string | undefined;
  code?: string | undefined;
}

const isDev = process.env.NODE_ENV !== 'production';

/** Only ever surfaces a driver message in development. */
function describe(error: unknown): string | undefined {
  if (!isDev) return undefined;
  if (error instanceof Error) return error.message;
  if (typeof error === 'string') return error;
  return undefined;
}

/** Shape of the error object supabase-js returns (rather than throws). */
interface DriverError {
  code?: string | undefined;
  message?: string | undefined;
}

/**
 * Distinguishes "we never got there" from "we got there and were refused".
 *
 * A DNS failure, TLS failure, paused project or timeout surfaces with no
 * PostgREST code, because no PostgREST was ever reached. Anything carrying a
 * code came back from Supabase itself.
 */
function isTransportFailure(error: DriverError): boolean {
  if (error.code && error.code.trim() !== '') return false;

  return /abort|timeout|timed out|fetch failed|network|ENOTFOUND|EAI_AGAIN|ECONNREFUSED|ETIMEDOUT/i.test(
    error.message ?? '',
  );
}

/** Development-only, and never includes the project URL or any key. */
function formatDriverError(error: DriverError): string | undefined {
  if (!isDev) return undefined;
  const code = error.code?.trim();
  const message = error.message?.trim() ?? 'unknown error';
  return code ? `${code}: ${message}` : message;
}

/**
 * Confirms the public configuration is present and well-formed.
 *
 * lib/env/client.ts throws on import when a variable is missing or malformed,
 * so reaching this module at all means validation passed. The import is what
 * proves it; this check reports that fact.
 */
async function checkEnvironment(): Promise<Check> {
  try {
    await import('@/lib/env/client');
    return { status: 'ok' };
  } catch (error) {
    return {
      status: 'error',
      code: 'ENV_INVALID',
      ...(describe(error) ? { detail: describe(error) } : {}),
    };
  }
}

/**
 * Confirms Supabase answers as this project, using the anon key.
 *
 * Distinguishes three outcomes that look alike from the outside:
 *   reachable          → ok
 *   reachable, but the key or project is wrong → error (UNAUTHORIZED)
 *   not reachable at all → error (UNREACHABLE)
 */
async function checkDatabase(): Promise<Check> {
  const startedAt = Date.now();

  try {
    const supabase = await createClient();

    const { error } = await supabase
      .from(PROBE_RELATION)
      .select('*')
      .limit(1)
      .abortSignal(AbortSignal.timeout(PROBE_TIMEOUT_MS));

    const latencyMs = Date.now() - startedAt;

    if (!error) {
      // Unexpected but healthy: something answered and the relation resolved.
      return { status: 'ok', latencyMs };
    }

    if (TABLE_MISSING_CODES.has(error.code)) {
      // The expected result until the schema exists. Supabase replied, so the
      // URL, the anon key and the network path are all good.
      return { status: 'ok', latencyMs };
    }

    // supabase-js reports transport failures as a returned error rather than a
    // thrown one, so they arrive here rather than in the catch below. Telling
    // the two apart matters: "we could not reach Supabase" and "Supabase said
    // no" send an on-call engineer to completely different places.
    return {
      status: 'error',
      latencyMs,
      code: isTransportFailure(error) ? 'UNREACHABLE' : 'REJECTED',
      ...(isDev ? { detail: formatDriverError(error) } : {}),
    };
  } catch (error) {
    // DNS failure, TLS failure, project paused, or the probe timed out.
    return {
      status: 'error',
      latencyMs: Date.now() - startedAt,
      code: 'UNREACHABLE',
      ...(describe(error) ? { detail: describe(error) } : {}),
    };
  }
}

export async function GET() {
  const [environment, database] = await Promise.all([checkEnvironment(), checkDatabase()]);

  const healthy = environment.status === 'ok' && database.status === 'ok';

  return NextResponse.json(
    {
      status: healthy ? 'ok' : 'error',
      timestamp: new Date().toISOString(),
      checks: { environment, database },
    },
    {
      // 503 tells a load balancer or uptime monitor to treat this instance as
      // out of service, which is the correct signal when the backend is gone.
      status: healthy ? 200 : 503,
      headers: {
        'Cache-Control': 'no-store, max-age=0',
      },
    },
  );
}
