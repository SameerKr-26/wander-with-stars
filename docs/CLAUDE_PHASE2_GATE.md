# WWS V2 — Phase 2 Design Implementation Gate

Before Claude begins Phase 2 implementation, it MUST read:
- docs/WWS_VISUAL_IDENTITY.md
- docs/MODULAR_FEATURE_ARCHITECTURE.md
- docs/DESIGN_SYSTEM.md
- docs/MOTION_SYSTEM.md
- docs/UX_INTERACTION_GUIDE.md

## Critical constraints

The approved visual direction is:
- bright cinematic travel
- warm-light base
- logo-derived WWS teal and yellow
- geometric bold typography
- restrained glass
- cinematic human-focused photography
- controlled motion
- signature star/flight-path language

Do not invent a competing aesthetic.

## Product architecture constraint

Optional internal systems (login, roles, creator portal, admin panels, finance, CRM, advanced community, AI) must be modular and removable without forcing a redesign of the public website.

The public experience must not reserve empty space or permanent navigation for features that may later be disabled.

## Phase 2 rule

Implement the design system and reusable visual primitives before constructing a complete homepage.

Do not build the full marketing site in a single step.

Milestone order:

1. Font evaluation and loading
2. Colour tokens
3. Surface/geometry tokens
4. Typography components
5. Buttons/links
6. Cards and image treatments
7. Glass primitives
8. Motion primitives
9. Navigation primitive
10. Responsive primitives
11. Visual QA page / component showcase

After the component showcase is complete and reviewed, stop.

Do not proceed to the full homepage until the product owner explicitly approves the visual system.
