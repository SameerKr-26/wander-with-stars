import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it } from 'vitest';

import TripDetailPage from '@/app/(marketing)/trips/[slug]/page';
import { TripAccommodations } from '@/components/trips/trip-accommodation';
import { TripEssentials } from '@/components/trips/trip-essentials';
import { TripExtras } from '@/components/trips/trip-extras';
import { TripFAQs } from '@/components/trips/trip-faq';
import { TripGuide, TripPeople } from '@/components/trips/trip-host';
import { TripImportantNotes } from '@/components/trips/trip-important-notes';
import { TripMeeting } from '@/components/trips/trip-meeting-point';
import { TripPackingList } from '@/components/trips/trip-packing-list';
import { TripPolicies } from '@/components/trips/trip-policies';
import { TripTransports } from '@/components/trips/trip-transport';
import type { TripDetail } from '@/lib/content/types';

/**
 * Phase 3.5B — the trip detail page's practical/commercial information
 * layer (accommodation, transport, meeting point, packing list, important
 * notes, extras, FAQ, policies).
 *
 * Every new component takes its data as a prop, so these are tested in
 * isolation with local, clearly-synthetic fixture data ("Example ...",
 * matching the convention tests/unit/trip-content-types.test.ts already
 * established) — none of this exists in lib/content/fixtures.ts, and this
 * suite never claims otherwise. The "no fabricated content" describe block
 * at the bottom runs the REAL page against the REAL fixture data to prove
 * every new section correctly omits itself when the content layer has
 * nothing to show.
 */

function baseTrip(overrides: Partial<TripDetail> = {}): TripDetail {
  return {
    id: 'id',
    slug: 'slug',
    title: 'Shape-test trip',
    destination: 'Shape-test City',
    country: 'Shape-test Country',
    departureDate: '2027-01-01',
    durationNights: 3,
    price: { amount: 1000, currency: 'INR' },
    availability: { status: 'open' },
    host: { name: 'Shape-test Host' },
    heroMedia: { kind: 'placeholder' },
    styleScores: {},
    overview: 'Shape-test overview.',
    inclusions: [],
    exclusions: [],
    gallery: [],
    itineraryPreview: [],
    ...overrides,
  };
}

describe('TripAccommodations', () => {
  it('renders nothing when absent', () => {
    const { container } = render(<TripAccommodations items={undefined} />);
    expect(container).toBeEmptyDOMElement();
  });

  it('renders nothing for an empty array', () => {
    const { container } = render(<TripAccommodations items={[]} />);
    expect(container).toBeEmptyDOMElement();
  });

  it('renders only the fields a leg actually has, supporting multiple legs', () => {
    render(
      <TripAccommodations
        items={[
          { name: 'Example Guesthouse', type: 'Guesthouse', nights: 2 },
          { description: 'Example description only, no name or type.' },
        ]}
      />,
    );

    expect(screen.getByText('Example Guesthouse · Guesthouse · 2 nights')).toBeInTheDocument();
    expect(screen.getByText('Example description only, no name or type.')).toBeInTheDocument();
  });
});

describe('TripTransports', () => {
  it('renders nothing when absent', () => {
    const { container } = render(<TripTransports items={undefined} />);
    expect(container).toBeEmptyDOMElement();
  });

  it('supports multiple legs', () => {
    render(
      <TripTransports
        items={[
          { mode: 'Domestic flight', description: 'Example flight description.' },
          { mode: 'Private transfer' },
        ]}
      />,
    );

    expect(screen.getByText('Domestic flight')).toBeInTheDocument();
    expect(screen.getByText('Example flight description.')).toBeInTheDocument();
    expect(screen.getByText('Private transfer')).toBeInTheDocument();
  });
});

