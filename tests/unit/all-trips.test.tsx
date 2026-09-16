import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it } from 'vitest';

import { AllTripsCatalogue } from '@/components/trips/all-trips-catalogue';
import AllTripsPage from '@/app/(marketing)/trips/all/page';
import type { TripPreview } from '@/lib/content/types';

/**
 * /trips/all — the complete trip directory (Phase 3.4 final correction).
 *
 * AllTripsCatalogue is tested directly with local fixtures, the same
 * approach trip-discovery.test.tsx takes for TripDiscoveryExperience.
 * `AllTripsPage` itself (the async Server Component) is exercised once,
 * end to end, against the real content layer — awaiting an async Server
 * Component and rendering its resolved JSX is a supported RTL/React 19
 * pattern — to prove the route, the back link, and the real data path
 * actually wire together, without coupling every other test here to
 * whatever fixture trips currently exist.
 */

function trip(overrides: Partial<TripPreview>): TripPreview {
  return {
    id: 'id',
    slug: 'slug',
    title: 'Title',
    destination: 'Destination',
    country: 'Country',
    departureDate: '2026-06-01',
    durationNights: 5,
    price: { amount: 50000, currency: 'INR' },
    availability: { status: 'open' },
    host: { name: 'Host' },
    heroMedia: { kind: 'placeholder' },
    styleScores: {},
    ...overrides,
  };
}

const vietnam = trip({
  id: 'v',
  slug: 'vietnam',
  title: 'Northern Vietnam',
  destination: 'Hanoi',
  country: 'Vietnam',
  departureDate: '2026-11-14',
  durationNights: 6,
  price: { amount: 68000, currency: 'INR' },
  styleScores: { adventure: 70, social: 85 },
});

const bali = trip({
  id: 'b',
  slug: 'bali',
  title: 'Bali Escape',
  destination: 'Ubud',
  country: 'Indonesia',
  departureDate: '2026-12-05',
  durationNights: 3,
  price: { amount: 40000, currency: 'INR' },
  styleScores: { relaxation: 75 },
});

const georgia = trip({
  id: 'g',
  slug: 'georgia',
  title: 'Georgia Adventure',
  destination: 'Tbilisi',
  country: 'Georgia',
  departureDate: '2027-01-18',
  durationNights: 9,
  price: { amount: 90000, currency: 'INR' },
  styleScores: { adventure: 90 },
});

const ALL = [vietnam, bali, georgia];

describe('AllTripsCatalogue', () => {
  it('renders every trip passed to it', () => {
    render(<AllTripsCatalogue trips={ALL} />);
    expect(screen.getByRole('heading', { name: 'Northern Vietnam' })).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: 'Bali Escape' })).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: 'Georgia Adventure' })).toBeInTheDocument();
  });

  it('every trip links to its real, distinct /trips/[slug] route — no dead links', () => {
    render(<AllTripsCatalogue trips={ALL} />);
    const links = screen.getAllByRole('link');
    expect(links).toHaveLength(3);
    expect(screen.getByRole('link', { name: 'View Northern Vietnam' })).toHaveAttribute(
      'href',
      '/trips/vietnam',
    );
    expect(screen.getByRole('link', { name: 'View Bali Escape' })).toHaveAttribute(
      'href',
      '/trips/bali',
    );
    expect(screen.getByRole('link', { name: 'View Georgia Adventure' })).toHaveAttribute(
      'href',
      '/trips/georgia',
    );
    for (const link of links) {
      expect(link.getAttribute('href')).toMatch(/^\/trips\/[a-z0-9-]+$/);
    }
  });

  it('search narrows the catalogue', async () => {
    const user = userEvent.setup();
    render(<AllTripsCatalogue trips={ALL} />);

    await user.type(screen.getByLabelText('Search all journeys'), 'bali');

    expect(screen.getByRole('heading', { name: 'Bali Escape' })).toBeInTheDocument();
    expect(screen.queryByText('Northern Vietnam')).not.toBeInTheDocument();
  });

  it('shows an honest empty state for a query matching nothing', async () => {
    const user = userEvent.setup();
    render(<AllTripsCatalogue trips={ALL} />);

    await user.type(screen.getByLabelText('Search all journeys'), 'antarctica');

    expect(screen.getByText('Nothing quite matches that search')).toBeInTheDocument();
  });

  it('its own "Clear filters" recovers every trip', async () => {
    const user = userEvent.setup();
    render(<AllTripsCatalogue trips={ALL} />);

    await user.type(screen.getByLabelText('Search all journeys'), 'antarctica');
    await user.click(screen.getByRole('button', { name: 'Clear filters' }));

    expect(screen.getByLabelText('Search all journeys')).toHaveValue('');
    expect(screen.getByRole('heading', { name: 'Northern Vietnam' })).toBeInTheDocument();
  });

  it('does not render discovery-only concepts — no mood section, no featured-trip badge', () => {
    render(<AllTripsCatalogue trips={ALL} />);
    expect(screen.queryByText('How do you want to travel?')).not.toBeInTheDocument();
    expect(screen.queryByText('Featured departure')).not.toBeInTheDocument();
  });
});

describe('/trips/all page', () => {
  it('renders with a working back link to /trips, and real trip data', async () => {
    const ui = await AllTripsPage();
    render(ui);

    expect(screen.getByRole('heading', { name: 'All journeys' })).toBeInTheDocument();
    expect(screen.getByRole('link', { name: '← Discover trips' })).toHaveAttribute(
      'href',
      '/trips',
    );

    const tripLinks = screen
      .getAllByRole('link')
      .filter((link) => /^\/trips\/[a-z0-9-]+$/.test(link.getAttribute('href') ?? ''));
    expect(tripLinks.length).toBeGreaterThan(0);
  });
});
