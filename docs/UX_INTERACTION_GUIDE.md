# Wander With Stars V2 — UX & Interaction Guide

## 1. Core UX principle

The user should always understand:

- where they are
- what they are seeing
- why it matters
- what they can do next

## 2. User-facing language

Prefer human language.

Instead of:

`Submit`

Prefer:

`Find My Trip`
`Reserve My Spot`
`Join the Trip Circle`
`Complete My Profile`

## 3. Trip cards

### Default information
Always show:
- destination
- trip name
- date range
- duration
- price
- availability

### Secondary information
On desktop hover/focus:
- trip personality
- traveller count
- host
- social composition
- subtle media motion

### Mobile
Secondary info should be a visible compact section or tap-to-expand interaction.

## 4. Tooltips / short info

Use tooltips for:
- ambiguous icons
- specialised fields
- dashboard metrics
- small contextual explanations

Do not use tooltips for essential purchase information.

## 5. Trip discovery

Users should be able to search in multiple ways:

### Destination-first
“What destination?”

### Personality-first
“What kind of trip do you want?”

### Constraint-first
“Budget, month, duration, departure city.”

All routes should converge on the same trip results model.

## 6. “Who’s going?” interaction

Show aggregated, privacy-respecting information first.

Example:

```text
23 travellers joining
11 solo
7 first international trips
6 from Delhi
4 from Mumbai
```

Allow travellers to opt into individual profile visibility.

## 7. Trip personality

Use a concise visual score set such as:
- Adventure
- Social
- Party
- Relaxation
- Culture

Avoid claiming scientific personality assessment. Present it as a trip-style descriptor.

## 8. Booking CTA strategy

Primary booking CTA should remain accessible on long trip pages.

Desktop:
- sticky side booking panel or sticky CTA

Mobile:
- bottom sticky booking CTA

CTA should show the meaningful current price and any important payment qualifier without creating false urgency.

## 9. Urgency

Use only truthful availability states:
- 8 spots left
- almost full
- waitlist
- sold out

Do not invent scarcity.

## 10. Itinerary UX

Default to an interactive story/timeline.

Each day can include:
- location
- activities
- transport
- accommodation
- meals
- narrative
- photo

Allow expand/collapse but keep the first screen understandable.

## 11. Forms

Use progressive disclosure when the amount of information is large.

Example booking:

Step 1: Traveller count
Step 2: Traveller details
Step 3: Review and price
Step 4: Payment

Never ask for unnecessary data.

## 12. Errors

Error messages should answer:

1. What went wrong?
2. What can I do?
3. Can I retry?

Example:

> Payment confirmation is taking longer than usual. Your booking has not been marked as confirmed yet. We’ll update it automatically, or you can check again.

## 13. Loading states

Use skeletons for:
- trip cards
- trip pages
- dashboards

Use compact progress indicators for:
- button operations
- payment processing
- small inline actions

## 14. Empty states

Every important list gets a useful empty state.

Example wishlist:

> No saved trips yet.
> Start exploring destinations that match your travel style.
> [Explore Trips]

## 15. Community interactions

New member flow:

Booking confirmed
→ community access granted
→ introduction prompt
→ trip prep information

## 16. Introductions

Encourage low-friction prompts such as:

- Name
- Where you're from
- First WWS trip?
- What are you excited about?

Do not require an essay.

## 17. Safety interactions

Report and block controls should be easy to find without visually dominating normal conversation.

## 18. Dashboard priorities

At login, surface the most time-sensitive action first.

Examples:
- payment due
- missing document
- upcoming trip
- unread announcement

## 19. Travel checklist

Show completion percentage and actionable next steps.

Example:

```text
Trip preparation — 75%

✓ Passport
✓ Booking
✓ Flights
⚠ Travel insurance
⚠ Emergency contact
```

## 20. Notifications

Notifications should be grouped by usefulness:

Important:
- payment
- booking
- itinerary changes
- safety/operations

Community:
- announcements
- mentions

Marketing:
- recommendations

Users should be able to manage notification preferences.

## 21. Search/filter UX

On desktop, use a persistent filter rail or top filter bar.

On mobile, use a filter drawer with selected-filter chips.

Always show a clear reset action.

## 22. Trust UX

Never bury important purchase information.

Surface:
- inclusions
- exclusions
- cancellation policy
- support method
- payment schedule
- availability
- verified reviews

## 23. Progressive disclosure

Keep the first view simple.

Reveal complexity only when users need it.

Good examples:
- advanced filters in a drawer
- full itinerary after summary
- secondary card info on hover/focus
- detailed policy under accordions

## 24. Personalisation quiz

Keep it short.

5–8 high-signal questions should usually be enough for an MVP.

Output should explain recommendations:

> Vietnam ranks #1 because you prefer social, active trips and your budget fits this departure.

## 25. AI interaction

AI should:
- state uncertainty when necessary
- cite or link to WWS source content inside the product where practical
- distinguish WWS-specific facts from general travel information
- give users a path to human support when appropriate

Never let AI silently make irreversible booking/payment decisions.

## 26. Accessibility

Every interactive state must work with:
- keyboard
- focus
- touch
- screen-reader labels where applicable
- reduced motion

## 27. The WWS “feel”

A useful quality bar:

> Cinematic on discovery, calm during decisions, reassuring during payment, social before the trip, and useful throughout the journey.
