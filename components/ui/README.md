# Production UI primitives

Import from `@/components/ui`.

```tsx
import { Button, Card, Field, Input } from '@/components/ui';
```

## The one rule

**No component contains a colour, radius, shadow, duration, font size or
spacing literal.** Everything reads from a semantic token in
`styles/tokens.css`. That is what makes a future visual redesign a change to
the token file rather than a rewrite of every component — and the product owner
has explicitly reserved the right to refine the visual system later.

Components reference *semantic roles* (`--color-surface`, `--color-text-brand`),
never brand primitives (`--wws-teal-core`). Brand primitives are deliberately
not exposed as Tailwind utilities so nothing can reach past the semantic layer.

If you need a value that does not exist, add a token — do not inline one.

## What is here

| | |
|---|---|
| **Layout** | `Container`, `Stack`, `Section`, `Separator` |
| **Typography** | `Heading`, `Text` |
| **Actions** | `Button`, `IconButton` |
| **Surfaces** | `Card`, `CardAction`, `GlassPanel`, `Badge`, `Avatar` |
| **Media** | `ImageFrame`, `ImageScrim` |
| **Forms** | `Field`, `Input`, `Textarea`, `Select`, `Checkbox`, `Radio` |
| **Overlays** | `Dialog`, `Drawer` |
| **Feedback** | `Spinner`, `Skeleton`, `EmptyState`, `ErrorState` |

Interaction states (`:hover`, `:active`, `:focus-visible`, pointer queries)
live in `ui.css`, because pseudo-states cannot be inline styles. Every value
there is a token too.

## Notes worth knowing

**Glass is an accent.** It only reads as glass over imagery or a teal field.
Over flat ivory it is an expensive near-white box — use `Card`. See
`docs/WWS_VISUAL_IDENTITY.md` §9.

**Interactive cards need a real control.** Pass `CardAction` with `href` or
`onClick`; it stretches over the card so the whole surface is clickable while
keyboard users get exactly one focus stop. A `div` with a click handler is not
a card, it is a trap.

**Overlays use the native `<dialog>` element.** Focus trapping, focus
restoration, Escape and background inerting come from the platform, so there is
no dependency and no hand-written focus trap to get subtly wrong.

**Progressive disclosure is pointer-only.** The `wws-reveal` class hides
secondary information *only* where a fine pointer and ≥768px both exist.
Essential information must never be behind hover, and touch devices see
everything. See `docs/UX_INTERACTION_GUIDE.md` §3.

**Loading buttons stay focusable.** `loading` sets `aria-busy` and blocks the
handler rather than setting `disabled`, which would move focus away
mid-interaction.

## Known gap: no destructive colour

The locked palette is teal, yellow, ivory, charcoal and white — there is no red.
`Button variant="destructive"` currently uses charcoal, and form errors are
signalled by border weight, a `✕` glyph and wording rather than colour.

That is accessible (colour is never the only signal anyway), but people expect
red for irreversible actions. **A destructive/error colour should be approved
and added to the token layer before destructive actions ship.**

## Intentionally not built

`Grid`, `Tooltip`, `Tabs`, `Accordion`, `SearchInput`. Each needs a real product
surface to be designed against, and would otherwise be an abstraction invented
on spec. They arrive with the milestone that needs them.

## Visual reference

The approved visual system is at `/design-system`. That specimen is a separate,
isolated review surface — it does not import these components, and these
components do not import it.