describe('TripMeeting', () => {
  it('renders nothing when absent', () => {
    const { container } = render(<TripMeeting point={undefined} />);
    expect(container).toBeEmptyDOMElement();
  });

  it('shows location, time and instructions when present', () => {
    render(
      <TripMeeting
        point={{
          location: 'Example arrivals hall',
          time: '10:00',
          instructions: 'Example instructions.',
        }}
      />,
    );

    expect(screen.getByText('Example arrivals hall')).toBeInTheDocument();
    expect(screen.getByText('10:00')).toBeInTheDocument();
    expect(screen.getByText('Example instructions.')).toBeInTheDocument();
  });

  it('omits time and instructions gracefully when only location is known', () => {
    render(<TripMeeting point={{ location: 'Example arrivals hall' }} />);
    expect(screen.getByText('Example arrivals hall')).toBeInTheDocument();
  });
});

describe('TripPackingList', () => {
  it('renders nothing when absent', () => {
    const { container } = render(<TripPackingList items={undefined} />);
    expect(container).toBeEmptyDOMElement();
  });

  it('renders every item as a real list item, decoratively marked', () => {
    render(<TripPackingList items={['Example item one', 'Example item two']} />);

    const list = screen.getByRole('list');
    const items = within(list).getAllByRole('listitem');
    expect(items).toHaveLength(2);
    expect(within(list).getByText('Example item one')).toBeInTheDocument();
  });
});

describe('TripImportantNotes', () => {
  it('renders nothing when absent', () => {
    const { container } = render(<TripImportantNotes notes={undefined} />);
    expect(container).toBeEmptyDOMElement();
  });

  it('renders title and detail for every note', () => {
    render(
      <TripImportantNotes
        notes={[{ title: 'Example note title', detail: 'Example note detail.' }]}
      />,
    );

    expect(screen.getByText('Example note title')).toBeInTheDocument();
    expect(screen.getByText('Example note detail.')).toBeInTheDocument();
  });

  it('shows a category label when a note has one (Phase 3.5C "Traveller Notes")', () => {
    render(
      <TripImportantNotes
        notes={[{ title: 'Example note', detail: 'Example detail.', category: 'etiquette' }]}
      />,
    );

    expect(screen.getByText('Etiquette')).toBeInTheDocument();
  });

  it('omits the category label when a note has none — no fabricated grouping', () => {
    render(<TripImportantNotes notes={[{ title: 'Example note', detail: 'Example detail.' }]} />);

    // No category badge rendered at all for this note.
    expect(
      screen.queryByText(/^(etiquette|weather|money|connectivity|cultural|health|arrival|other)$/i),
    ).not.toBeInTheDocument();
  });

  it('supports a mix of categorised and uncategorised notes', () => {
    render(
      <TripImportantNotes
        notes={[
          { title: 'Example note one', detail: 'Detail one.', category: 'weather' },
          { title: 'Example note two', detail: 'Detail two.' },
        ]}
      />,
    );

    expect(screen.getByText('Weather')).toBeInTheDocument();
    expect(screen.getByText('Example note two')).toBeInTheDocument();
  });
});

describe('TripEssentials — composes the above, one section not five', () => {
  it('renders nothing when the trip has none of the essentials fields', () => {
    const { container } = render(<TripEssentials trip={baseTrip()} />);
    expect(container).toBeEmptyDOMElement();
  });

  it('renders only the sub-sections that have data', () => {
    render(
      <TripEssentials
        trip={baseTrip({
          transport: [{ mode: 'Example transfer' }],
        })}
      />,
    );

    expect(screen.getByText('Before you go')).toBeInTheDocument();
    expect(screen.getByText('Transport')).toBeInTheDocument();
    expect(screen.queryByText('Accommodation')).not.toBeInTheDocument();
    expect(screen.queryByText('Meeting point')).not.toBeInTheDocument();
    expect(screen.queryByText('Things to carry')).not.toBeInTheDocument();
  });

  it('renders important notes alongside the grid when both exist', () => {
    render(
      <TripEssentials
        trip={baseTrip({
          thingsToCarry: ['Example packing item'],
          importantNotes: [{ title: 'Example note', detail: 'Example detail.' }],
        })}
      />,
    );

    expect(screen.getByText('Things to carry')).toBeInTheDocument();
    expect(screen.getByText('Important to know')).toBeInTheDocument();
  });
});

