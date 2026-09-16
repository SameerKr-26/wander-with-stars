'use client';

import { useId, type ReactNode } from 'react';

import { Badge, Button, Checkbox, Drawer, Field, Radio, Select } from '@/components/ui';
import type { BudgetBucket, DurationBucket, TravelStyleSignal } from '@/lib/content/types';

/**
 * Refine — Section 5.
 *
 * Replaces the previous persistent "When / Duration / Budget" row, which
 * read as a booking-engine search form, with a single compact trigger and an
 * accessible Drawer. The filter *state and architecture* are unchanged —
 * this only moves the existing When/Duration/Budget controls (plus the full
 * six-signal Style set, previously a separate tab bar) behind one
 * disclosure. `lib/content/filters.ts` remains the only place that
 * interprets TripFilters; every handler here is a passthrough from the
 * orchestrator, same as the row it replaces.
 *
 * Two touchpoints share one Drawer instance: the primary trigger (rendered
 * next to search) and the results-feedback row's secondary "Refine" text
 * action both just call the same `onClick` — see trip-discovery-experience.tsx.
 */

const DURATION_OPTIONS: { value: DurationBucket; label: string }[] = [
  { value: 'short', label: 'Short (up to 4 nights)' },
  { value: 'medium', label: 'Medium (5–7 nights)' },
  { value: 'long', label: 'Long (8+ nights)' },
];

const BUDGET_OPTIONS: { value: BudgetBucket; label: string }[] = [
  { value: 'budget', label: 'Under ₹50,000' },
  { value: 'mid', label: '₹50,000–₹75,000' },
  { value: 'premium', label: 'Above ₹75,000' },
];

const STYLE_OPTIONS: { value: TravelStyleSignal; label: string }[] = [
  { value: 'adventure', label: 'Adventure' },
  { value: 'social', label: 'Social' },
  { value: 'party', label: 'Party' },
  { value: 'relaxation', label: 'Relax' },
  { value: 'culture', label: 'Culture' },
  { value: 'nature', label: 'Nature' },
];

function Legend({ children }: { children: ReactNode }) {
  return (
    <legend
      className="text-text-primary"
      style={{
        fontSize: 'var(--text-sm)',
        fontWeight: 'var(--weight-label)',
        marginBottom: 'var(--space-3)',
        padding: 0,
      }}
    >
      {children}
    </legend>
  );
}

/** Compact trigger. Rendered near search on desktop and mobile alike. */
export function RefineTrigger({
  onClick,
  activeCount,
  className,
}: {
  onClick: () => void;
  activeCount: number;
  className?: string;
}) {
  return (
    <Button variant="secondary" size="sm" onClick={onClick} className={className}>
      + Refine
      {activeCount > 0 ? (
        <Badge tone="accent" aria-label={`${activeCount} filters active`}>
          {activeCount}
        </Badge>
      ) : null}
    </Button>
  );
}

export interface RefineDrawerProps {
  open: boolean;
  onClose: () => void;
  months: { value: string; label: string }[];
  month: string | null;
  onMonthChange: (value: string | null) => void;
  duration: DurationBucket | null;
  onDurationChange: (value: DurationBucket | null) => void;
  budget: BudgetBucket | null;
  onBudgetChange: (value: BudgetBucket | null) => void;
  styles: TravelStyleSignal[];
  onToggleStyle: (value: TravelStyleSignal) => void;
  activeCount: number;
  onClear: () => void;
}

export function RefineDrawer({
  open,
  onClose,
  months,
  month,
  onMonthChange,
  duration,
  onDurationChange,
  budget,
  onBudgetChange,
  styles,
  onToggleStyle,
  activeCount,
  onClear,
}: RefineDrawerProps) {
  const base = useId();

  return (
    <Drawer
      open={open}
      onClose={onClose}
      title="Refine your search"
      footer={
        activeCount > 0 ? (
          <Button variant="tertiary" onClick={onClear}>
            Clear filters
          </Button>
        ) : undefined
      }
    >
      <div className="flex flex-col" style={{ gap: 'var(--space-8)' }}>
        <Field label="When">
          <Select
            value={month ?? ''}
            onChange={(event) => onMonthChange(event.target.value || null)}
          >
            <option value="">Any time</option>
            {months.map((m) => (
              <option key={m.value} value={m.value}>
                {m.label}
              </option>
            ))}
          </Select>
        </Field>

        <fieldset className="flex flex-col" style={{ gap: 'var(--space-2)' }}>
          <Legend>Duration</Legend>
          <Radio
            name={`${base}-duration`}
            label="Any duration"
            checked={duration === null}
            onChange={() => onDurationChange(null)}
          />
          {DURATION_OPTIONS.map((option) => (
            <Radio
              key={option.value}
              name={`${base}-duration`}
              label={option.label}
              checked={duration === option.value}
              onChange={() => onDurationChange(option.value)}
            />
          ))}
        </fieldset>

        <fieldset className="flex flex-col" style={{ gap: 'var(--space-2)' }}>
          <Legend>Budget</Legend>
          <Radio
            name={`${base}-budget`}
            label="Any budget"
            checked={budget === null}
            onChange={() => onBudgetChange(null)}
          />
          {BUDGET_OPTIONS.map((option) => (
            <Radio
              key={option.value}
              name={`${base}-budget`}
              label={option.label}
              checked={budget === option.value}
              onChange={() => onBudgetChange(option.value)}
            />
          ))}
        </fieldset>

        <fieldset className="flex flex-col" style={{ gap: 'var(--space-2)' }}>
          <Legend>Style</Legend>
          {STYLE_OPTIONS.map((option) => (
            <Checkbox
              key={option.value}
              label={option.label}
              checked={styles.includes(option.value)}
              onChange={() => onToggleStyle(option.value)}
            />
          ))}
        </fieldset>
      </div>
    </Drawer>
  );
}
