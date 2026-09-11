# Wander With Stars

A production-grade social travel platform for curated, creator-led group adventures.

> Travel with people, not just packages.

Wander With Stars combines curated group travel, creator-led trips, traveller
identity, trip communities, personalisation and AI assistance into a single
product loop:

> Discover → Understand → Match → Book → Meet your people → Prepare → Travel →
> Share → Review → Refer → Travel again

## Status

**Phase 1 — engineering foundation.** Milestones 1A and 1B are complete:
repository, Next.js with strict TypeScript, Tailwind, ESLint/Prettier,
environment validation, the Supabase client architecture, auth session refresh,
a health-check endpoint, design-token infrastructure and CI.

The product itself is not built yet. There is no authentication UI, database
schema, trip catalogue, booking flow or admin area. See `docs/ROADMAP.md`.

**The visual design is deliberately undecided.** Token *names* exist in
`styles/tokens.css`; their *values* are placeholders awaiting the
design-direction session. Nothing in this repository should be read as the WWS
visual identity.

## Stack

- **Next.js** (App Router) + **TypeScript** (strict)
- **Tailwind CSS** + **shadcn/ui**
- **Supabase** — PostgreSQL, Auth, Storage, Realtime, Edge Functions
- **Vercel** for deployment

Architecture is a modular monolith with explicit domain boundaries.

## Getting started

### Prerequisites

- Node.js >= 20.9
- A **development** Supabase project (never point local work at production)
- Supabase CLI — optional until Phase 5, needed for migrations and type generation

### Setup

```bash
npm install
cp .env.example .env.local   # PowerShell: copy .env.example .env.local
```

Fill in `.env.local` with your development Supabase credentials — see
`.env.example`, which documents where each value comes from. `.env.local` is
gitignored and must never be committed.

```bash
npm run dev
```

The app runs at http://localhost:3000.

## Scripts

| Script | Purpose |
|---|---|
| `npm run dev` | Start the development server |
| `npm run build` | Production build (fails on type errors) |
| `npm run start` | Serve the production build |
| `npm run typecheck` | `tsc --noEmit` |
| `npm run lint` | ESLint |
| `npm run format` | Apply Prettier |
| `npm run verify` | typecheck + lint + format check — run before committing |
| `npm run db:types` | Regenerate Supabase types (requires the CLI) |

## Health check

```
GET /api/health
```

Verifies that this deployment can reach its configured Supabase backend. Returns
`200` when healthy and `503` when not, so an uptime monitor or load balancer can
act on it.

```jsonc
{
  "status": "ok",
  "timestamp": "2026-09-12T10:00:00.000Z",
  "checks": {
    "environment": { "status": "ok" },
    "database": { "status": "ok", "latencyMs": 92 },
  },
}
```

It uses the anon client, so a healthy result proves the path real users take is
working. It returns no configuration — no project URL, keys, table names or row
counts — and driver messages appear only in development. Failures are reported
as `UNREACHABLE` (network, DNS, paused project, timeout) or `REJECTED`
(Supabase answered and refused, usually a wrong or rotated key), because those
two send you to completely different places.

Until the schema exists, "table not found" is the expected healthy answer: it
proves Supabase replied.

## Project structure

```text
proxy.ts      auth session refresh (Next 16 renamed this from middleware.ts)
app/          Next.js App Router routes, including api/health
components/   Reusable UI (components/ui holds shadcn primitives)
lib/          env validation, Supabase clients, shared utilities
styles/       design token infrastructure
supabase/     CLI config and migrations
docs/         source-of-truth product, architecture and design documents
tests/        unit, integration and end-to-end tests
```

## Continuous integration

`.github/workflows/ci.yml` runs typecheck, lint and format check on every push
and pull request to `main`. It contains no secrets and needs none.

The build is not run in CI: it inlines `NEXT_PUBLIC_*` values and fails fast
without them, so including it would mean committing placeholder Supabase values.
Build verification happens in the Vercel Preview deployment on each pull
request, which has the real configuration.

## Documentation

`docs/` is the source of truth. Read the relevant document before making a
decision it covers.

| Document | Covers |
|---|---|
| [PRODUCT_REQUIREMENTS.md](docs/PRODUCT_REQUIREMENTS.md) | Vision, personas, scope, MVP boundaries |
| [ARCHITECTURE.md](docs/ARCHITECTURE.md) | Stack, domains, code organisation, testing strategy |
| [DATABASE.md](docs/DATABASE.md) | Schema, relationships, state models, indexing, RLS notes |
| [SECURITY.md](docs/SECURITY.md) | Security rules, RLS, payments, webhooks, privacy |
| [RBAC.md](docs/RBAC.md) | Role and permission matrix |
| [ROUTES.md](docs/ROUTES.md) | URL map |
| [ROADMAP.md](docs/ROADMAP.md) | Delivery phases and exit criteria |
| [DESIGN_SYSTEM.md](docs/DESIGN_SYSTEM.md) | Tokens, typography, surfaces, components |
| [MOTION_SYSTEM.md](docs/MOTION_SYSTEM.md) | Timing, easing, hover, reduced motion |
| [UX_INTERACTION_GUIDE.md](docs/UX_INTERACTION_GUIDE.md) | Interaction patterns, copy, states |
| [WWS_V2_CHAT_MEMORY.md](docs/WWS_V2_CHAT_MEMORY.md) | Planning context handoff |

`CLAUDE.md` holds the working agreement for AI-assisted development.

## Security

Security is non-negotiable. In short:

- The Supabase service-role key never reaches the browser. `lib/supabase/admin.ts`
  is guarded by `server-only`, enforced at build time.
- Row Level Security is enabled on protected tables and is never bypassed for
  convenience.
- Price, role, availability and booking state are never trusted from the client.
- Payment flows are server-verified and idempotent; webhooks are cryptographically
  verified.

Full rules in [docs/SECURITY.md](docs/SECURITY.md).