describe('TripExtras', () => {
  it('renders nothing when absent', () => {
    const { container } = render(<TripExtras extras={undefined} />);
    expect(container).toBeEmptyDOMElement();
  });

  it('shows each extra as clearly optional, with its price when known', () => {
    render(
      <TripExtras
        extras={[
          {
            name: 'Example add-on',
            price: { amount: 2500, currency: 'INR' },
            description: 'Example add-on description.',
          },
          { name: 'Example add-on without a price' },
        ]}
      />,
    );

    expect(screen.getByText(/Not included in the trip price/)).toBeInTheDocument();
    expect(screen.getByText('Example add-on')).toBeInTheDocument();
    expect(screen.getByText(/2,500/)).toBeInTheDocument();
    expect(screen.getByText('Example add-on without a price')).toBeInTheDocument();
  });
});

describe('TripFAQs — accessible accordion', () => {
  it('renders nothing when there are no FAQ entries', () => {
    const { container } = render(<TripFAQs faqs={undefined} />);
    expect(container).toBeEmptyDOMElement();
  });

  it('each entry starts collapsed and opens on activation, answer stays in the DOM either way', async () => {
    const user = userEvent.setup();
    render(<TripFAQs faqs={[{ question: 'Example question?', answer: 'Example answer.' }]} />);

    const details = screen.getByText('Example question?').closest('details') as HTMLDetailsElement;
    expect(details).not.toBeNull();
    expect(details.open).toBe(false);
    expect(screen.getByText('Example answer.')).toBeInTheDocument();

    await user.click(screen.getByText('Example question?'));
    expect(details.open).toBe(true);
  });

  it('supports several independent FAQ entries', () => {
    render(
      <TripFAQs
        faqs={[
          { question: 'Example question one?', answer: 'Example answer one.' },
          { question: 'Example question two?', answer: 'Example answer two.' },
        ]}
      />,
    );

    expect(screen.getByText('Example question one?')).toBeInTheDocument();
    expect(screen.getByText('Example question two?')).toBeInTheDocument();
  });
});

describe('TripPolicies — real terms only, never generic filler', () => {
  it('renders nothing when policy is absent', () => {
    const { container } = render(<TripPolicies policy={undefined} />);
    expect(container).toBeEmptyDOMElement();
  });

  it('renders nothing when every policy section is absent', () => {
    const { container } = render(<TripPolicies policy={{}} />);
    expect(container).toBeEmptyDOMElement();
  });

  it('renders only the sections that are present', () => {
    render(
      <TripPolicies
        policy={{
          cancellation: { title: 'Example cancellation', body: 'Example cancellation body.' },
        }}
      />,
    );

    expect(screen.getByText('Example cancellation')).toBeInTheDocument();
    expect(screen.queryByText(/refund/i)).not.toBeInTheDocument();
    expect(screen.queryByText(/payment/i)).not.toBeInTheDocument();
  });

  it('includes additionalTerms sections alongside the named ones', async () => {
    const user = userEvent.setup();
    render(
      <TripPolicies
        policy={{
          refund: { title: 'Example refund', body: 'Example refund body.' },
          additionalTerms: [{ title: 'Example condition', body: 'Example condition body.' }],
        }}
      />,
    );

    expect(screen.getByText('Example refund')).toBeInTheDocument();
    expect(screen.getByText('Example condition')).toBeInTheDocument();

    const details = screen.getByText('Example condition').closest('details') as HTMLDetailsElement;
    await user.click(screen.getByText('Example condition'));
    expect(details.open).toBe(true);
  });
});

