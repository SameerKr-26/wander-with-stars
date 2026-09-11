# Wander With Stars V2 — Delivery Roadmap

## Phase 0 — Product foundation

Deliver:
- Product requirements
- Personas
- User journeys
- Sitemap
- Architecture
- Database model
- RLS/RBAC plan
- Security rules
- Design language

Exit criteria:
- Major domains are agreed
- MVP boundaries are clear
- No feature is being implemented without a defined owner/domain

## Phase 1 — Engineering foundation

Deliver:
- Next.js
- TypeScript strict mode
- Tailwind
- shadcn/ui
- Linting/formatting
- Environment validation
- Supabase client architecture
- Base layout
- GitHub repo
- Vercel preview deployment

Exit criteria:
- CI/checks pass
- Preview deploy works
- No production secrets in repo

## Phase 2 — Design system

Deliver:
- Typography
- Color tokens
- Surfaces
- Glass layers
- Radius
- Shadows
- Grid
- Spacing
- Buttons
- Cards
- Forms
- Navigation
- Toasts
- Dialogs
- Loading/error states
- Motion primitives

Exit criteria:
- Core components reusable
- Design tokens are centralized
- Visual changes can be made without hunting through arbitrary pages

## Phase 3 — Public website

Deliver:
- Homepage
- Explore/trips
- Trip detail
- About
- FAQ
- Contact
- SEO
- Responsive mobile experience

## Phase 4 — Auth & profile

Deliver:
- Signup
- Login
- Password recovery
- Auth callback
- Profile
- Travel preferences
- Onboarding

## Phase 5 — Database-driven travel catalogue

Replace hard-coded/mock trip data.

Deliver:
- Trips
- Departures
- Itineraries
- Hosts
- Media
- Inclusions/exclusions
- Availability

## Phase 6 — Booking & payments

Deliver:
- Booking flow
- Traveller details
- Price calculation
- Availability validation
- Coupon validation
- Payment initiation
- Webhook verification
- Booking state machine
- Confirmation

## Phase 7 — Traveller dashboard

Deliver:
- Upcoming trip
- Booking details
- Payment status
- Documents
- Checklist
- Wishlist

## Phase 8 — Operations/Admin

Deliver:
- Trip management
- Departure management
- Capacity
- Booking management
- Customer management
- Payments
- Leads
- Analytics foundation
- Audit logs

## Phase 9 — Community

Deliver:
- Trip communities
- Membership
- Announcements
- Introductions
- Posts/comments
- Moderation
- Reporting
- Notifications

## Phase 10 — Personalisation

Deliver:
- Travel profile
- Trip personality
- Preference quiz
- Recommendations
- Privacy controls

## Phase 11 — AI

Deliver in order:
1. Grounded WWS AI Concierge
2. AI Trip Matcher
3. Admin Operations Copilot

## Phase 12 — Creator ecosystem

Deliver:
- Creator profiles
- Applications
- Hosted trips
- Deliverables
- Content
- Performance
- Earnings

## Phase 13 — Production hardening

Required before broad public launch:
- Security review
- RLS review
- RBAC tests
- Performance profiling
- E2E critical flows
- Accessibility review
- SEO audit
- Webhook reliability tests
- Error monitoring
- Analytics validation
- Backup/recovery procedures

## Milestone rule

Every feature is done only after:

Implementation + Type checking + Lint + Tests + Authorization check + Responsive UI + Loading/error states + Security review + Documentation + Git commit

## Vibe-coding rule

Never ask Claude to generate the entire application at once.

Work in vertical slices:

Requirement → Design → Data → Backend → UI → Test → Review → Commit
