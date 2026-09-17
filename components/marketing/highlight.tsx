import type { ReactNode } from 'react';

/**
 * A single word or short phrase picked out in WWS yellow — Phase 3.8,
 * reworked in Phase 3.8A.
 *
 * Phase 3.8's first version painted a yellow fill behind the word (the same
 * treatment `Badge tone="accent"` uses) specifically to avoid yellow text on
 * a light surface — styles/tokens.css's own contrast table records that as
 * a failing combination (1.29:1 on ivory, 1.33:1 on white). In practice that
 * fill rendered as a large, awkward rectangle that collided with heading
 * line boxes — not the minimal editorial accent intended. Phase 3.8A's
 * explicit product direction is plain yellow TEXT, in normal document flow,
 * no background, no absolute positioning: this is now that.
 *
 * The contrast trade-off is real and not hidden: on ivory/white, this text
 * is close to unreadable at body size. It is used only on the large
 * display/heading sizes this component is meant for (`--text-hero` /
 * `--text-4xl`, weight 800), where the shape of the word is still legible
 * even at low contrast — but this is a deliberate product decision to flag,
 * not a contrast problem this component solves.
 *
 * `--color-highlight` (styles/tokens.css) rather than the raw
 * `--wws-yellow-core` primitive — components reference semantic roles, not
 * brand primitives (CLAUDE.md's Conventions section) — even though today
 * `--color-highlight` is defined as exactly that primitive.
 */
export function Highlight({ children }: { children: ReactNode }) {
  return <span style={{ color: 'var(--color-highlight)' }}>{children}</span>;
}