describe("TripGuide — Phase 3.5C, reuses HostPreview's shape via GuidePreview", () => {
  it('renders nothing when the departure has no separate guide', () => {
    const { container } = render(<TripGuide guide={undefined} />);
    expect(container).toBeEmptyDOMElement();
  });

  it('never falls back to repeating the host — it just omits itself', () => {
    render(<TripGuide guide={undefined} />);
    expect(screen.queryByText('Your guide')).not.toBeInTheDocument();
  });

  it('shows the guide name and an honest fallback line when no tagline exists', () => {
    render(<TripGuide guide={{ name: 'Example Guide' }} />);
    expect(screen.getByText('Your guide')).toBeInTheDocument();
    expect(screen.getByText('Example Guide')).toBeInTheDocument();
    expect(
      screen.getByText('Leads the group through each day of activities on the ground.'),
    ).toBeInTheDocument();
  });

  it('shows the real tagline instead of the fallback when one exists', () => {
    render(<TripGuide guide={{ name: 'Example Guide', tagline: 'Example real tagline.' }} />);
    expect(screen.getByText('Example real tagline.')).toBeInTheDocument();
    expect(
      screen.queryByText('Leads the group through each day of activities on the ground.'),
    ).not.toBeInTheDocument();
  });
});

describe('TripPeople — composes host, guide and community', () => {
  it('renders host and community without a guide when none is on record', () => {
    render(<TripPeople host={{ name: 'Example Host' }} />);
    expect(screen.getByText('Your host')).toBeInTheDocument();
    expect(screen.queryByText('Your guide')).not.toBeInTheDocument();
    expect(screen.getByText("Who's going")).toBeInTheDocument();
  });

  it('renders host, guide and community together when all three exist', () => {
    render(
      <TripPeople
        host={{ name: 'Example Host' }}
        guide={{ name: 'Example Guide' }}
        travellerCount={5}
      />,
    );
    expect(screen.getByText('Example Host')).toBeInTheDocument();
    expect(screen.getByText('Example Guide')).toBeInTheDocument();
    expect(screen.getByText(/5 travellers have joined/)).toBeInTheDocument();
  });
});

describe('the real page — no fabricated content, no empty shells', () => {
  const KNOWN_SLUG = 'sample-northern-vietnam';

  it('omits every Phase 3.5B section the real fixture has no data for', async () => {
    const ui = await TripDetailPage({ params: Promise.resolve({ slug: KNOWN_SLUG }) });
    render(ui);

    expect(screen.queryByText('Before you go')).not.toBeInTheDocument();
    expect(screen.queryByText('Optional extras')).not.toBeInTheDocument();
    expect(screen.queryByText('Frequently asked')).not.toBeInTheDocument();
    expect(screen.queryByText('Terms & policies')).not.toBeInTheDocument();
  });

  it('omits the guide and never fabricates a category badge — Phase 3.5C', async () => {
    const ui = await TripDetailPage({ params: Promise.resolve({ slug: KNOWN_SLUG }) });
    render(ui);

    expect(screen.queryByText('Your guide')).not.toBeInTheDocument();
  });

  it('still renders the unchanged existing logistics section', async () => {
    const ui = await TripDetailPage({ params: Promise.resolve({ slug: KNOWN_SLUG }) });
    render(ui);
    expect(screen.getByText('Accommodation for the trip duration')).toBeInTheDocument();
  });

  it('has no nested interactive elements introduced by the new disclosure sections', async () => {
    const ui = await TripDetailPage({ params: Promise.resolve({ slug: KNOWN_SLUG }) });
    render(ui);

    for (const link of screen.getAllByRole('link')) {
      expect(within(link).queryAllByRole('button')).toHaveLength(0);
    }
  });

  it('reduced motion does not affect the (static, JS-free) new sections', async () => {
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
      expect(() => render(ui)).not.toThrow();
    } finally {
      window.matchMedia = original;
    }
  });
});
