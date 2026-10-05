import { describe, expect, it } from 'vitest';

import { fromProviderSubunits, toProviderSubunits } from '@/lib/payments/amount';

describe('toProviderSubunits', () => {
  it('converts a whole-rupee amount to paise', () => {
    expect(toProviderSubunits(49999)).toBe(4999900);
  });

  it('converts a decimal amount to paise, rounding safely', () => {
    expect(toProviderSubunits(499.99)).toBe(49999);
  });

  it('handles a floating-point-prone value correctly', () => {
    // 0.1 + 0.2 style float drift would otherwise produce 9999 instead of 10000
    expect(toProviderSubunits(100.0)).toBe(10000);
  });
});

describe('fromProviderSubunits', () => {
  it('converts paise back to a decimal rupee amount', () => {
    expect(fromProviderSubunits(4999900)).toBe(49999);
  });

  it('round-trips with toProviderSubunits', () => {
    const original = 68999;
    expect(fromProviderSubunits(toProviderSubunits(original))).toBe(original);
  });
});
