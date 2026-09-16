import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it } from 'vitest';

import { TripCard } from '@/components/marketing/trip-card';
import type { TripPreview } from '@/lib/content/types';

/**
 * TripCard — data mapping, routing and accessibility.
 *
 * Verifies the TripPreview -> card mapping directly, that the card links to
 * its real /trips/[slug] route via CardAction (one focus stop for the whole
 * card, not one per element), and that primary and secondary information are
 * both always in the DOM — secondary is concealed only by CSS, never hidden
 * from non-hover contexts.
 */

const TRIP: TripPreview = {
  id: 't1',
  slug: 'sample-trip',
  title: 'Sample Community Trip — Northern Vietnam',
  destination: 'Hanoi & Ha Long Bay',
  country: 'Vietnam',
  departureDate: '2026-11-14',
  durationNights: 6,
  price: { amount: 68000, currency: 'INR' },
  availability: { status: 'open', spotsLeft: 8 },
  host: { name: 'Development Host' },
  heroMedia: { kind: 'placeholder' },
  styleScores: { adventure: 70, social: 85 },
  travellerCount: 14,
};

describe('TripCard — primary information', () => {
  it('always shows destination, title, date, duration and price', () => {
    render(<TripCard trip={TRIP} />);

    expect(screen.getByText('Hanoi & Ha Long Bay')).toBeInTheDocument();
    expect(screen.getByText('Sample Community Trip — Northern Vietnam')).toBeInTheDocument();
    expect(screen.getByText(/14 Nov 2026/)).toBeInTheDocument();
    expect(screen.getByText(/7D\/6N/)).toBeInTheDocument();
    expect(screen.getByText(/68,000/)).toBeInTheDocument();
  });

  it('shows a truthful availability badge', () => {
    render(<TripCard trip={TRIP} />);
    expect(screen.getByText('8 spots left')).toBeInTheDocument();
  });

  it('never claims real photography for a placeholder image', () => {
    render(<TripCard trip={TRIP} />);
    expect(screen.getByText('Photography pending')).toBeInTheDocument();
    expect(screen.queryByRole('img')).not.toBeInTheDocument();
  });
});

describe('TripCard — secondary information stays in the DOM', () => {
  it('renders host, traveller count and top style signals unconditionally', () => {
    render(<TripCard trip={TRIP} />);

    // Not behind a click, not conditionally mounted — hover-only concealment
    // is applied purely in CSS (.wws-reveal), so touch/no-hover users always
    // get this content from the same markup.
    expect(screen.getByText(/Hosted by Development Host/)).toBeInTheDocument();
    expect(screen.getByText(/14 travellers joining/)).toBeInTheDocument();
    expect(screen.getByText('Social')).toBeInTheDocument();
    expect(screen.getByText('Adventure')).toBeInTheDocument();
  });

  it('omits the traveller count line gracefully when not known', () => {
    const { travellerCount: _drop, ...rest } = TRIP;
    render(<TripCard trip={rest} />);
    expect(screen.getByText(/Hosted by Development Host/)).toBeInTheDocument();
    expect(screen.queryByText(/travellers joining/)).not.toBeInTheDocument();
  });

  it('wraps secondary content in the shared collapsible .wws-reveal / .wws-reveal-content hooks', () => {
    // Phase 3.4 "trip card consistency" fix: the same mechanism
    // components/trips/journey-entry.tsx uses (components/ui/ui.css), not a
    // second implementation. See journey-entry.test.tsx's suite for the
    // shared behaviour's own contract tests — not duplicated here.
    const { container } = render(<TripCard trip={TRIP} />);
    const reveal = container.querySelector('.wws-reveal');
    const content = reveal?.querySelector('.wws-reveal-content');
    expect(reveal).not.toBeNull();
    expect(content).not.toBeNull();
    expect(content?.textContent).toContain('Hosted by Development Host');
  });

  it('no nested interactive controls exist inside the secondary content', () => {
    const { container } = render(<TripCard trip={TRIP} />);
    const reveal = container.querySelector('.wws-reveal') as HTMLElement;
    expect(within(reveal).queryAllByRole('link')).toHaveLength(0);
    expect(within(reveal).queryAllByRole('button')).toHaveLength(0);
  });
});

describe('TripCard — resting height', () => {
  it('does not force a fixed or minimum height anywhere in the card', () => {
    const { container } = render(<TripCard trip={TRIP} />);
    for (const el of container.querySelectorAll<HTMLElement>('*')) {
      expect(el.style.height).toBe('');
      expect(el.style.minHeight).toBe('');
    }
  });
});

describe('TripCard — reduced motion', () => {
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
      render(<TripCard trip={TRIP} />);
      expect(screen.getByText('Sample Community Trip — Northern Vietnam')).toBeInTheDocument();
      expect(screen.getByText(/Hosted by Development Host/)).toBeInTheDocument();
    } finally {
      window.matchMedia = original;
    }
  });
});

describe('TripCard — accessibility and routing', () => {
  it('links to the trip detail route by slug', () => {
    render(<TripCard trip={TRIP} />);
    expect(
      screen.getByRole('link', { name: 'View Sample Community Trip — Northern Vietnam' }),
    ).toHaveAttribute('href', '/trips/sample-trip');
  });

  it('is a single focus stop for the whole card, not one per element', async () => {
    render(<TripCard trip={TRIP} />);
    await userEvent.tab();
    expect(
      screen.getByRole('link', { name: 'View Sample Community Trip — Northern Vietnam' }),
    ).toHaveFocus();

    // A second Tab must leave the card entirely — nothing else inside it
    // should be an independent tab stop.
    await userEvent.tab();
    expect(
      screen.getByRole('link', { name: 'View Sample Community Trip — Northern Vietnam' }),
    ).not.toHaveFocus();
  });

  it('marks the placeholder image area decorative', () => {
    const { container } = render(<TripCard trip={TRIP} />);
    expect(within(container).getByText('Photography pending')).toBeInTheDocument();
  });
});
