'use client';

import { Field, Input } from '@/components/ui';

/**
 * TripSearch — the primary discovery input, sitting directly beneath the
 * compact hero statement so search reads as part of the editorial opening,
 * not a separate enterprise form (Phase 3.4 §1). Still a real controlled
 * input owned by the parent orchestrator — only the visual treatment
 * changed: no boxed field, a hairline underline instead, sized off the same
 * type scale as the hero.
 */
export function TripSearch({
  value,
  onChange,
}: {
  value: string;
  onChange: (value: string) => void;
}) {
  return (
    <Field label="Search trips" className="w-full">
      <Input
        type="search"
        value={value}
        onChange={(event) => onChange(event.target.value)}
        placeholder="Where are you dreaming of going?"
        style={{
          fontFamily: 'var(--font-display)',
          fontSize: 'var(--text-xl)',
          fontWeight: 'var(--weight-subheading)',
          background: 'transparent',
          border: 'none',
          borderBottom: '1px solid var(--color-border)',
          borderRadius: 0,
          padding: 'var(--space-3) 0',
        }}
        autoComplete="off"
      />
    </Field>
  );
}
