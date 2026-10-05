import { describe, expect, it, vi } from 'vitest';

vi.mock('server-only', () => ({}));

const createPaymentOrder = vi.fn();
const verifyAndRecordPayment = vi.fn();
vi.mock('@/lib/payments/repository', () => ({
  createPaymentOrder: (...args: unknown[]) => createPaymentOrder(...args),
  verifyAndRecordPayment: (...args: unknown[]) => verifyAndRecordPayment(...args),
}));

describe('createPaymentOrderAction', () => {
  it('rejects malformed input before calling the repository', async () => {
    const { createPaymentOrderAction } =
      await import('@/app/booking/[departureId]/payment-actions');
    const result = await createPaymentOrderAction({ bookingId: 'not-a-uuid' });
    expect(result.ok).toBe(false);
    expect(createPaymentOrder).not.toHaveBeenCalled();
  });

  it('returns a friendly message, never a raw error code, for a known failure', async () => {
    createPaymentOrder.mockResolvedValue({ ok: false, errorCode: 'BOOKING_NOT_PAYABLE' });
    const { createPaymentOrderAction } =
      await import('@/app/booking/[departureId]/payment-actions');
    const result = await createPaymentOrderAction({
      bookingId: '11111111-1111-4111-8111-111111111111',
    });
    expect(result.ok).toBe(false);
    expect(result.errorMessage).not.toContain('BOOKING_NOT_PAYABLE');
    expect(result.errorMessage).toMatch(/expired|no longer/i);
  });

  it('passes through a successful order unchanged', async () => {
    const order = {
      orderId: 'order_1',
      amount: 49999,
      amountInSubunits: 4999900,
      currency: 'INR',
      keyId: 'rzp_test_key',
      bookingReference: 'WWS-ABCDEFGH',
    };
    createPaymentOrder.mockResolvedValue({ ok: true, order });
    const { createPaymentOrderAction } =
      await import('@/app/booking/[departureId]/payment-actions');
    const result = await createPaymentOrderAction({
      bookingId: '11111111-1111-4111-8111-111111111111',
    });
    expect(result.ok).toBe(true);
    expect(result.order).toEqual(order);
  });
});

describe('verifyPaymentAction', () => {
  const validInput = {
    razorpayOrderId: 'order_1',
    razorpayPaymentId: 'pay_1',
    razorpaySignature: 'abc123',
  };

  it('rejects malformed input before calling the repository', async () => {
    const { verifyPaymentAction } = await import('@/app/booking/[departureId]/payment-actions');
    const result = await verifyPaymentAction({ razorpayOrderId: '' });
    expect(result.ok).toBe(false);
    expect(result.definitive).toBe(true);
    expect(verifyAndRecordPayment).not.toHaveBeenCalled();
  });

  it('marks an invalid signature as a definitive failure', async () => {
    verifyAndRecordPayment.mockResolvedValue({ ok: false, errorCode: 'INVALID_SIGNATURE' });
    const { verifyPaymentAction } = await import('@/app/booking/[departureId]/payment-actions');
    const result = await verifyPaymentAction(validInput);
    expect(result.ok).toBe(false);
    expect(result.definitive).toBe(true);
  });

  it('marks a not-yet-resolved verification as non-definitive — never a false failure', async () => {
    verifyAndRecordPayment.mockResolvedValue({ ok: false, errorCode: 'VERIFICATION_FAILED' });
    const { verifyPaymentAction } = await import('@/app/booking/[departureId]/payment-actions');
    const result = await verifyPaymentAction(validInput);
    expect(result.ok).toBe(false);
    expect(result.definitive).toBe(false);
    expect(result.errorMessage).toMatch(/progress/i);
  });

  it('passes through a confirmed result', async () => {
    verifyAndRecordPayment.mockResolvedValue({
      ok: true,
      result: { bookingId: 'booking-1', bookingStatus: 'confirmed', paymentStatus: 'succeeded' },
    });
    const { verifyPaymentAction } = await import('@/app/booking/[departureId]/payment-actions');
    const result = await verifyPaymentAction(validInput);
    expect(result.ok).toBe(true);
    expect(result.bookingStatus).toBe('confirmed');
    expect(result.paymentStatus).toBe('succeeded');
  });
});
