import { describe, expect, it } from 'vitest';

import {
  allowedNextBookingStatuses,
  BOOKING_STATUSES,
  canTransitionBookingStatus,
} from '@/lib/booking/status';

describe('canTransitionBookingStatus', () => {
  it('allows the happy path: pending -> confirmed -> completed', () => {
    expect(canTransitionBookingStatus('pending', 'confirmed')).toBe(true);
    expect(canTransitionBookingStatus('confirmed', 'completed')).toBe(true);
  });

  it('allows cancellation from pending or confirmed', () => {
    expect(canTransitionBookingStatus('pending', 'cancelled')).toBe(true);
    expect(canTransitionBookingStatus('confirmed', 'cancelled')).toBe(true);
  });

  it('never allows a transition out of cancelled or completed (both terminal)', () => {
    for (const to of BOOKING_STATUSES) {
      expect(canTransitionBookingStatus('cancelled', to)).toBe(false);
      expect(canTransitionBookingStatus('completed', to)).toBe(false);
    }
  });

  it('never allows skipping a stage (pending straight to completed)', () => {
    expect(canTransitionBookingStatus('pending', 'completed')).toBe(false);
  });

  it('never allows a no-op "transition" to the same status', () => {
    for (const status of BOOKING_STATUSES) {
      expect(canTransitionBookingStatus(status, status)).toBe(false);
    }
  });
});

describe('allowedNextBookingStatuses', () => {
  it('lists exactly the valid next statuses from each status', () => {
    expect([...allowedNextBookingStatuses('pending')].sort()).toEqual(['cancelled', 'confirmed']);
    expect([...allowedNextBookingStatuses('confirmed')].sort()).toEqual(['cancelled', 'completed']);
    expect(allowedNextBookingStatuses('cancelled')).toEqual([]);
    expect(allowedNextBookingStatuses('completed')).toEqual([]);
  });
});
