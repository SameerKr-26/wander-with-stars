import type { NextRequest } from 'next/server';

import { updateSession } from '@/lib/supabase/middleware';

/**
 * Request proxy — runs before every matched request.
 *
 * Next 16 renamed this file convention from `middleware` to `proxy`; the
 * behaviour is unchanged. Its only job here is refreshing the Supabase auth
 * session (see lib/supabase/middleware.ts for why that has to happen here).
 */
export default async function proxy(request: NextRequest) {
  return await updateSession(request);
}

export const config = {
  /**
   * Run on every request except static assets, which never carry a session and
   * would only add latency and Supabase Auth traffic.
   *
   * Excluded: Next.js internals (_next/static, _next/image), the favicon, and
   * common image/font extensions — brand assets under /brand included.
   *
   * Note that /api routes ARE matched: Route Handlers read the session from
   * cookies too, so they need the same refresh.
   */
  matcher: [
    '/((?!_next/static|_next/image|favicon.ico|.*\.(?:svg|png|jpg|jpeg|gif|webp|avif|ico|woff|woff2|ttf|otf)$).*)',
  ],
};
