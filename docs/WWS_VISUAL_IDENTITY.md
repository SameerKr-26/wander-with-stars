# Wander With Stars V2 — Final Visual Identity Specification

## Status
Approved direction for Phase 2 implementation, subject to visual QA against the WWS logo asset.

## 1. Brand thesis

Wander With Stars is a bright, cinematic social-travel product.

The visual language combines:
- Bright travel energy
- Social warmth
- Sophisticated technology
- Human-focused photography
- Bold, playful typography

The product must feel like:

> A modern travel film became a social product.

It must NOT become a generic dark-mode AI startup, generic SaaS dashboard, or overly luxurious black-and-white travel site.

## 2. Brand source of truth

The provided WWS logo is the primary visual reference for brand colours, proportions, visual energy, and motif language.

Current sampled logo colours are approximately:
- WWS Teal: RGB 4,151,178 / #0497B2
- WWS Yellow: RGB 254,222,89 / #FEDE59

For implementation, treat these sampled values as the starting source of truth and visually QA all rendered usage against the actual logo. Do not casually substitute a nearby teal/yellow.

Create a semantic palette around the logo colours, but keep the two core brand colours stable.

> **Implementation note.** The sampled values are confirmed: measured directly
> from the supplied artwork as `#0696B1` and `#FEDE5A`, within 2/255 of the
> values above, with the difference attributable to JPEG compression. The
> documented values are used as the source of truth.
>
> The brand asset itself is **pending replacement** and is not in version
> control — see `public/brand/README.md`. Visual QA against the logo therefore
> uses an untracked local working copy, and no production UI may depend on a
> brand asset until a committed replacement exists.

## 3. Core palette

### Brand
- `--wws-teal-500`: #0497B2 (logo-derived core)
- `--wws-yellow-500`: #FEDE59 (logo-derived core)

### Supporting teal scale
Use progressively lighter/darker tints of the core hue for states and backgrounds. Do not change hue family unnecessarily.

Suggested semantic roles:
- `--wws-teal-50`
- `--wws-teal-100`
- `--wws-teal-200`
- `--wws-teal-300`
- `--wws-teal-400`
- `--wws-teal-500`
- `--wws-teal-600`
- `--wws-teal-700`
- `--wws-teal-800`
- `--wws-teal-900`

### Supporting yellow scale
Likewise derive lighter/darker yellow states from `#FEDE59`.

## 4. Background system

Primary page background should be warm/light rather than dark-first.

Base:
- Warm ivory approximately `#FFFBF5`

Water-light surfaces may use very pale teal tints.

Recommended conceptual backgrounds:
- Warm ivory
- White
- Near-white teal
- Extremely subtle teal-to-white washes

A water-like background effect is permitted when it remains subtle and calm. It should resemble light reflected through water, not a loud gradient.

Use gradients primarily in large background regions, hero atmosphere, section transitions, and occasional ambient surfaces.

Do not use gradients on every card/button.

## 5. Typography

### Desired personality
- Bold
- Geometric
- Playful
- Modern
- High-impact
- Clean enough for product UX

The wordmark itself appears to be a custom/brand treatment rather than something that should be assumed to map exactly to a publicly available font.

For the application UI, start by evaluating geometric families in this order:

1. Manrope
2. Plus Jakarta Sans
3. Sora

Final font choice must be visually compared to the logo wordmark before being locked.

Do not use Arial, Open Sans, or a generic default stack as the primary brand typeface unless a later explicit decision overrides this document.

### Weight hierarchy
- 400: body
- 500: emphasis
- 600: labels/navigation
- 700: headings
- 800: hero/display

### Typography hierarchy
- Hero/display: extremely bold and spacious
- Section headings: bold and editorial
- Card titles: strong but compact
- Body: highly readable
- Metadata: restrained
- Numbers/prices: visually confident

Rule:

> Headlines = personality
> Body = clarity
> Numbers = confidence
> Metadata = restraint

## 6. Text colours

Use the logo colours intentionally rather than colouring all typography teal/yellow.

Default text:
- Deep charcoal / near-black for readability

Brand text:
- WWS Teal for selected labels, key links, and occasional emphasis

Accent text:
- WWS Yellow primarily on dark/teal surfaces or for small emphasis where contrast is safe

Never use yellow as normal paragraph text on a light background if contrast is inadequate.

## 7. Yellow usage

Target roughly 5–10% visual presence.

Use for:
- Important numbers
- Availability highlights
- Selected states
- Micro-icons
- Small accents
- Key moments in the travel story
- Brand highlights

Do not make large sections predominantly yellow unless intentionally designed as a campaign moment.

## 8. Geometry

Avoid excessive rounded SaaS aesthetics.

Use:
- Large feature panels: approximately 20–24px
- Standard cards: approximately 12–16px
- Buttons: approximately 10–12px
- Inputs: approximately 10–12px
- Pills only when semantically useful

