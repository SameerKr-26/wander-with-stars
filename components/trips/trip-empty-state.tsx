'use client';

import { Button, EmptyState } from '@/components/ui';

/**
 * TripEmptyState — Section I.
 *
 * The *filtered* empty state: trips exist, but nothing matches the current
 * search/filter combination. Distinct from the top-level "no departures
 * exist at all" empty state the query layer already handles (see
 * app/(marketing)/trips/page.tsx) — different cause, different message,
 * both real rather than a generic error screen.
 */
export function TripEmptyState({ onClearFilters }: { onClearFilters: () => void }) {
  return (
    <EmptyState
      title="Nothing quite matches that search"
      description="Try widening your dates or exploring another style."
      action={
        <Button variant="secondary" onClick={onClearFilters}>
          Clear filters
        </Button>
      }
    />
  );
}
