# Wander With Stars V2 — Motion System

## 1. Goal

Motion should make WWS feel smooth, cinematic and alive while remaining fast, accessible and purposeful.

## 2. Motion principles

1. Animate hierarchy, not everything.
2. Feedback should be immediate.
3. Major transitions can be slower and cinematic.
4. Micro-interactions should be quick.
5. Motion must never prevent the user from completing a task.
6. Support reduced-motion preferences.

## 3. Timing scale

```text
micro: 120–180ms
standard: 180–240ms
card: 220–320ms
modal: 250–400ms
section reveal: 400–700ms
cinematic hero: 700–1200ms
```

Use values consistently; avoid arbitrary durations.

## 4. Easing

Preferred semantic curves:

```text
standard ease-out
smooth ease-in-out
spring for selected playful interactions
```

Do not use bouncy/spring effects for every action.

## 5. Card hover

Desktop hover may use:

```text
translateY(-4px)
scale(1.01)
shadow increases one level
secondary metadata fades/slides in
image scale approximately 1.03–1.05
```

Keep the movement subtle.

## 6. Button interaction

On hover:
- subtle background/contrast change
- optional icon nudge
- slight elevation

On press:
- very small scale/elevation reduction

On focus:
- clear accessible ring

## 7. Navigation scroll behaviour

Possible pattern:
- Full-height navigation at top
- Compress to smaller glass bar while scrolling
- Hide on downward scroll only when that improves content focus
- Reveal on upward scroll

Do not hide essential navigation permanently.

## 8. Scroll reveal

For selected sections:

```text
opacity: 0 → 1
translateY: 24px → 0
```

Use once per major content group instead of applying it to every child.

## 9. Hero motion

Possible treatments:
- slow background scale
- subtle parallax
- image crossfade
- foreground text reveal

Avoid heavy parallax on mobile.

## 10. Image transitions

On hover:
- subtle scale
- maintain crop and focal point
- avoid aggressive zoom

When switching galleries:
- crossfade or short slide based on context

## 11. Glass reveal

For hover overlays:
- opacity transition
- blur transition only when performant
- content can translate upward 4–8px

## 12. Modal/dialog motion

Enter:
- opacity 0 → 1
- scale approximately 0.98 → 1

Exit should be slightly faster than entrance.

## 13. Loading states

Use skeletons rather than blocking spinners for content-heavy travel pages.

Skeleton shimmer should be subtle and respect reduced-motion preferences.

## 14. State transitions

Booking status, payment progress and task completion should have clear transitions.

Example:

```text
Pending → Processing → Confirmed
```

The user should understand what happened without decorative animation.

## 15. Mobile

Never depend on hover.

Hover-only information must become:
- always visible,
- tappable,
- or presented through a compact disclosure control.

## 16. Reduced motion

When prefers-reduced-motion is enabled:
- remove parallax
- remove non-essential transforms
- shorten/disable decorative transitions
- retain state-change feedback

## 17. Anti-patterns

Avoid:
- animation on every element
- excessive bounce
- giant blur transitions
- slow navigation
- infinite decorative motion
- auto-playing distracting media

## 18. Motion success criterion

A user should describe the product as:

> smooth and premium

not:

> animated.
