import { render, screen, within } from '@testing-library/react';
import { describe, expect, it } from 'vitest';

import TripDetailPage, { generateMetadata } from '@/app/(marketing)/trips/[slug]/page';

/**
 * /trips/[slug] — trip detail (Phase 3.5).
 *
 * `TripDetailPage` is an async Server Component; awaiting it and rendering
 * the resolved JSX is the same supported RTL/React 19 pattern used for
 * /trips/all's page test (tests/unit/all-trips.test.tsx). It runs against
 * the real content layer (lib/content/queries.ts → fixtures.ts) rather than
 * local fixtures, since the whole point of these tests is proving the real
 * data path renders correctly end to end — the fixture data's exact wording
 * is asserted against directly.
 */

const KNOWN_SLUG = 'sample-northern-vietnam';

describe('known trip slug', () => {
  it('renders without throwing', async () => {
    const ui = await TripDetailPage({ params: Promise.resolve({ slug: KNOWN_SLUG }) });
    expect(() => render(ui)).not.toThrow();
  });

  it('produces trip-specific metadata', async () => {
    const metadata = await generateMetadata({
      params: Promise.resolve({ slug: KNOWN_SLUG }),
    });
    expect(metadata.title).toBe('Sample Community Trip — Northern Vietnam — Wander With Stars');
    expect(metadata.description).toBeTruthy();
  });
});

describe('unknown trip slug', () => {
  it('calls notFound() — a real 404, not a fabricated page', async () => {
    await expect(
      TripDetailPage({ params: Promise.resolve({ slug: 'this-trip-does-not-exist' }) }),
    ).rejects.toThrow();
  });

  it('produces "not found" metadata for an unknown slug', async () => {
    const metadata = await generateMetadata({
      params: Promise.resolve({ slug: 'this-trip-does-not-exist' }),
    });
    expect(metadata.title).toBe('Trip not found — Wander With Stars');
  });
});

describe('hero / arrival', () => {
  it('shows destination, title, tagline and the arrival mark', async () => {
    const ui = await TripDetailPage({ params: Promise.resolve({ slug: KNOWN_SLUG }) });
    render(ui);

    expect(
      screen.getByRole('heading', {
        level: 1,
        name: 'Sample Community Trip — Northern Vietnam',
      }),
    ).toBeInTheDocument();
    expect(screen.getAllByText(/Hanoi & Ha Long Bay/).length).toBeGreaterThan(0);
    expect(
      screen.getByText(
        'Six nights across Hanoi and Ha Long Bay, with a social, adventure-leaning group.',
      ),
    ).toBeInTheDocument();
    // The arrival mark — editorial, not a badge: "WWS Journey" text present.
    expect(screen.getByText(/WWS Journey/)).toBeInTheDocument();
  });

  it('shows departure, duration, price and availability metadata', async () => {
    const ui = await TripDetailPage({ params: Promise.resolve({ slug: KNOWN_SLUG }) });
    render(ui);

    expect(screen.getByText(/14 Nov 2026/)).toBeInTheDocument();
    expect(screen.getByText(/7D\/6N/)).toBeInTheDocument();
    expect(screen.getByText(/68,000/)).toBeInTheDocument();
    expect(screen.getByText('8 spots left')).toBeInTheDocument();
  });
});

describe('the feeling (overview + atmosphere)', () => {
  it('shows the real overview copy and style signals, never invented ones', async () => {
    const ui = await TripDetailPage({ params: Promise.resolve({ slug: KNOWN_SLUG }) });
    render(ui);

    expect(
      screen.getByText(
        'A development preview of a trip detail page. Real overview copy, written per departure, replaces this once trip content is ingested.',
      ),
    ).toBeInTheDocument();
    // adventure: 70, social: 85, culture: 60 — top 4 requested, only 3 exist.
    expect(screen.getByText('Social')).toBeInTheDocument();
    expect(screen.getByText('Adventure')).toBeInTheDocument();
    expect(screen.getByText('Culture')).toBeInTheDocument();
  });
});

