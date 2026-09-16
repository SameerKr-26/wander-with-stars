import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it } from 'vitest';

import { TripDiscoveryExperience } from '@/components/trips/trip-discovery-experience';
import type { TripPreview } from '@/lib/content/types';

/**
 * TripDiscoveryExperience — the interactive core of /trips (Phase 3.4
 * editorial redesign).
 *
 * Trips are defined locally so these tests describe filtering and
 * interaction, not whichever fixture trips currently exist in
 * lib/content/fixtures.ts. `window.matchMedia`, `IntersectionObserver` and
 * `Element.scrollIntoView` are polyfilled globally in tests/setup — see
 * tests/setup/dom-polyfills.ts and tests/setup/dialog-polyfill.ts (the
 * Refine drawer is a native <dialog>, which jsdom does not implement at
 * all).
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

const kyoto = trip({
  id: 'k',
  slug: 'kyoto',
  title: 'Kyoto in Autumn',
  destination: 'Kyoto',
  country: 'Japan',
  departureDate: '2026-11-20',
  durationNights: 5,
  price: { amount: 72000, currency: 'INR' },
  styleScores: { culture: 88 },
});

const ALL = [vietnam, bali, georgia, kyoto];

/** Opens the Refine drawer via its primary trigger. */
async function openRefine(user: ReturnType<typeof userEvent.setup>) {
  await user.click(screen.getByRole('button', { name: '+ Refine' }));
}

describe('rendering', () => {
  it('renders the featured trip and the alternating journey list', () => {
    render(<TripDiscoveryExperience trips={ALL} />);
    expect(screen.getByRole('heading', { name: 'Northern Vietnam' })).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: 'Upcoming journeys' })).toBeInTheDocument();
  });

  it('every trip link points at its real, distinct /trips/[slug] route', () => {
    render(<TripDiscoveryExperience trips={ALL} />);
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
    expect(screen.getByRole('link', { name: 'View Kyoto in Autumn' })).toHaveAttribute(
      'href',
      '/trips/kyoto',
    );
  });

  it('has no dead links — every rendered link has a real, non-empty /trips/ href', () => {
    render(<TripDiscoveryExperience trips={ALL} />);
    const links = screen.getAllByRole('link');
    expect(links.length).toBeGreaterThan(0);
    for (const link of links) {
      const href = link.getAttribute('href');
      expect(href).toMatch(/^\/trips\/[a-z0-9-]+$/);
    }
  });

  it('does not show the results-feedback line before any filter is active', () => {
    render(<TripDiscoveryExperience trips={ALL} />);
    expect(screen.queryByText(/journeys? found/)).not.toBeInTheDocument();
  });

  it('no longer renders "See every trip" — it moved to the page, as plain navigation', () => {
    render(<TripDiscoveryExperience trips={ALL} />);
    expect(screen.queryByText('See every trip')).not.toBeInTheDocument();
  });

  it('does not render the removed mood-discovery section', () => {
    render(<TripDiscoveryExperience trips={ALL} />);
    expect(screen.queryByText('How do you want to travel?')).not.toBeInTheDocument();
    // "Slow" appeared nowhere else in the UI — every other surface that
    // mentions travel style calls it "Relax" (Refine) or a style badge.
    expect(screen.queryByText(/^Slow$/)).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /^Slow\b/i })).not.toBeInTheDocument();
    expect(screen.queryByText('Less rushing. More being there.')).not.toBeInTheDocument();
  });
});

describe('search filtering', () => {
  it('narrows results as the user types', async () => {
    const user = userEvent.setup();
    render(<TripDiscoveryExperience trips={ALL} />);
    const search = screen.getByLabelText('Search trips');

    await user.type(search, 'bali');

    expect(screen.getByRole('heading', { name: 'Bali Escape' })).toBeInTheDocument();
    expect(screen.queryByText('Northern Vietnam')).not.toBeInTheDocument();
  });

  it('is a real controlled input — typed text is reflected in the field', async () => {
    const user = userEvent.setup();
    render(<TripDiscoveryExperience trips={ALL} />);
    const search = screen.getByLabelText('Search trips');

    await user.type(search, 'vietnam');
    expect(search).toHaveValue('vietnam');
  });

  it('shows an intentional result count once a filter is active', async () => {
    const user = userEvent.setup();
    render(<TripDiscoveryExperience trips={ALL} />);

    await user.type(screen.getByLabelText('Search trips'), 'bali');
    expect(screen.getByText('1 journey found')).toBeInTheDocument();
  });
});

