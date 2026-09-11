# Wander With Stars V2 — Design System

## 1. Design objective

The WWS interface should feel:

- Cinematic
- Premium
- Adventurous
- Youthful
- Social
- Warm
- Confident
- Trustworthy

It should not feel like a generic travel agency, airline console, cheap deal portal, or generic SaaS dashboard.

## 2. Design system philosophy

Visual emotion comes from imagery, typography and composition.

UI creates clarity.

The interface must always make these easy to identify:
- What is this?
- Why should I care?
- How much is it?
- When is it?
- Who is going?
- What do I do next?

## 3. Tokens

All visual decisions should be represented as centralized tokens or CSS variables.

> **Implementation note (Phase 1).** The token mechanism exists at
> `styles/tokens.css`, wired into Tailwind via `@theme inline` in
> `app/globals.css`. The token *names* below are implemented; the *values* are
> deliberately placeholders, marked `PLACEHOLDER` or `TODO` in that file, and
> are set in the design-direction session. Build components against the tokens,
> never against literal values.

### Color roles

```text
--background
--background-secondary
--surface
--surface-elevated
--surface-glass-1
--surface-glass-2
--surface-glass-3
--text-primary
--text-secondary
--text-muted
--border-subtle
--border-strong
--accent
--accent-soft
--success
--warning
--error
```

Do not scatter arbitrary hex values through components.

## 4. Typography

Use one primary display/body family unless there is a deliberate branding reason for a second family.

Recommended weight system:

```text
400 body
500 medium
600 label / emphasis
700 heading
800 display / hero
```

Typography hierarchy should be visible through scale, weight, line height and spacing rather than colour alone.

## 5. Type hierarchy

### Display
Large, bold, cinematic. Used for hero statements and major section statements.

### H1/H2
Strong, compact, confident.

### H3/H4
Clear hierarchy for cards and sub-sections.

### Body
Highly readable; avoid overly narrow line lengths.

### Labels
Small, semibold, optionally uppercase with subtle tracking.

### Prices
Large and bold. Currency and secondary pricing information should remain readable but visually subordinate.

## 6. Layout

Use a consistent max-width container.

Recommended principles:
- Spacious desktop layout
- Compact but breathable mobile layout
- Clear section rhythm
- Strong alignment
- Avoid random floating content unless intentional

## 7. Spacing

Use a spacing scale rather than arbitrary numbers.

Example:

```text
4 / 8 / 12 / 16 / 20 / 24 / 32 / 40 / 48 / 64 / 80 / 96 / 128
```

## 8. Border radius

Define small, medium, large and pill tokens.

Example:

```text
small: 10px
medium: 14px
large: 20px
pill: 999px
```

Use larger radius for immersive travel cards, dialogs and hero panels; avoid rounding every tiny element excessively.

## 9. Surface system

### Solid surface
Used for maximum readability.

### Glass 1
Subtle translucency and light blur.

### Glass 2
Stronger translucency and blur for elevated travel cards.

### Glass 3
High visual depth for hero overlays, floating controls, and major panels.

Glass always needs sufficient text contrast.

## 10. Shadows

Use a small number of semantic elevation levels rather than unique shadows per component.

```text
shadow-sm
shadow-md
shadow-lg
shadow-xl
```

Avoid “glow everywhere.”

## 11. Images

WWS should use photography as a major part of its identity.

Image treatment rules:
- Prefer large, high-quality destination imagery
- Preserve subject focus
- Use consistent aspect ratios inside repeated cards
- Add subtle zoom on hover when useful
- Use gradients only where they improve text readability

## 12. Glass card recipe

For a typical travel card:
- Translucent surface
- 1px subtle border
- Medium backdrop blur
- Soft shadow
- 16–24px internal padding
- Large image
- Strong title
- Price/date always visible
- Secondary social information can reveal on hover/focus

## 13. Information hierarchy

Every component should classify information as:

### Primary
Always visible.

### Secondary
Revealed by hover/focus or lower visual emphasis.

### Tertiary
Available on the detail page, dialog, tooltip, or expandable section.

Never hide essential information behind hover on touch devices.

## 14. Button system

Primary:
- Highest contrast
- Clear action verb
- Strong focus state

Secondary:
- Lower visual weight

Tertiary:
- Text/icon action

Destructive:
- Used only for dangerous actions

## 15. Navigation

Desktop can use a floating/sticky glass navigation bar.

Navigation behaviour:
- Remains visually light
- Can compress during scroll
- Avoid excessive movement
- Active section/page must be obvious

## 16. Forms

Forms should have:
- Clear labels
- Helpful placeholder/example only when needed
- Validation message next to the field
- Success/failure feedback
- Proper focus state
- Accessible keyboard interaction

## 17. Dashboard design

Public WWS can be cinematic.

Authenticated/admin interfaces should retain the brand but prioritise clarity and density.

Do not put heavy glass effects over dense tables where they reduce readability.

## 18. Responsive rules

Mobile is not “desktop made smaller.”

On mobile:
- Reduce visual density
- Convert horizontal grids into vertical or swipeable patterns
- Use sticky CTAs when helpful
- Keep touch targets large
- Never rely on hover

## 19. Accessibility

- Semantic HTML
- Strong colour contrast
- Visible keyboard focus
- Reduced motion support
- Alt text for meaningful images
- Accessible labels
- Error messaging not based on colour alone

## 20. Styling principle

When in doubt:

> More visual restraint, more hierarchy, fewer decorations.

Premium comes from consistency, spacing, typography, imagery and motion—not from adding effects everywhere.
