import { describe, expect, it } from 'vitest';

import { buildBookingSnapshot } from '@/lib/booking/snapshot';

describe('buildBookingSnapshot', () => {
  const trip = { title: 'Vietnam 6N/7D', slug: 'vietnam-6n7d', destination: 'Hanoi & Ha Long Bay' };

  it('maps every snapshot field from the trip and departure', () => {
    const snapshot = buildBookingSnapshot(trip, {
      departureDate: '2099-06-01',
      returnDate: '2099-06-07',
      priceAmount: 68000,
      priceCurrency: 'INR',
    });

    expect(snapshot).toEqual({
      snapshotTripTitle: 'Vietnam 6N/7D',
      snapshotTripSlug: 'vietnam-6n7d',
      snapshotDestination: 'Hanoi & Ha Long Bay',
      snapshotDepartureDate: '2099-06-01',
      snapshotReturnDate: '2099-06-07',
      snapshotPriceAmount: 68000,
      snapshotPriceCurrency: 'INR',
    });
  });

  it('normalizes a missing return date to null, not undefined', () => {
    const snapshot = buildBookingSnapshot(trip, {
      departureDate: '2099-06-01',
      priceAmount: 68000,
      priceCurrency: 'INR',
    });
    expect(snapshot.snapshotReturnDate).toBeNull();
  });

  it('never re-reads anything beyond what was passed in — no hidden defaults for price/currency', () => {
    const snapshot = buildBookingSnapshot(trip, {
      departureDate: '2099-06-01',
      priceAmount: 1,
      priceCurrency: 'USD',
    });
    expect(snapshot.snapshotPriceAmount).toBe(1);
    expect(snapshot.snapshotPriceCurrency).toBe('USD');
  });
});