describe('Refine drawer', () => {
  it('opens on trigger click and moves focus into the dialog', async () => {
    const user = userEvent.setup();
    render(<TripDiscoveryExperience trips={ALL} />);

    await openRefine(user);

    expect(screen.getByRole('heading', { name: 'Refine your search' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Close' })).toHaveFocus();
  });

  it('Escape closes the drawer and restores focus to the trigger', async () => {
    const user = userEvent.setup();
    render(<TripDiscoveryExperience trips={ALL} />);
    const trigger = screen.getByRole('button', { name: '+ Refine' });

    await user.click(trigger);
    expect(trigger).not.toHaveFocus();

    await user.keyboard('{Escape}');
    expect(trigger).toHaveFocus();
  });

  it('the close button also closes the drawer and restores focus', async () => {
    const user = userEvent.setup();
    render(<TripDiscoveryExperience trips={ALL} />);
    const trigger = screen.getByRole('button', { name: '+ Refine' });

    await user.click(trigger);
    await user.click(screen.getByRole('button', { name: 'Close' }));

    expect(trigger).toHaveFocus();
  });

  describe('duration filtering', () => {
    it('narrows to trips within the selected duration bucket', async () => {
      const user = userEvent.setup();
      render(<TripDiscoveryExperience trips={ALL} />);

      await openRefine(user);
      await user.click(screen.getByLabelText('Short (up to 4 nights)'));

      expect(screen.getByRole('heading', { name: 'Bali Escape' })).toBeInTheDocument();
      expect(screen.queryByText('Northern Vietnam')).not.toBeInTheDocument();
    });
  });

  describe('budget filtering', () => {
    it('narrows to trips within the selected budget bucket', async () => {
      const user = userEvent.setup();
      render(<TripDiscoveryExperience trips={ALL} />);

      await openRefine(user);
      await user.click(screen.getByLabelText('Above ₹75,000'));

      expect(screen.getByRole('heading', { name: 'Georgia Adventure' })).toBeInTheDocument();
      expect(screen.queryByText('Northern Vietnam')).not.toBeInTheDocument();
      expect(screen.queryByText('Bali Escape')).not.toBeInTheDocument();
    });
  });

  describe('month filtering', () => {
    it('narrows to trips departing in the selected month', async () => {
      const user = userEvent.setup();
      render(<TripDiscoveryExperience trips={ALL} />);

      await openRefine(user);
      await user.selectOptions(screen.getByLabelText('When'), '2026-11');

      expect(screen.getByRole('heading', { name: 'Northern Vietnam' })).toBeInTheDocument();
      expect(screen.queryByText('Bali Escape')).not.toBeInTheDocument();
    });
  });

  describe('style filtering — every signal, multi-select', () => {
    it('Adventure narrows to trips scored for it', async () => {
      const user = userEvent.setup();
      render(<TripDiscoveryExperience trips={ALL} />);

      await openRefine(user);
      await user.click(screen.getByLabelText('Adventure'));

      expect(screen.getByRole('heading', { name: 'Northern Vietnam' })).toBeInTheDocument();
      expect(screen.getByRole('heading', { name: 'Georgia Adventure' })).toBeInTheDocument();
      expect(screen.queryByText('Bali Escape')).not.toBeInTheDocument();
      expect(screen.queryByText('Kyoto in Autumn')).not.toBeInTheDocument();
    });

    it('Social narrows to trips scored for it', async () => {
      const user = userEvent.setup();
      render(<TripDiscoveryExperience trips={ALL} />);

      await openRefine(user);
      await user.click(screen.getByLabelText('Social'));

      expect(screen.getByRole('heading', { name: 'Northern Vietnam' })).toBeInTheDocument();
      expect(screen.queryByText('Bali Escape')).not.toBeInTheDocument();
      expect(screen.queryByText('Georgia Adventure')).not.toBeInTheDocument();
      expect(screen.queryByText('Kyoto in Autumn')).not.toBeInTheDocument();
    });

    it('Culture narrows to trips scored for it', async () => {
      const user = userEvent.setup();
      render(<TripDiscoveryExperience trips={ALL} />);

      await openRefine(user);
      await user.click(screen.getByLabelText('Culture'));

      expect(screen.getByRole('heading', { name: 'Kyoto in Autumn' })).toBeInTheDocument();
      expect(screen.queryByText('Northern Vietnam')).not.toBeInTheDocument();
      expect(screen.queryByText('Bali Escape')).not.toBeInTheDocument();
      expect(screen.queryByText('Georgia Adventure')).not.toBeInTheDocument();
    });

    it('Relax narrows to trips scored for it', async () => {
      const user = userEvent.setup();
      render(<TripDiscoveryExperience trips={ALL} />);

      await openRefine(user);
      await user.click(screen.getByLabelText('Relax'));

      expect(screen.getByRole('heading', { name: 'Bali Escape' })).toBeInTheDocument();
      expect(screen.queryByText('Northern Vietnam')).not.toBeInTheDocument();
      expect(screen.queryByText('Georgia Adventure')).not.toBeInTheDocument();
      expect(screen.queryByText('Kyoto in Autumn')).not.toBeInTheDocument();
    });

    it('Party and Nature return an honest empty result — no fixture trip scores either', async () => {
      const user = userEvent.setup();
      render(<TripDiscoveryExperience trips={ALL} />);

      await openRefine(user);
      await user.click(screen.getByLabelText('Party'));
      expect(screen.getByText('Nothing quite matches that search')).toBeInTheDocument();

      await user.click(screen.getByLabelText('Party'));
      await user.click(screen.getByLabelText('Nature'));
      expect(screen.getByText('Nothing quite matches that search')).toBeInTheDocument();
    });

    it('several selected styles OR-combine', async () => {
      const user = userEvent.setup();
      render(<TripDiscoveryExperience trips={ALL} />);

      await openRefine(user);
      await user.click(screen.getByLabelText('Relax'));
      await user.click(screen.getByLabelText('Adventure'));

      expect(screen.getByRole('heading', { name: 'Northern Vietnam' })).toBeInTheDocument();
      expect(screen.getByRole('heading', { name: 'Bali Escape' })).toBeInTheDocument();
      expect(screen.getByRole('heading', { name: 'Georgia Adventure' })).toBeInTheDocument();
      expect(screen.queryByText('Kyoto in Autumn')).not.toBeInTheDocument();
    });
  });

  describe('combined filtering', () => {
    it('AND-combines duration and budget', async () => {
      const user = userEvent.setup();
      render(<TripDiscoveryExperience trips={ALL} />);

      await openRefine(user);
      await user.click(screen.getByLabelText('Long (8+ nights)'));
      await user.click(screen.getByLabelText('Above ₹75,000'));

      expect(screen.getByRole('heading', { name: 'Georgia Adventure' })).toBeInTheDocument();
      expect(screen.queryByText('Northern Vietnam')).not.toBeInTheDocument();
      expect(screen.queryByText('Bali Escape')).not.toBeInTheDocument();
    });

    it('search and style narrow together, to nothing if there is no overlap', async () => {
      const user = userEvent.setup();
      render(<TripDiscoveryExperience trips={ALL} />);

      await openRefine(user);
      await user.click(screen.getByLabelText('Adventure'));
      await user.keyboard('{Escape}');
      await user.type(screen.getByLabelText('Search trips'), 'bali');

      expect(screen.getByText('Nothing quite matches that search')).toBeInTheDocument();
    });
  });

  describe('clearing filters', () => {
    it('the drawer footer’s "Clear filters" only appears once a filter is active', async () => {
      const user = userEvent.setup();
      render(<TripDiscoveryExperience trips={ALL} />);

      await openRefine(user);
      expect(screen.queryByRole('button', { name: 'Clear filters' })).not.toBeInTheDocument();

      await user.click(screen.getByLabelText('Short (up to 4 nights)'));
      expect(screen.getByRole('button', { name: 'Clear filters' })).toBeInTheDocument();
    });

    it('clicking it restores every trip and every control to its default', async () => {
      const user = userEvent.setup();
      render(<TripDiscoveryExperience trips={ALL} />);

      await openRefine(user);
      await user.click(screen.getByLabelText('Short (up to 4 nights)'));
      await user.click(screen.getByRole('button', { name: 'Clear filters' }));

      expect(screen.getByLabelText('Any duration')).toBeChecked();
      expect(screen.getByRole('heading', { name: 'Northern Vietnam' })).toBeInTheDocument();
      expect(screen.getByRole('heading', { name: 'Bali Escape' })).toBeInTheDocument();
    });
  });
});

describe('empty results', () => {
  it('shows the empty state for a query matching nothing, not an error screen', async () => {
    const user = userEvent.setup();
    render(<TripDiscoveryExperience trips={ALL} />);
    await user.type(screen.getByLabelText('Search trips'), 'antarctica');

    expect(screen.getByText('Nothing quite matches that search')).toBeInTheDocument();
    expect(screen.queryByRole('alert')).not.toBeInTheDocument();
  });

  it('its own "Clear filters" button recovers results', async () => {
    const user = userEvent.setup();
    render(<TripDiscoveryExperience trips={ALL} />);
    await user.type(screen.getByLabelText('Search trips'), 'antarctica');

    const emptyState = screen.getByText('Nothing quite matches that search').closest('div');
    expect(emptyState).not.toBeNull();
    await user.click(
      within(emptyState as HTMLElement).getByRole('button', { name: 'Clear filters' }),
    );

    expect(screen.getByRole('heading', { name: 'Northern Vietnam' })).toBeInTheDocument();
  });
});

describe('keyboard accessibility', () => {
  it('the search field is reachable and usable by keyboard', async () => {
    const user = userEvent.setup();
    render(<TripDiscoveryExperience trips={ALL} />);
    await user.tab();
    expect(screen.getByLabelText('Search trips')).toHaveFocus();
  });

  it('Refine style checkboxes are focusable and toggle on Space', async () => {
    const user = userEvent.setup();
    render(<TripDiscoveryExperience trips={ALL} />);

    await openRefine(user);
    const relax = screen.getByLabelText('Relax');
    relax.focus();
    await user.keyboard(' ');

    expect(relax).toBeChecked();
  });

  it('no control anywhere traps focus — Tab keeps moving through the page', async () => {
    const user = userEvent.setup();
    render(<TripDiscoveryExperience trips={ALL} />);
    const search = screen.getByLabelText('Search trips');
    search.focus();

    for (let i = 0; i < 5; i += 1) {
      await user.tab();
    }

    expect(document.activeElement).not.toBe(search);
    expect(document.activeElement).not.toBe(document.body);
  });
});

describe('reduced motion', () => {
  it('resetting filters via Refine\'s "Clear filters" still scrolls to results, without throwing, under reduced motion', async () => {
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
      const user = userEvent.setup();
      render(<TripDiscoveryExperience trips={ALL} />);
      await openRefine(user);
      await user.click(screen.getByLabelText('Short (up to 4 nights)'));
      await user.click(screen.getByRole('button', { name: 'Clear filters' }));

      expect(screen.getByLabelText('Any duration')).toBeChecked();
      expect(screen.getByRole('heading', { name: 'Northern Vietnam' })).toBeInTheDocument();
    } finally {
      window.matchMedia = original;
    }
  });
});