describe('itinerary', () => {
  it('renders every fixture day with its real title and summary', async () => {
    const ui = await TripDetailPage({ params: Promise.resolve({ slug: KNOWN_SLUG }) });
    render(ui);

    // "Arrival & welcome" is a heading twice by design — TripFirst24Hours
    // and the plain itinerary list both render day one.
    expect(screen.getAllByRole('heading', { name: 'Arrival & welcome' }).length).toBe(2);
    expect(screen.getByRole('heading', { name: 'Explore the destination' })).toBeInTheDocument();
    expect(
      screen.getByRole('heading', { name: 'Free time & optional activities' }),
    ).toBeInTheDocument();
    expect(screen.getByText('Day 01')).toBeInTheDocument();
    expect(screen.getByText('Day 03')).toBeInTheDocument();
  });

  it('labels itinerary content as a sample, not a confirmed plan', async () => {
    const ui = await TripDetailPage({ params: Promise.resolve({ slug: KNOWN_SLUG }) });
    render(ui);
    expect(screen.getByText(/Sample itinerary/)).toBeInTheDocument();
  });
});

describe('"first 24 hours"', () => {
  it('renders day one’s real content, not fabricated arrive/meet/explore events', async () => {
    const ui = await TripDetailPage({ params: Promise.resolve({ slug: KNOWN_SLUG }) });
    render(ui);

    expect(screen.getByText('Your first 24 hours')).toBeInTheDocument();
    // "Arrival & welcome" appears twice: once here, once in the full itinerary.
    expect(screen.getAllByText('Arrival & welcome').length).toBeGreaterThanOrEqual(1);
    // Rendered twice by design — once in this treatment, once in the plain
    // itinerary list below it (see the component's own doc comment).
    expect(
      screen.getAllByText('Group arrives, checks in, and meets the host over dinner.').length,
    ).toBe(2);
    // Never invented sub-events for a breakdown the data doesn't support.
    expect(screen.queryByText(/^Arrive$/)).not.toBeInTheDocument();
    expect(screen.queryByText(/^Meet$/)).not.toBeInTheDocument();
    expect(screen.queryByText(/^Rest$/)).not.toBeInTheDocument();
  });
});

describe('host', () => {
  it('shows only the host information that actually exists', async () => {
    const ui = await TripDetailPage({ params: Promise.resolve({ slug: KNOWN_SLUG }) });
    render(ui);

    expect(screen.getByText('Development Host')).toBeInTheDocument();
    // No tagline on this fixture — falls back to the general WWS-hosts fact,
    // not an invented personal bio.
    expect(
      screen.getByText('WWS hosts travel with the group for the full departure, start to finish.'),
    ).toBeInTheDocument();
  });
});

describe('community — no fabricated numbers', () => {
  it('shows the real per-departure traveller count when known', async () => {
    const ui = await TripDetailPage({ params: Promise.resolve({ slug: KNOWN_SLUG }) });
    render(ui);
    expect(screen.getByText(/14 travellers have joined this departure/)).toBeInTheDocument();
  });

  it('never renders a platform-wide community statistic — none exists yet', async () => {
    const ui = await TripDetailPage({ params: Promise.resolve({ slug: KNOWN_SLUG }) });
    render(ui);
    // The real CommunitySnapshot fixture is deliberately null (see
    // lib/content/fixtures.ts) — nothing on this page should claim a
    // platform-wide traveller/community total, solo-traveller count, or
    // top-cities figure.
    expect(screen.queryByText(/total travellers/i)).not.toBeInTheDocument();
    expect(screen.queryByText(/solo travellers/i)).not.toBeInTheDocument();
    expect(screen.queryByText(/community members/i)).not.toBeInTheDocument();
  });
});

