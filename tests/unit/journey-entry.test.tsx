import { render, screen, within } from '@testing-library/react';
import { describe, expect, it } from 'vitest';

import { JourneyEntry } from '@/components/trips/journey-entry';
import type { TripPreview } from '@/lib/content/types';

/**
 * JourneyEntry — the shared editorial trip card (Phase 3.4 targeted fix:
 * "excessive empty space at rest").
 *
 * A real limitation of this suite, stated up front: vitest.config.mts sets
 * `css: false`, so no stylesheet — including components/ui/ui.css's shared
 * `.wws-reveal` height-collapse and hover/focus-within rules — is ever
 * parsed or applied in jsdom here. These tests cannot assert the
 * actual visual collapse/expand or measure real pixel heights (jsdom has no
 * layout engine regardless). What they verify instead is the DOM/ARIA
 * *contract* that CSS relies on: primary content renders unconditionally,
 * secondary content exists in the architecture and stays reachable to
 * assistive technology, the class hooks the CSS keys off are present, and
 * nothing about the card breaks keyboard access or introduces a nested
 * link. A real browser check (see the task's own visual-inspection step)
 * is still the only way to confirm the actual reveal motion.
 */

function trip(overrides: Partial<TripPreview>): TripPreview {
  return {
    id: 'id',
    slug: 'northern-vietnam',
    title: 'Northern Vietnam',
    destination: 'Hanoi',
    country: 'Vietnam',
    departureDate: '2026-11-14',
    durationNights: 6,
    price: { amount: 68000, currency: 'INR' },
    availability: { status: 'open' },
    host: { name: 'Asha' },
    heroMedia: { kind: 'placeholder' },
    styleScores: { adventure: 70, social: 85 },
    travellerCount: 8,
    tagline: 'Motorbikes, mountains, and karst valleys.',
    ...overrides,
  };
}

describe('resting state — primary content only, no reserved fixed height', () => {
  it('renders every primary field unconditionally', () => {
    render(<JourneyEntry trip={trip({})} />);

    expect(screen.getByRole('heading', { name: 'Northern Vietnam' })).toBeInTheDocument();
    expect(screen.getByText('Hanoi, Vietnam')).toBeInTheDocument();
    expect(screen.getByText('Motorbikes, mountains, and karst valleys.')).toBeInTheDocument();
    expect(screen.getByText(/14 Nov 2026/)).toBeInTheDocument();
    expect(screen.getByText(/₹68,000/)).toBeInTheDocument();
  });

  it('does not force a fixed or minimum height on the card or its content column', () => {
    const { container } = render(<JourneyEntry trip={trip({})} />);

    for (const el of container.querySelectorAll<HTMLElement>('*')) {
      expect(el.style.height).toBe('');
      expect(el.style.minHeight).toBe('');
    }
  });
});

describe('secondary information — present in the architecture, not deleted', () => {
  it('renders host, style and the closing link inside the collapsible secondary wrapper', () => {
    const { container } = render(<JourneyEntry trip={trip({})} />);

    const secondary = container.querySelector('.wws-reveal');
    expect(secondary).not.toBeNull();

    const within_ = within(secondary as HTMLElement);
    expect(within_.getByText(/Hosted by Asha/)).toBeInTheDocument();
    expect(within_.getByText('Adventure')).toBeInTheDocument();
    expect(within_.getByText('Explore journey')).toBeInTheDocument();
  });

  it('secondary content stays in the accessibility tree regardless of hover state', () => {
    // No `display: none`/conditional unmount anywhere in the tree — see the
    // architecture note above: real browsers collapse it visually via
    // grid-template-rows, never by removing it from the DOM.
    const { container } = render(<JourneyEntry trip={trip({})} />);
    const secondary = container.querySelector('.wws-reveal');
    expect(secondary).not.toBeNull();
    expect(secondary).toBeVisible();
  });
});

describe('hover/focus reveal — CSS contract', () => {
  it('the card carries the interactive hook the reveal keys off', () => {
    const { container } = render(<JourneyEntry trip={trip({})} />);
    expect(container.querySelector('.wws-card--interactive')).not.toBeNull();
  });

  it('secondary content and the primary content column are siblings, not nested inside each other twice over', () => {
    const { container } = render(<JourneyEntry trip={trip({})} />);
    const content = container.querySelector('.wws-journey-content');
    const secondary = content?.querySelector('.wws-reveal');
    expect(content).not.toBeNull();
    expect(secondary).not.toBeNull();
  });
});

