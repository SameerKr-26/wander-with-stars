import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';

import { CreatorExperiencesView } from '@/components/marketing/creator-experiences';
import { FinalCTA } from '@/components/marketing/final-cta';
import { Hero } from '@/components/marketing/hero';
import { MeetYourPeopleView } from '@/components/marketing/meet-your-people';
import { TravellerStoriesView } from '@/components/marketing/traveller-stories';
import { UpcomingExperiencesView } from '@/components/marketing/upcoming-experiences';
import type {
  CommunitySnapshot,
  CreatorExperience,
  TravellerStory,
  TripPreview,
} from '@/lib/content/types';

/**
 * Homepage sections — content states and CTA routing.
 *
 * Each section splits into a pure `*View` and a Server Component that fetches
 * data (see the section files for why). These tests exercise the view
 * directly against every ContentState, independent of the data source —
 * exactly the seam that lets fixtures be replaced by Supabase later without
 * these tests changing.
 */

const SAMPLE_TRIP: TripPreview = {
  id: 't1',
  slug: 'sample',
  title: 'Sample Trip',
  destination: 'Sample Destination',
  country: 'Sampleland',
  departureDate: '2026-11-14',
  durationNights: 4,
  price: { amount: 1000, currency: 'INR' },
  availability: { status: 'open' },
  host: { name: 'Host' },
  heroMedia: { kind: 'placeholder' },
  styleScores: {},
};

describe('UpcomingExperiencesView', () => {
  it('shows skeletons while loading, hidden from assistive technology', () => {
    const { container } = render(<UpcomingExperiencesView state={{ status: 'loading' }} />);
    expect(container.querySelector('[aria-hidden="true"]')).toBeInTheDocument();
  });

  it('shows a real, honest empty state — no invented trips', () => {
    render(<UpcomingExperiencesView state={{ status: 'empty' }} />);
    expect(screen.getByText('No departures open right now')).toBeInTheDocument();
  });

  it('shows an actionable error, not a silent failure', () => {
    render(<UpcomingExperiencesView state={{ status: 'error', message: 'Network unreachable' }} />);
    expect(screen.getByRole('alert')).toHaveTextContent('Network unreachable');
  });

  it('renders every trip when data is ready', () => {
    render(
      <UpcomingExperiencesView
        state={{
          status: 'ready',
          data: [SAMPLE_TRIP, { ...SAMPLE_TRIP, id: 't2', title: 'Second Trip' }],
        }}
      />,
    );
    expect(screen.getByText('Sample Trip')).toBeInTheDocument();
    expect(screen.getByText('Second Trip')).toBeInTheDocument();
  });
});

describe('MeetYourPeopleView', () => {
  it('never shows a fabricated number when no aggregate data exists', () => {
    render(<MeetYourPeopleView state={{ status: 'empty' }} />);
    expect(screen.getByText(/real community stats will appear here/i)).toBeInTheDocument();
    // No digit anywhere in this state — nothing that could be mistaken for a metric.
    expect(screen.queryByText(/\d/)).not.toBeInTheDocument();
  });

  it('renders real aggregate stats once they exist', () => {
    const snapshot: CommunitySnapshot = {
      totalTravellers: 23,
      soloTravellers: 11,
      firstInternationalTrips: 7,
      topCities: [{ city: 'Delhi', count: 6 }],
    };
    render(<MeetYourPeopleView state={{ status: 'ready', data: snapshot }} />);
    expect(screen.getByText('23')).toBeInTheDocument();
    expect(screen.getByText('Delhi')).toBeInTheDocument();
  });
});

describe('CreatorExperiencesView', () => {
  it('shows an honest empty state rather than an invented creator', () => {
    render(<CreatorExperiencesView state={{ status: 'empty' }} />);
    expect(screen.getByText('Creator-led trips are joining the lineup')).toBeInTheDocument();
  });

  it('renders real creators once verified records exist', () => {
    const creators: CreatorExperience[] = [
      { id: 'c1', name: 'Real Creator', tagline: 'Leads trips' },
    ];
    render(<CreatorExperiencesView state={{ status: 'ready', data: creators }} />);
    expect(screen.getByText('Real Creator')).toBeInTheDocument();
  });
});

describe('TravellerStoriesView', () => {
  it('shows an honest empty state rather than a fabricated testimonial', () => {
    render(<TravellerStoriesView state={{ status: 'empty' }} />);
    expect(screen.getByText('Traveller stories are on the way')).toBeInTheDocument();
  });

  it('renders real stories once they exist', () => {
    const stories: TravellerStory[] = [
      { id: 's1', travellerName: 'A Traveller', quote: 'It was great.', createdAt: '2026-01-01' },
    ];
    render(<TravellerStoriesView state={{ status: 'ready', data: stories }} />);
    expect(screen.getByText('“It was great.”')).toBeInTheDocument();
    expect(screen.getByText('A Traveller')).toBeInTheDocument();
  });
});

describe('CTA routing — real destinations, no dead links', () => {
  it('both Hero CTAs point at the real /trips listing', () => {
    render(<Hero />);
    expect(screen.getByRole('link', { name: 'Find My Trip' })).toHaveAttribute('href', '/trips');
    expect(screen.getByRole('link', { name: 'Explore Trips' })).toHaveAttribute('href', '/trips');
  });

  it('Final CTA points at the real /trips listing', () => {
    render(<FinalCTA />);
    expect(screen.getByRole('link', { name: 'Explore Trips' })).toHaveAttribute('href', '/trips');
  });

  it('the hero heading announces the brand within the first screen', () => {
    render(<Hero />);
    expect(screen.getByRole('heading', { level: 1 })).toHaveTextContent(/adventure/i);
  });
});
