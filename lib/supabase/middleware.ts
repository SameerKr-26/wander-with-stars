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
 * Route protection: `/admin/*` (except `/admin/login` itself) redirects a
 * signed-out visitor to the login page — a UX convenience only. It is
 * deliberately NOT the security boundary (docs/SECURITY.md §4): this check
 * only proves a valid session exists, never which role it holds, so a
 * signed-in traveller with no `admin_roles` row would sail past it. The
 * real gate is `lib/admin/authorize.ts`'s `requireAdminRole`, which every
 * admin Server Component and Server Action calls again independently.
 *
 * `/dashboard/*` gets the identical treatment (Phase 4.5) — redirect a
 * signed-out visitor to `/login`, same UX-convenience-not-security-boundary
 * caveat. The real gate there is `app/dashboard/layout.tsx`'s own session
 * check plus `traveller_profiles`'s RLS, not this redirect. Every other
 * route (public marketing, trip pages) is untouched: this only ever adds a
 * redirect for these two prefixes, never a blanket auth requirement.
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
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const { pathname } = request.nextUrl;
  if (pathname.startsWith('/admin') && pathname !== '/admin/login' && !user) {
    const loginUrl = request.nextUrl.clone();
    loginUrl.pathname = '/admin/login';
    return NextResponse.redirect(loginUrl);
  }

  if (pathname.startsWith('/dashboard') && !user) {
    const loginUrl = request.nextUrl.clone();
    loginUrl.pathname = '/login';
    return NextResponse.redirect(loginUrl);
  }

  return supabaseResponse;
}
