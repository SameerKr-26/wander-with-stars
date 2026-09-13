import { describe, expect, it } from 'vitest';

import {
  formatAvailability,
  formatDuration,
  formatPrice,
  formatTripDate,
  topStyleSignals,
} from '@/lib/content/format';

describe('formatTripDate', () => {
  it('formats an ISO date as a short human date', () => {
    expect(formatTripDate('2026-11-14')).toBe('14 Nov 2026');
  });
});

describe('formatPrice', () => {
  it('formats an amount with its currency symbol, no decimals', () => {
    expect(formatPrice({ amount: 68000, currency: 'INR' })).toContain('68,000');
  });
});

describe('formatDuration', () => {
  it('converts nights into a D/N pair', () => {
    expect(formatDuration(6)).toBe('7D/6N');
    expect(formatDuration(0)).toBe('1D/0N');
  });
});

describe('formatAvailability', () => {
  it('never invents urgency: no count shown when none is known', () => {
    expect(formatAvailability('open')).toBe('Open');
  });

  it('shows a real count when one is known', () => {
    expect(formatAvailability('open', 8)).toBe('8 spots left');
  });

  it('flags almost-full with its count', () => {
    expect(formatAvailability('almost-full', 3)).toBe('Almost full · 3 spots left');
  });

  it('reports waitlisted and sold out without a count', () => {
    expect(formatAvailability('waitlisted')).toBe('Waitlist open');
    expect(formatAvailability('sold-out')).toBe('Sold out');
  });
});

describe('topStyleSignals', () => {
  it('returns the highest-scoring signals, most first', () => {
    const result = topStyleSignals({ adventure: 70, social: 85, culture: 60 }, 2);
    expect(result).toEqual([
      { signal: 'social', score: 85 },
      { signal: 'adventure', score: 70 },
    ]);
  });

  it('ignores signals with no score', () => {
    const result = topStyleSignals({ adventure: 90 });
    expect(result).toEqual([{ signal: 'adventure', score: 90 }]);
  });

  it('returns nothing for an empty score set', () => {
    expect(topStyleSignals({})).toEqual([]);
  });
});
