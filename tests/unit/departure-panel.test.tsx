import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it } from 'vitest';

import { TripDeparturePanel } from '@/components/trips/departure-panel';
import type { TripDetail } from '@/lib/content/types';

/**
 * TripDeparturePanel — Phase 4.4C.
 *
 * No fixture trip has more than one public departure today, so this test
 * builds a synthetic `TripDetail` directly (the exact shape
 * `lib/content/db/map.ts`'s `mapTripDetail` produces for a real
 * multi-departure trip like Thailand Full Moon Party) rather than waiting
 * for a real one to exist in fixtures.
 */

const BASE_TRIP: TripDetail = {
  id: 'dep-oct',
  slug: 'test-trip',
  title: 'Test Trip',
  destination: 'Testland',
  country: 'Testland',
  departureDate: '2026-10-25',
  durationNights: 6,
  price: { amount: 49999, currency: 'INR' },
  availability: { status: 'open', spotsLeft: 15 },
  heroMedia: { kind: 'placeholder' },
  styleScores: {},
  overview: 'Test overview.',
  inclusions: [],
  exclusions: [],
  gallery: [],
  itineraryPreview: [],
  departures: [
    {
      id: 'dep-oct',
      departureDate: '2026-10-25',
      price: { amount: 49999, currency: 'INR' },
      availability: { status: 'open', spotsLeft: 15 },
    },
    {
      id: 'dep-nov',
      departureDate: '2026-11-22',
      price: { amount: 59999, currency: 'INR' },
      availability: { status: 'open' },
    },
    {
      id: 'dep-dec',
      departureDate: '2026-12-22',
      price: { amount: 64999, currency: 'INR' },
      availability: { status: 'almost-full', spotsLeft: 2 },
    },
  ],
};

const SINGLE_DEPARTURE_TRIP: TripDetail = (() => {
  const { departures: _departures, ...rest } = BASE_TRIP;
  return rest;
})();

describe('TripDeparturePanel — single departure', () => {
  it('renders no selector when the trip has only one public departure', () => {
    render(<TripDeparturePanel trip={SINGLE_DEPARTURE_TRIP} />);
    expect(screen.queryByRole('radio')).not.toBeInTheDocument();
    expect(screen.getByText('25 Oct 2026')).toBeInTheDocument();
    expect(screen.getByText(/49,999/)).toBeInTheDocument();
  });
});

describe('TripDeparturePanel — multiple departures (Phase 4.4C)', () => {
  it('6. shows every departure option — never hidden, never collapsed', () => {
    render(<TripDeparturePanel trip={BASE_TRIP} />);
    const radios = screen.getAllByRole('radio');
    expect(radios).toHaveLength(3);
    // '25 Oct 2026' also appears in the metadata block (it's the default
    // selection) — getAllByText, not getByText, for that one specifically.
    expect(screen.getAllByText('25 Oct 2026').length).toBeGreaterThan(0);
    expect(screen.getByText('22 Nov 2026')).toBeInTheDocument();
    expect(screen.getByText('22 Dec 2026')).toBeInTheDocument();
  });

  it('5. defaults to the earliest/soonest departure', () => {
    render(<TripDeparturePanel trip={BASE_TRIP} />);
    const radios = screen.getAllByRole('radio');
    expect(radios[0]).toBeChecked();
    expect(radios[1]).not.toBeChecked();
    expect(radios[2]).not.toBeChecked();
  });

  it('7. & 13. selecting a departure updates the displayed metadata AND the booking CTA to that same departure', async () => {
    const user = userEvent.setup();
    render(<TripDeparturePanel trip={BASE_TRIP} />);

    const decRadio = screen.getByRole('radio', { name: /22 Dec 2026/ });
    await user.click(decRadio);

    expect(decRadio).toBeChecked();
    // Price/date metadata now reflects the December departure, not October's.
    expect(screen.getAllByText(/64,999/).length).toBeGreaterThan(0);
    // Phase 4.6: the CTA is a real "Book this departure" link, pointing at
    // the currently-selected departure's own id — not the static "Not yet
    // bookable" placeholder copy Phase 4.4C shipped before booking existed.
    expect(screen.getByText(/Reserve your spot on the 22 Dec 2026 departure/)).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Book this departure' })).toHaveAttribute(
      'href',
      '/booking/dep-dec',
    );
    expect(
      screen.queryByText(/Reserve your spot on the 25 Oct 2026 departure/),
    ).not.toBeInTheDocument();
  });

  it('3. each option shows its own price paired with its own date — never mixed up', () => {
    render(<TripDeparturePanel trip={BASE_TRIP} />);
    // 49,999 (Oct) appears twice — once in its own radio option, once in the
    // metadata block, since Oct is the default selection.
    expect(screen.getAllByText(/49,999/).length).toBeGreaterThan(0);
    expect(screen.getAllByText(/59,999/).length).toBeGreaterThan(0);
    expect(screen.getAllByText(/64,999/).length).toBeGreaterThan(0);
  });

  it('15. only the options actually present are selectable — there is no way to pick a hidden/invalid departure', () => {
    render(<TripDeparturePanel trip={BASE_TRIP} />);
    const radios = screen.getAllByRole('radio');
    const values = radios.map((r) => r.getAttribute('value'));
    expect(values.sort()).toEqual(['dep-dec', 'dep-nov', 'dep-oct']);
  });
});