describe('logistics', () => {
  it('shows inclusions and exclusions from the real content, secondary to the story', async () => {
    const ui = await TripDetailPage({ params: Promise.resolve({ slug: KNOWN_SLUG }) });
    render(ui);

    expect(screen.getByText('Accommodation for the trip duration')).toBeInTheDocument();
    expect(screen.getByText('International flights')).toBeInTheDocument();
  });
});

describe('gallery / media', () => {
  it('renders a placeholder-honest gallery, never invented photography', async () => {
    const ui = await TripDetailPage({ params: Promise.resolve({ slug: KNOWN_SLUG }) });
    render(ui);

    expect(screen.getAllByText('Photography pending').length).toBeGreaterThan(0);
    expect(screen.queryByRole('img')).not.toBeInTheDocument();
  });
});

describe('booking state', () => {
  it('shows the honest "booking opens soon" state, twice — hero and closing CTA — never a fake checkout', async () => {
    const ui = await TripDetailPage({ params: Promise.resolve({ slug: KNOWN_SLUG }) });
    render(ui);

    const buttons = screen.getAllByRole('button', { name: 'Booking opens soon' });
    expect(buttons.length).toBe(2);
    for (const button of buttons) {
      expect(button).toBeDisabled();
    }
  });

  it('the closing CTA returns to /trips', async () => {
    const ui = await TripDetailPage({ params: Promise.resolve({ slug: KNOWN_SLUG }) });
    render(ui);

    expect(screen.getByRole('link', { name: '← All trips' })).toHaveAttribute('href', '/trips');
  });
});

describe('accessibility and structure', () => {
  it('uses one real h1 for the trip title', async () => {
    const ui = await TripDetailPage({ params: Promise.resolve({ slug: KNOWN_SLUG }) });
    render(ui);
    expect(screen.getAllByRole('heading', { level: 1 })).toHaveLength(1);
  });

  it('every itinerary day heading is a real heading, not a styled div', async () => {
    const ui = await TripDetailPage({ params: Promise.resolve({ slug: KNOWN_SLUG }) });
    const { container } = render(ui);
    const itinerary = screen.getByText(/Sample itinerary/).closest('section');
    expect(itinerary).not.toBeNull();
    const headings = within(itinerary as HTMLElement).getAllByRole('heading');
    expect(headings.length).toBeGreaterThan(0);
    // Sanity: container actually rendered (guards against a false-positive
    // empty render passing every query above vacuously).
    expect(container.textContent).not.toBe('');
  });
});

describe('no nested interactive elements', () => {
  it('no link contains a button and no button contains a link', async () => {
    const ui = await TripDetailPage({ params: Promise.resolve({ slug: KNOWN_SLUG }) });
    render(ui);

    for (const link of screen.getAllByRole('link')) {
      expect(within(link).queryAllByRole('button')).toHaveLength(0);
    }
    for (const button of screen.getAllByRole('button')) {
      expect(within(button).queryAllByRole('link')).toHaveLength(0);
    }
  });
});

describe('route links — no dead links', () => {
  it('every link on the page is a real, non-empty href', async () => {
    const ui = await TripDetailPage({ params: Promise.resolve({ slug: KNOWN_SLUG }) });
    render(ui);
    const links = screen.getAllByRole('link');
    expect(links.length).toBeGreaterThan(0);
    for (const link of links) {
      const href = link.getAttribute('href');
      expect(href).toBeTruthy();
      expect(href).not.toMatch(/^#/);
    }
  });
});

describe('reduced motion', () => {
  it('renders correctly when prefers-reduced-motion is set (itinerary route reveal is JS-driven)', async () => {
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
      const ui = await TripDetailPage({ params: Promise.resolve({ slug: KNOWN_SLUG }) });
      const { container } = render(ui);
      expect(container.querySelector('.wws-route--visible')).not.toBeNull();
    } finally {
      window.matchMedia = original;
    }
  });
});
