import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';

import { Highlight } from '@/components/marketing/highlight';

/**
 * Phase 3.8A, Part A — the yellow accent must be typographic (text colour),
 * never a background block. The first Phase 3.8 version painted
 * `--color-surface-accent` as a fill behind the word; this asserts that is
 * gone and the word instead uses `--color-highlight` as plain text colour,
 * in normal document flow (no absolute positioning, no new colour value).
 */

describe('Highlight', () => {
  it('renders its children as plain inline text, in normal flow', () => {
    render(<Highlight>adventure.</Highlight>);
    const el = screen.getByText('adventure.');
    expect(el.tagName).toBe('SPAN');
    expect(el.style.position).not.toBe('absolute');
    expect(el.style.position).not.toBe('fixed');
  });

  it('colours the text with the semantic highlight token, not a raw hex value', () => {
    render(<Highlight>adventure.</Highlight>);
    const el = screen.getByText('adventure.');
    expect(el.style.color).toBe('var(--color-highlight)');
  });

  it('never sets a background — no yellow rectangle behind the word', () => {
    render(<Highlight>adventure.</Highlight>);
    const el = screen.getByText('adventure.');
    expect(el.style.background).toBe('');
    expect(el.style.backgroundColor).toBe('');
  });

  it('never sets padding/border-radius that would imply a pill/block shape', () => {
    render(<Highlight>adventure.</Highlight>);
    const el = screen.getByText('adventure.');
    expect(el.style.padding).toBe('');
    expect(el.style.borderRadius).toBe('');
  });

  it('sets no other style properties beyond colour, so it cannot collide with heading line boxes', () => {
    render(<Highlight>adventure.</Highlight>);
    const el = screen.getByText('adventure.');
    // Exactly one inline style declaration: colour.
    expect(el.style.length).toBe(1);
    expect(el.style[0]).toBe('color');
  });
});
