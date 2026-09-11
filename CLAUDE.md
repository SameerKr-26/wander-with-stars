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

Phase 1 (engineering foundation), milestones 1A and 1B complete: repository,
Next.js + strict TypeScript, Tailwind, ESLint/Prettier, Supabase client
architecture, environment validation, session refresh (`proxy.ts`),
`/api/health`, design-token infrastructure, CI.

Not yet built: auth UI, database schema, trips, bookings, payments, community,
AI, admin. Do not assume any of these exist.

### Visual design — what is locked, what is not

`docs/WWS_VISUAL_IDENTITY.md` is a **visual contract** (§22). Implement it;
do not reinterpret it without approval.

**Locked by the product owner — never change, never add siblings ad hoc:**

| Token | Value | Use |
|---|---|---|
| `--wws-teal-core` | `#0497B2` | Fills, icons, large display. **Never body text** (3.35:1 on ivory) |
| `--wws-teal-medium` | `#00758A` | Solid brand surfaces, buttons |
| `--wws-teal-text` | `#006D7A` | Body-size teal text and links (5.87:1) |
| `--wws-teal-deep` | `#005F73` | Strongest teal, dark surfaces (7.06:1) |
| `--wws-yellow-core` | `#FEDE59` | Accent/fill only, 5–10% presence. **Never text on light** |
| `--wws-ivory` | `#FFFBF5` | Page base |
| `--wws-charcoal` | `#142126` | Default text |

Primary typeface: **Manrope**, locked. Loaded via `next/font` in
`app/layout.tsx` at weights 400/500/600/700/800 only.

Never introduce a colour outside this set. Where a softer tone is needed,
derive it with `color-mix()` from a locked primitive, as `styles/tokens.css`
already does — that keeps the palette closed.

Components reference **semantic roles** (`--color-text-brand`,
`--color-surface`), never brand primitives and never raw hex.

**Still not decided:** the type size scale (provisional, marked in the token
file), and every component's visual design. Buttons, cards, image treatments,
glass, motion, navigation and responsive primitives are milestones 5–10 and
are **not** built. Do not build product UI or the homepage until the product
owner approves the specimen at `/design-system`.

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
- Style through tokens from `styles/tokens.css` — `var(--color-surface)` or the
  generated utility, never a literal colour, radius or duration. A component
  written against tokens survives the design direction landing; one written
  against `#ffffff` does not.
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

<!-- BEGIN:nextjs-agent-rules -->

# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` (resolved from this file's directory; in monorepos the `next` package may not be visible from the repo root) before writing any code. Heed deprecation notices.

This block is written and re-added by `next dev` — verify at `node_modules/next/dist/server/lib/generate-agent-files.js`. Removing it from a diff only re-creates the uncommitted change; committing it with your work keeps the tree clean.

<!-- END:nextjs-agent-rules -->
