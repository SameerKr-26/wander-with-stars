# Wander With Stars — Working Agreement

Context for any Claude Code session in this repository. Read this first.

## What this is

A production-grade social travel platform for Wander With Stars: curated,
creator-led group trips, traveller identity, communities, bookings and payments.

> Travel with people, not just packages.

Not a generic travel website, and not a prototype. Treat it as production.

## Source of truth

`docs/` is authoritative. Read the relevant document before making a decision it
covers. Do not contradict these casually — if implementation reality conflicts
with a document, raise the conflict before changing the document.

| Document | Use it for |
|---|---|
| `docs/PRODUCT_REQUIREMENTS.md` | Scope, personas, MVP boundaries |
| `docs/ARCHITECTURE.md` | Stack, domains, code organisation |
| `docs/DATABASE.md` | Schema, relationships, state models, indexes |
| `docs/SECURITY.md` | Non-negotiable security rules |
| `docs/RBAC.md` | Authoritative permission matrix |
| `docs/ROUTES.md` | URL structure |
| `docs/ROADMAP.md` | Phase order and exit criteria |
| `docs/DESIGN_SYSTEM.md` | Tokens, typography, surfaces, components |
| `docs/MOTION_SYSTEM.md` | Timing, easing, hover, reduced motion |
| `docs/UX_INTERACTION_GUIDE.md` | Interaction patterns, copy, states |

## Current position

Phase 1 (engineering foundation). Milestone 1A complete: repository, Next.js +
strict TypeScript, Tailwind, ESLint/Prettier, Supabase client architecture,
environment validation.

Not yet built: auth, database schema, trips, bookings, payments, community, AI,
admin. Do not assume any of these exist.

## Stack

Next.js (App Router) · TypeScript (strict) · Tailwind CSS · shadcn/ui ·
Supabase (Postgres, Auth, Storage, Realtime, Edge Functions) · Vercel.

Modular monolith. No microservices.

TypeScript is pinned to 5.x: `eslint-config-next` depends on `typescript-eslint`,
which does not yet support TypeScript 7. Revisit when that lands.

## Security — non-negotiable

1. The service-role key never reaches the browser. `lib/supabase/admin.ts`
   is guarded by `server-only`; do not weaken that.
2. Never trust the client for price, role, availability or booking state.
3. Never bypass RLS to make a query work — a blocked query is usually a policy
   bug. Escalating to the admin client is a decision, not a workaround.
4. Every protected table gets explicit RLS policies. No `using (true)` on
   private data, not even temporarily.
5. Payment state transitions are server-side and idempotent. Webhooks are
   cryptographically verified.
6. Audit-log privileged actions. Never log secrets.
7. No secrets in the repository. `.env.local` only.

## Which Supabase client?

| Client | When |
|---|---|
| `lib/supabase/client.ts` | Client Components. Anon key, RLS applies. |
| `lib/supabase/server.ts` | Server Components, Route Handlers, Server Actions. Acts as the signed-in user, RLS applies. **Default choice.** |
| `lib/supabase/admin.ts` | Only when there is no user session (webhooks) or the operation must bypass RLS — after authorising the caller yourself. |

## Conventions

- Strict TypeScript. No `any`, no unchecked non-null assertions. Fix types
  rather than silencing them.
- Server Components by default; `'use client'` only where interaction needs it.
- Validate all external input with Zod at the boundary.
- Never swallow errors silently.
- Small, composable components. No giant files. No duplicated business logic.
- Check `package.json` before adding a dependency.
- Style from design tokens. No arbitrary hex values in components.
- Every meaningful UI needs loading, empty and error states, keyboard and touch
  support, and a mobile layout that is not just the desktop one shrunk.

## Definition of done

Implementation → typecheck → lint → tests → authorisation check → responsive →
loading/error states → security review → docs updated → commit.

Run `npm run verify` (typecheck + lint + format) before committing.

## How to work

Milestones, not big bangs. Inspect first, state the intent, implement one
complete vertical slice, validate, summarise, then stop at the boundary. Do not
start the next milestone automatically.

Do not fabricate functionality, invent data, or claim something works without
having run it.
