'use client';

import { useMemo, useState } from 'react';

import { Field, Input } from '@/components/ui';
import { EMPTY_FILTERS, filterTrips } from '@/lib/content/filters';
import type { TripPreview } from '@/lib/content/types';

import { JourneyEntry } from './journey-entry';
import { TripEmptyState } from './trip-empty-state';

/**
 * AllTripsCatalogue — /trips/all's client boundary.
 *
 * /trips/all is the complete directory, not a second discovery page: no
 * hero storytelling, no mood section, no featured-trip concept — just a
 * "small discovery/search/filter bar" (a plain search, not the Refine
 * drawer's full When/Duration/Budget/Style set — that belongs to /trips)
 * over a scannable grid of every trip. Reuses `filterTrips()` — the same
 * pure function /trips uses — with every dimension but `query` left at
 * EMPTY_FILTERS, so there is exactly one filtering implementation, not two.
 *
 * Cards use JourneyEntry's `compact` emphasis: the same card, data and
 * secondary-info reveal as /trips, sized for a multi-column grid instead of
 * one full-width alternating entry.
 */

const GRID_STYLE = {
  display: 'grid',
  gap: 'var(--space-6)',
  gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))',
} as const;

export function AllTripsCatalogue({ trips }: { trips: TripPreview[] }) {
  const [query, setQuery] = useState('');

  const results = useMemo(() => filterTrips(trips, { ...EMPTY_FILTERS, query }), [trips, query]);

  return (
    <div className="flex flex-col" style={{ gap: 'var(--space-8)' }}>
      <Field label="Search all journeys" className="max-w-md">
        <Input
          type="search"
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          placeholder="Search destinations, experiences…"
          autoComplete="off"
        />
      </Field>

      {results.length > 0 ? (
        <div style={GRID_STYLE}>
          {results.map((trip) => (
            <JourneyEntry key={trip.id} trip={trip} emphasis="compact" />
          ))}
        </div>
      ) : (
        <TripEmptyState onClearFilters={() => setQuery('')} />
      )}
    </div>
  );
}