Occasionally introduce slightly squared editorial frames, vertical dividers, and asymmetric layouts.

## 9. Glass system

Glass is an accent, not the dominant design language.

Use it for:
- Floating hero panels
- Sticky/scrolling navigation
- Image overlays
- Selected filters
- Selected feature panels

Do not make every card glass.

Desired glass character:
- White or very subtle teal tint
- Medium backdrop blur
- Thin light border
- Soft shadow
- High readability

## 10. Photography

Photography is a primary brand element.

Prefer:
- Real human moments
- Group interactions
- Candid travel scenes
- Food
- Night markets
- Airport/departure moments
- Activities
- Creator moments
- Landscape as context

Target visual ratio:
- General site: approximately 50% people / 50% destinations
- Community: approximately 70% people / 30% destinations

Avoid generic stock-photo composition where possible.

## 11. Trip media model

A trip can contain:
- Hero image/video
- Gallery
- Destination media
- Day-by-day itinerary media
- Activity media
- Creator media
- Traveller memories
- Post-trip stories

The UI should let real itinerary content drive the visual narrative.

## 12. Trip page visual language

Recommended sequence:

Hero → Trip identity → Atmosphere → Journey → Day-by-day story → Map → Who's going → Host/creator → Inclusions → Trust → Community → Booking

The itinerary should feel like a journey rather than a spreadsheet.

Use the flight-path motif selectively to connect places/days.

## 13. Signature motifs

### Stars
Use small symbols such as:
- ✦
- ✧
- ⋆

For:
- section markers
- ratings
- separators
- micro-details

### Flight path
Use dotted routes and subtle airplane markers for:
- itinerary
- destination transitions
- chapter transitions

### Location pin
Use sparingly for places and map context.

### Palm/tropical motif
Use only where destination/context supports it. Do not repeat the palm icon throughout the UI.

## 14. Motion

Overall style: cinematic but restrained.

Timing:
- Micro: 120–180ms
- Standard: 180–240ms
- Cards: 220–320ms
- Modals: 250–400ms
- Section reveals: 600–750ms
- Hero/cinematic: 700–1200ms

Section reveal:
- opacity 0 → 1
- translateY ~32px → 0

Image hover:
- scale approximately 1.03–1.05

Card hover:
- translateY approximately -5px
- subtle surface/shadow increase
- secondary information reveal

Button press:
- subtle compression around scale(0.98)

Motion must respect `prefers-reduced-motion`.

## 15. Navbar

Initial hero state:
- visually light/transparent
- readable over the hero

After scrolling:
- translucent surface
- backdrop blur
- subtle border
- very soft shadow
- slightly compressed height

Reveal navigation on upward scroll when helpful.

## 16. Hover and progressive disclosure

Trip cards should show primary information by default:
- destination
- trip name
- date
- duration
- price
- availability

Desktop hover/focus may reveal:
- atmosphere
- traveller count
- host
- social/adventure profile
- CTA

Essential booking information must NEVER require hover.

On mobile, secondary information must be visible or tap-revealed.

## 17. Journey vs Control

### Journey world
Public discovery and trip storytelling:
- cinematic
- spacious
- emotional
- image-led
- subtle motion

### Control world
Dashboards, booking, operations:
- clear
- structured
- information-dense where needed
- calm
- minimal decorative effects

The two worlds share the same colour, typography, spacing, and component language.

## 18. Homepage direction

1. Transparent navigation
2. Full-bleed cinematic hero
3. Huge statement
4. Floating glass discovery/matching panel
5. Trust/social proof
6. Find your travel type
7. Curated recommendations
8. Meet your people
9. Creator experiences
10. WWS cinematic story
11. Why WWS
12. Traveller stories
13. Travel passport
14. Final CTA

Primary CTA language:
- Find My Trip
- Explore Trips

Avoid leading with “Book Now” as the main brand message.

## 19. Content language

Use emotionally direct, human copy.

Examples:
- Find your people.
- Your next adventure is out there. Your people are too.
- You don't need a group to join a group.
- Meet your group before you fly.

Avoid generic corporate travel copy.

## 20. Design anti-patterns

Never:
- force everything into dark mode
- overuse glassmorphism
- overuse yellow
- make every object a pill
- animate every element
- use hover as the only information channel
- cover photographic content with excessive text
- build a generic AI/SaaS aesthetic
- invent brand colours casually
- let accessibility degrade for visual effects

## 21. Responsive design

Mobile is a first-class design, not a scaled desktop.

On mobile:
- no hover dependency
- sticky booking CTA where useful
- swipeable galleries
- collapsible itinerary sections
- compact but readable typography
- touch-safe controls
- restrained motion

## 22. Implementation rule

Claude must treat this file as a visual contract.

Claude may implement this direction but may not substantially reinterpret it without approval.

Any future visual change should update this file first, then propagate through shared tokens/components.
