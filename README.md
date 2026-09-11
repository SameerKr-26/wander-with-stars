# Wander With Stars

A production-grade social travel platform for curated, creator-led group adventures.

> Travel with people, not just packages.

Wander With Stars combines curated group travel, creator-led trips, traveller
identity, trip communities, personalisation and AI assistance into a single
product loop:

> Discover → Understand → Match → Book → Meet your people → Prepare → Travel →
> Share → Review → Refer → Travel again

## Status

**Phase 1 — engineering foundation.** Milestone 1A is complete: repository,
Next.js with strict TypeScript, Tailwind, ESLint/Prettier, environment
validation and the Supabase client architecture.

The product itself is not built yet. There is no authentication, database
schema, trip catalogue, booking flow or admin area. See `docs/ROADMAP.md`.

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

## Project structure

```text
app/          Next.js App Router routes
components/   Reusable UI (components/ui holds shadcn primitives)
lib/          env validation, Supabase clients, shared utilities
supabase/     migrations and edge functions
docs/         source-of-truth product, architecture and design documents
tests/        unit, integration and end-to-end tests
```

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
