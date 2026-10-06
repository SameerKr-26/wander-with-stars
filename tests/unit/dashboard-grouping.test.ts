import { describe, expect, it } from 'vitest';

import { classifyBooking, groupBookings, pickAuthoritativePayment } from '@/lib/dashboard/grouping';

const NOW = new Date('2026-06-15T12:00:00Z');

describe('classifyBooking', () => {
  it('classifies a cancelled booking as cancelled regardless of date', () => {
    expect(classifyBooking('cancelled', '2099-01-01', NOW)).toBe('cancelled');
    expect(classifyBooking('cancelled', '2000-01-01', NOW)).toBe('cancelled');
  });

  it('classifies a completed booking as past regardless of date', () => {
    expect(classifyBooking('completed', '2099-01-01', NOW)).toBe('past');
  });

  it('classifies a pending/confirmed booking with a future departure as upcoming', () => {
    expect(classifyBooking('pending', '2026-07-01', NOW)).toBe('upcoming');
    expect(classifyBooking('confirmed', '2026-07-01', NOW)).toBe('upcoming');
  });

  it('classifies a pending/confirmed booking with a past departure as past', () => {
    expect(classifyBooking('pending', '2026-01-01', NOW)).toBe('past');
    expect(classifyBooking('confirmed', '2026-01-01', NOW)).toBe('past');
  });

  it('treats today itself as still upcoming, not past', () => {
    expect(classifyBooking('confirmed', '2026-06-15', NOW)).toBe('upcoming');
  });
});

describe('groupBookings', () => {
  const bookings = [
    { id: 'a', status: 'confirmed' as const, snapshotDepartureDate: '2026-08-01' },
    { id: 'b', status: 'confirmed' as const, snapshotDepartureDate: '2026-07-01' },
    { id: 'c', status: 'completed' as const, snapshotDepartureDate: '2026-01-01' },
    { id: 'd', status: 'completed' as const, snapshotDepartureDate: '2026-02-01' },
    { id: 'e', status: 'cancelled' as const, snapshotDepartureDate: '2026-09-01' },
  ];

  it('sorts bookings into the correct three groups', () => {
    const groups = groupBookings(bookings, NOW);
    expect(groups.upcoming.map((b) => b.id)).toEqual(['b', 'a']);
    expect(groups.past.map((b) => b.id)).toEqual(['d', 'c']);
    expect(groups.cancelled.map((b) => b.id)).toEqual(['e']);
  });

  it('sorts upcoming soonest-first', () => {
    const groups = groupBookings(bookings, NOW);
    expect(groups.upcoming[0]!.id).toBe('b');
  });

  it('sorts past most-recent-first', () => {
    const groups = groupBookings(bookings, NOW);
    expect(groups.past[0]!.id).toBe('d');
  });

  it('returns empty arrays, never undefined, for a group with no bookings', () => {
    const groups = groupBookings([], NOW);
    expect(groups).toEqual({ upcoming: [], past: [], cancelled: [] });
  });
});

describe('pickAuthoritativePayment', () => {
  it('returns null when there are no payment attempts at all', () => {
    expect(pickAuthoritativePayment([])).toBeNull();
  });

  it('prefers a succeeded payment over any other status', () => {
    const payments = [
      { status: 'failed' as const, createdAt: '2026-01-02T00:00:00Z' },
      { status: 'succeeded' as const, createdAt: '2026-01-01T00:00:00Z' },
    ];
    expect(pickAuthoritativePayment(payments)?.status).toBe('succeeded');
  });

  it('returns the most recently created attempt when none succeeded', () => {
    const payments = [
      { status: 'failed' as const, createdAt: '2026-01-01T00:00:00Z' },
      { status: 'pending' as const, createdAt: '2026-01-03T00:00:00Z' },
      { status: 'failed' as const, createdAt: '2026-01-02T00:00:00Z' },
    ];
    expect(pickAuthoritativePayment(payments)?.createdAt).toBe('2026-01-03T00:00:00Z');
  });

  it('never re-surfaces a refunded or failed row over a later succeeded one', () => {
    const payments = [
      { status: 'refunded' as const, createdAt: '2026-01-01T00:00:00Z' },
      { status: 'succeeded' as const, createdAt: '2026-01-02T00:00:00Z' },
    ];
    expect(pickAuthoritativePayment(payments)?.status).toBe('succeeded');
  });
});
