import { createServerClient } from '@supabase/ssr';
import { NextResponse, type NextRequest } from 'next/server';

import { clientEnv } from '@/lib/env/client';

/**
 * Refresh the Supabase auth session on every matched request.
 *
 * Supabase access tokens are short-lived. Server Components cannot write
 * cookies, so without this middleware a refreshed token would be issued and
 * then silently discarded, and the user would appear logged out at random.
 * Middleware is the one place in the App Router that can both read the request
 * cookies and write them back onto the response.
 *
 * Two rules keep this correct, and both are easy to break by accident:
 *
 *   1. `supabase.auth.getUser()` must be called. It revalidates the token with
 *      the Auth server and triggers the refresh. Never substitute `getSession()`
 *      here — it decodes the cookie without verifying it, so it will happily
 *      report a user from a forged or expired token.
 *
 *   2. The response object returned from `setAll` must be the one returned from
 *      this function. Building a fresh `NextResponse` afterwards drops the
 *      refreshed cookies, which logs the user out on the next request.
 *
 * No authorisation happens here. Route protection needs somewhere to redirect
 * to, and no auth pages exist yet — that arrives with Phase 4. Authorisation is
 * enforced server-side and by RLS regardless; middleware is a session concern,
 * not a security boundary (docs/SECURITY.md §4).
 */
export async function updateSession(request: NextRequest): Promise<NextResponse> {
  let supabaseResponse = NextResponse.next({ request });

  const supabase = createServerClient(
    clientEnv.NEXT_PUBLIC_SUPABASE_URL,
    clientEnv.NEXT_PUBLIC_SUPABASE_ANON_KEY,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet) {
          for (const { name, value } of cookiesToSet) {
            request.cookies.set(name, value);
          }

          supabaseResponse = NextResponse.next({ request });

          for (const { name, value, options } of cookiesToSet) {
            supabaseResponse.cookies.set(name, value, options);
          }
        },
      },
    },
  );

  // Do not remove: this is what actually performs the refresh.
  await supabase.auth.getUser();

  return supabaseResponse;
}
