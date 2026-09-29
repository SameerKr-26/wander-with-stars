import { describe, expect, it } from 'vitest';

import { formatBookingDate, formatBookingPrice } from '@/lib/booking/format';

describe('formatBookingDate', () => {
  it('formats an ISO date as a short, readable date', () => {
    expect(formatBookingDate('2026-10-25')).toBe('25 Oct 2026');
  });
});

describe('formatBookingPrice', () => {
  it('formats an amount and currency as a localized price', () => {
    expect(formatBookingPrice(49999, 'INR')).toBe('₹49,999');
  });

  it('formats a multiplied total the same way', () => {
    expect(formatBookingPrice(99998, 'INR')).toBe('₹99,998');
  });
});
