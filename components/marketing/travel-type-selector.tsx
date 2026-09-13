'use client';

import Link from 'next/link';
import { useId, useState } from 'react';

import { Container, Section } from '@/components/ui';
import type { TravelStyleSignal } from '@/lib/content/types';

import { SectionHeading } from './section-heading';

/**
 * Find your travel type — 04.
 *
 * This is the discovery *interaction*, not the matcher. Selecting styles here
 * does not call a recommendation engine — none exists (tripMatcher is off,
 * docs/ROADMAP.md Phase 11). "See upcoming trips →" leads to the real /trips
 * page, and is built so the selected signals can be threaded into a real
 * matcher later without changing this component's shape.
 *
 * "Trip style", never "personality assessment" —
 * docs/UX_INTERACTION_GUIDE.md §7.
 */

const SIGNALS: { value: TravelStyleSignal; label: string }[] = [
  { value: 'adventure', label: 'Adventure' },
  { value: 'social', label: 'Social' },
  { value: 'party', label: 'Party' },
  { value: 'relaxation', label: 'Relaxation' },
  { value: 'culture', label: 'Culture' },
];

export function TravelTypeSelector() {
  const [selected, setSelected] = useState<Set<TravelStyleSignal>>(new Set());
  const groupId = useId();

  function toggle(value: TravelStyleSignal) {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(value)) next.delete(value);
      else next.add(value);
      return next;
    });
  }

  return (
    <Section spacing="default" id="find-your-style">
      <Container>
        <div className="flex flex-col" style={{ gap: 'var(--space-6)' }}>
          <SectionHeading
            eyebrow="Find your travel type"
            title="What kind of trip are you looking for?"
            description="Pick what matters to you. It's a starting point, not a verdict — full matching is on the way."
          />

          <div
            role="group"
            aria-labelledby={groupId}
            className="flex flex-wrap"
            style={{ gap: 'var(--space-3)' }}
          >
            <span id={groupId} className="sr-only">
              Travel style preferences
            </span>
            {SIGNALS.map(({ value, label }) => {
              const isSelected = selected.has(value);
              return (
                <button
                  key={value}
                  type="button"
                  aria-pressed={isSelected}
                  onClick={() => toggle(value)}
                  className="hover:border-border-brand cursor-pointer transition-colors"
                  style={{
                    borderRadius: 'var(--radius-pill)',
                    padding: 'var(--space-3) var(--space-5)',
                    fontSize: 'var(--text-sm)',
                    fontWeight: 'var(--weight-label)',
                    border: `1px solid ${isSelected ? 'var(--color-border-brand)' : 'var(--color-border)'}`,
                    background: isSelected ? 'var(--color-surface-brand)' : 'var(--color-surface)',
                    color: isSelected ? 'var(--color-text-on-brand)' : 'var(--color-text-primary)',
                    transitionDuration: 'var(--duration-micro)',
                  }}
                >
                  {label}
                </button>
              );
            })}
          </div>

          <Link
            href="/trips"
            className="hover:text-text-brand-strong w-fit"
            style={{
              fontSize: 'var(--text-sm)',
              fontWeight: 'var(--weight-label)',
              color: 'var(--color-text-brand)',
            }}
          >
            See upcoming trips →
          </Link>
        </div>
      </Container>
    </Section>
  );
}
