import { describe, expect, it } from 'vitest';

import { isRecordablePaymentStatus, mapRazorpayPaymentStatus } from '@/lib/payments/status';

describe('mapRazorpayPaymentStatus', () => {
  it('maps captured to succeeded', () => {
    expect(mapRazorpayPaymentStatus('captured')).toBe('succeeded');
  });

  it('maps failed to failed', () => {
    expect(mapRazorpayPaymentStatus('failed')).toBe('failed');
  });

  it('maps refunded to refunded', () => {
    expect(mapRazorpayPaymentStatus('refunded')).toBe('refunded');
  });

  it('maps created and authorized to pending — not yet resolved', () => {
    expect(mapRazorpayPaymentStatus('created')).toBe('pending');
    expect(mapRazorpayPaymentStatus('authorized')).toBe('pending');
  });

  it('returns null for an unrecognized status, never guesses', () => {
    expect(mapRazorpayPaymentStatus('some-future-razorpay-status')).toBeNull();
  });
});

describe('isRecordablePaymentStatus', () => {
  it('accepts succeeded and failed', () => {
    expect(isRecordablePaymentStatus('succeeded')).toBe(true);
    expect(isRecordablePaymentStatus('failed')).toBe(true);
  });

  it('rejects pending and refunded — record_payment_result only accepts succeeded/failed', () => {
    expect(isRecordablePaymentStatus('pending')).toBe(false);
    expect(isRecordablePaymentStatus('refunded')).toBe(false);
  });
});
