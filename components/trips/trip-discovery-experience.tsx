'use client';

import { useMemo, useState } from 'react';

import { Container, Section, Text } from '@/components/ui';
import {
  EMPTY_FILTERS,
  filterTrips,
  getAvailableMonths,
  hasActiveFilters,
} from '@/lib/content/filters';
import type {
  TravelStyleSignal,
  TripFilters as TripFiltersState,
  TripPreview,
} from '@/lib/content/types';

import './trips.css';
import { JourneyEntry } from './journey-entry';
import { JourneyList } from './journey-list';
import { RefineDrawer, RefineTrigger } from './refine-drawer';
import { TripEmptyState } from './trip-empty-state';
import { TripSearch } from './trip-search';

/**
 * TripDiscoveryExperience — the single client boundary for /trips
 * (Phase 3.4 editorial redesign — "Browse visually. Refine deliberately.").
 *
 * Owns all filter state (query, styles, month, duration, budget) and derives
 * the visible trip set with `filterTrips()`, a pure function in
 * lib/content/filters.ts — unchanged by this redesign. Every sub-component
 * here is presentational: it reads props and calls a callback, never
 * touches TripFilters directly.
 *
 * Presentation order follows the brief: compact hero (rendered by the
 * server-component page above this) + search, the featured "next escape",
 * and the alternating "more journeys" list. The closing CTA
 * (trip-discovery-cta.tsx) is now plain navigation to /trips/all with no
 * dependency on this component's state, so the page renders it itself,
 * outside this client boundary. Filtering controls beyond search —
 * including travel style — live behind one Refine drawer rather than a
 * persistent filter row or a standalone mood section (the latter was
 * removed; see refine-drawer.tsx for style filtering).
 *
 * Results ordering: filterTrips() output's first item becomes the featured
 * trip; the rest go to the alternating list. A "More journeys" continuation
 * only appears once the remainder is large enough to be a genuinely separate
 * group (RESULTS_SPLIT) — with the current handful of fixture trips that
 * never fires, which is correct: it must not invent a second group's worth
 * of trips to fill the section out.
 */

/** Remainder must exceed this before a distinct "More journeys" list appears. */
const RESULTS_SPLIT = 6;

export function TripDiscoveryExperience({ trips }: { trips: TripPreview[] }) {
  const [filters, setFilters] = useState<TripFiltersState>(EMPTY_FILTERS);
  const [refineOpen, setRefineOpen] = useState(false);

  const months = useMemo(() => getAvailableMonths(trips), [trips]);
  const results = useMemo(() => filterTrips(trips, filters), [trips, filters]);

  const featured = results[0];
  const remainder = featured ? results.slice(1) : [];
  const gridTrips =
    remainder.length > RESULTS_SPLIT ? remainder.slice(0, RESULTS_SPLIT) : remainder;
  const moreTrips = remainder.length > RESULTS_SPLIT ? remainder.slice(RESULTS_SPLIT) : [];

  const activeFilterCount =
    (filters.month ? 1 : 0) +
    (filters.duration ? 1 : 0) +
    (filters.budget ? 1 : 0) +
    filters.styles.length;

  /**
   * Resets every filter dimension (query, styles, month, duration, budget)
   * in one assignment to the existing EMPTY_FILTERS constant — the same
   * source of truth every control here reads and writes, so there is no
   * second reset implementation to keep in sync. Used by the Refine
   * drawer's own "Clear filters" and by the filtered empty state — both
   * still legitimately reset in place, unlike "See every trip", which now
   * navigates to /trips/all instead (trip-discovery-cta.tsx). Also scrolls
   * to results, so a reset triggered from inside the (possibly far
   * scrolled) Refine drawer doesn't leave the restored list out of view.
   */
  function resetFilters() {
    setFilters(EMPTY_FILTERS);
    scrollToResults();
  }

  /** Refine's Style checkboxes are independent — several can combine (filterTrips OR-combines them). */
  function toggleStyle(signal: TravelStyleSignal) {
    setFilters((prev) => ({
      ...prev,
      styles: prev.styles.includes(signal)
        ? prev.styles.filter((s) => s !== signal)
        : [...prev.styles, signal],
    }));
  }

  function scrollToResults() {
    const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    document
      .getElementById('discovery-results')
      ?.scrollIntoView({ behavior: prefersReducedMotion ? 'auto' : 'smooth', block: 'start' });
  }

  return (
    <>
      <Section spacing="tight" style={{ paddingTop: 0 }}>
        <Container>
          <div className="flex flex-col" style={{ gap: 'var(--space-4)' }}>
            <TripSearch
              value={filters.query}
              onChange={(query) => setFilters((prev) => ({ ...prev, query }))}
            />
            <RefineTrigger onClick={() => setRefineOpen(true)} activeCount={activeFilterCount} />
          </div>
        </Container>
      </Section>

      <Section spacing="default" id="discovery-results">
        <Container>
          {featured ? (
            <div className="flex flex-col" style={{ gap: 'var(--space-16)' }}>
              {hasActiveFilters(filters) ? (
                <div
                  className="flex flex-wrap items-baseline justify-between"
                  style={{ gap: 'var(--space-3)' }}
                >
                  <Text variant="small" tone="secondary">
                    {results.length} {results.length === 1 ? 'journey' : 'journeys'} found
                  </Text>
                  <button
                    type="button"
                    onClick={() => setRefineOpen(true)}
                    className="hover:text-text-brand-strong cursor-pointer"
                    style={{
                      color: 'var(--color-text-brand)',
                      fontSize: 'var(--text-sm)',
                      fontWeight: 'var(--weight-label)',
                    }}
                  >
                    Refine
                  </button>
                </div>
              ) : null}

              <JourneyEntry trip={featured} emphasis="featured" priority />
              <JourneyList
                trips={gridTrips}
                heading={gridTrips.length > 0 ? 'Upcoming journeys' : undefined}
                startIndex={1}
              />
            </div>
          ) : (
            <TripEmptyState onClearFilters={resetFilters} />
          )}
        </Container>
      </Section>

      {moreTrips.length > 0 ? (
        <Section spacing="default">
          <Container>
            <JourneyList
              trips={moreTrips}
              heading="More journeys"
              startIndex={gridTrips.length + 1}
            />
          </Container>
        </Section>
      ) : null}

      <RefineDrawer
        open={refineOpen}
        onClose={() => setRefineOpen(false)}
        months={months}
        month={filters.month}
        onMonthChange={(month) => setFilters((prev) => ({ ...prev, month }))}
        duration={filters.duration}
        onDurationChange={(duration) => setFilters((prev) => ({ ...prev, duration }))}
        budget={filters.budget}
        onBudgetChange={(budget) => setFilters((prev) => ({ ...prev, budget }))}
        styles={filters.styles}
        onToggleStyle={toggleStyle}
        activeCount={activeFilterCount}
        onClear={resetFilters}
      />
    </>
  );
}