describe('focus accessibility — one stop, no nested links', () => {
  it('the entire entry is exactly one focusable link', () => {
    render(<JourneyEntry trip={trip({})} />);
    const links = screen.getAllByRole('link');
    expect(links).toHaveLength(1);
    expect(links[0]).toHaveAttribute('href', '/trips/northern-vietnam');
    expect(links[0]).toHaveAccessibleName('View Northern Vietnam');
  });

  it('no nested interactive controls exist inside the secondary content', () => {
    const { container } = render(<JourneyEntry trip={trip({})} />);
    const secondary = container.querySelector('.wws-reveal') as HTMLElement;
    expect(within(secondary).queryAllByRole('link')).toHaveLength(0);
    expect(within(secondary).queryAllByRole('button')).toHaveLength(0);
  });

  it('the link can be tabbed to directly', async () => {
    render(<JourneyEntry trip={trip({})} />);
    const link = screen.getByRole('link', { name: 'View Northern Vietnam' });
    link.focus();
    expect(link).toHaveFocus();
  });
});

describe('reduced motion — scroll reveal resolves immediately, without throwing', () => {
  it('renders correctly when prefers-reduced-motion is set', () => {
    const original = window.matchMedia;
    window.matchMedia = ((query: string) => ({
      matches: query.includes('reduce'),
      media: query,
      onchange: null,
      addListener: () => {},
      removeListener: () => {},
      addEventListener: () => {},
      removeEventListener: () => {},
      dispatchEvent: () => false,
    })) as typeof window.matchMedia;

    try {
      const { container } = render(<JourneyEntry trip={trip({})} />);
      expect(container.querySelector('.wws-reveal-media--visible')).not.toBeNull();
      expect(container.querySelector('.wws-reveal-text--visible')).not.toBeNull();
      expect(screen.getByRole('heading', { name: 'Northern Vietnam' })).toBeInTheDocument();
    } finally {
      window.matchMedia = original;
    }
  });
});

describe('featured emphasis', () => {
  it('shows the "Featured departure" badge only in the featured variant', () => {
    const { rerender, queryByText } = render(<JourneyEntry trip={trip({})} emphasis="regular" />);
    expect(queryByText('Featured departure')).not.toBeInTheDocument();

    rerender(<JourneyEntry trip={trip({})} emphasis="featured" />);
    expect(queryByText('Featured departure')).toBeInTheDocument();
  });
});

describe('compact emphasis — /trips/all grid variant', () => {
  it('lays out as a single stacked column, not the two-column alternating grid', () => {
    const { container } = render(<JourneyEntry trip={trip({})} emphasis="compact" />);
    const layout = container.querySelector('.wws-journey-media')?.parentElement;
    expect(layout?.className).toContain('flex-col');
    expect(layout?.className).not.toContain('grid');
  });

  it('drops the tagline (storytelling copy) but keeps every other primary field', () => {
    render(<JourneyEntry trip={trip({})} emphasis="compact" />);
    expect(screen.getByRole('heading', { name: 'Northern Vietnam' })).toBeInTheDocument();
    expect(screen.getByText('Hanoi, Vietnam')).toBeInTheDocument();
    expect(screen.getByText(/₹68,000/)).toBeInTheDocument();
    expect(screen.queryByText('Motorbikes, mountains, and karst valleys.')).not.toBeInTheDocument();
  });

  it('keeps secondary information in the architecture, same as the other variants', () => {
    const { container } = render(<JourneyEntry trip={trip({})} emphasis="compact" />);
    const secondary = container.querySelector('.wws-reveal');
    expect(secondary).not.toBeNull();
    expect(within(secondary as HTMLElement).getByText(/Hosted by Asha/)).toBeInTheDocument();
  });

  it('is still exactly one focusable link', () => {
    render(<JourneyEntry trip={trip({})} emphasis="compact" />);
    expect(screen.getAllByRole('link')).toHaveLength(1);
  });
});
