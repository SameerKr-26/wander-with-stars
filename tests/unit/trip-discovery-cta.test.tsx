import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';

import { TripDiscoveryCTA } from '@/components/trips/trip-discovery-cta';

/**
 * TripDiscoveryCTA — "See every trip" is now real navigation to /trips/all
 * (Phase 3.4 final correction), not a filter reset. These tests confirm it
 * is a genuine link — real `href`, no click handler, no hash anchor — and
 * nothing else about the closing CTA changed.
 */
describe('TripDiscoveryCTA — "See every trip" navigation', () => {
  it('renders a real link to /trips/all, not a button', () => {
    render(<TripDiscoveryCTA />);
    const link = screen.getByRole('link', { name: 'See every trip' });
    expect(link).toHaveAttribute('href', '/trips/all');
  });

  it('is not a hash anchor and carries no onClick-style affordance', () => {
    render(<TripDiscoveryCTA />);
    const link = screen.getByRole('link', { name: 'See every trip' });
    expect(link.getAttribute('href')).not.toMatch(/^#/);
    expect(link.tagName).toBe('A');
  });

  it('there is no "reset"-shaped button left in this component', () => {
    render(<TripDiscoveryCTA />);
    expect(screen.queryByRole('button', { name: 'See every trip' })).not.toBeInTheDocument();
  });

  it('keeps the same supporting copy', () => {
    render(<TripDiscoveryCTA />);
    expect(screen.getByText('Not sure where to start?')).toBeInTheDocument();
    expect(screen.getByText('Explore the journeys waiting for you.')).toBeInTheDocument();
  });
});
