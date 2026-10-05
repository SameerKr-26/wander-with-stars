import { beforeEach, describe, expect, it, vi } from 'vitest';

/**
 * `lib/payments/repository.ts`, tested with mocked Supabase/Razorpay
 * clients — mirrors the same approach
 * `tests/unit/booking-repository.test.ts` (Phase 4.6) already established.
 */

vi.mock('server-only', () => ({}));

vi.mock('@/lib/payments/env', () => ({
  getPaymentEnv: () => ({
    RAZORPAY_KEY_ID: 'rzp_test_key',
    RAZORPAY_KEY_SECRET: 'test_secret',
    RAZORPAY_WEBHOOK_SECRET: 'test_webhook_secret',
  }),
}));

const createRazorpayOrder = vi.fn();
const fetchRazorpayPayment = vi.fn();
vi.mock('@/lib/payments/razorpay', () => ({
  createRazorpayOrder: (...args: unknown[]) => createRazorpayOrder(...args),
  fetchRazorpayPayment: (...args: unknown[]) => fetchRazorpayPayment(...args),
}));

// A small chainable fake covering exactly the query shapes
// lib/payments/repository.ts issues.
function makeSupabaseMock() {
  const state: {
    booking: Record<string, unknown> | null;
    existingPayment: Record<string, unknown> | null;
    insertError: { code: string } | null;
    rpcResult: { data: unknown; error: { message: string } | null };
  } = {
    booking: null,
    existingPayment: null,
    insertError: null,
    rpcResult: { data: null, error: null },
  };

  const rpc = vi.fn(async () => state.rpcResult);

  const from = vi.fn((table: string) => {
    if (table === 'bookings') {
      return {
        select: () => ({
          eq: () => ({
            maybeSingle: async () => ({ data: state.booking, error: null }),
          }),
        }),
      };
    }
    if (table === 'payments') {
      return {
        select: () => ({
          eq: () => ({
            eq: () => ({
              eq: () => ({
                order: () => ({
                  limit: () => ({
                    maybeSingle: async () => ({ data: state.existingPayment, error: null }),
                  }),
                }),
              }),
            }),
          }),
        }),
        insert: async () => ({ error: state.insertError }),
      };
    }
    throw new Error(`unexpected table: ${table}`);
  });

  return { supabase: { from, rpc }, state };
}

vi.mock('@/lib/supabase/admin', () => ({
  createAdminClient: () => makeSupabaseMock().supabase,
}));

beforeEach(() => {
  createRazorpayOrder.mockReset();
  fetchRazorpayPayment.mockReset();
});

describe('createPaymentOrder', () => {
  it('rejects a booking that does not exist', async () => {
    const { createPaymentOrder } = await import('@/lib/payments/repository');
    // booking stays null by default in mockState after createAdminClient() runs
    const result = await createPaymentOrder('missing-booking');
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.errorCode).toBe('BOOKING_NOT_FOUND');
  });

  it('creates a new Razorpay order derived from the booking snapshot, never a client-supplied amount', async () => {
    vi.resetModules();
    vi.doMock('@/lib/supabase/admin', () => ({
      createAdminClient: () => {
        const mock = makeSupabaseMock();
        mock.state.booking = {
          id: 'booking-1',
          reference: 'WWS-ABCDEFGH',
          status: 'pending',
          participant_count: 2,
          snapshot_price_amount: 49999,
          snapshot_price_currency: 'INR',
          expires_at: new Date(Date.now() + 60_000).toISOString(),
        };
        mock.state.existingPayment = null;
        return mock.supabase;
      },
    }));
    vi.doMock('@/lib/payments/env', () => ({
      getPaymentEnv: () => ({
        RAZORPAY_KEY_ID: 'rzp_test_key',
        RAZORPAY_KEY_SECRET: 'secret',
        RAZORPAY_WEBHOOK_SECRET: 'whsecret',
      }),
    }));
    vi.doMock('@/lib/payments/razorpay', () => ({
      createRazorpayOrder: vi.fn(async (args: { amountInSubunits: number }) => {
        // Proves the amount passed to Razorpay is 2 * 49999 = 99998 rupees
        // = 9999800 paise, derived server-side — never a client value.
        expect(args.amountInSubunits).toBe(9999800);
        return {
          id: 'order_NEW123',
          amount: args.amountInSubunits,
          currency: 'INR',
          status: 'created',
          receipt: 'WWS-ABCDEFGH',
        };
      }),
      fetchRazorpayPayment: vi.fn(),
    }));

    const { createPaymentOrder } = await import('@/lib/payments/repository');
    const result = await createPaymentOrder('booking-1');

    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.order.orderId).toBe('order_NEW123');
      expect(result.order.amount).toBe(99998);
      expect(result.order.amountInSubunits).toBe(9999800);
      expect(result.order.currency).toBe('INR');
      expect(result.order.keyId).toBe('rzp_test_key');
    }
    vi.doUnmock('@/lib/supabase/admin');
    vi.doUnmock('@/lib/payments/razorpay');
    // Deliberately NOT unmocking '@/lib/payments/env' — that mock is the
    // static, file-level `vi.mock` at the top of this file, which every
    // other test in this file also relies on; doUnmock would remove it
    // for good, not just restore this test's own override.
  });

  it('rejects a booking that is not pending (already confirmed/cancelled)', async () => {
    vi.resetModules();
    vi.doMock('@/lib/supabase/admin', () => ({
      createAdminClient: () => {
        const mock = makeSupabaseMock();
        mock.state.booking = {
          id: 'booking-2',
          reference: 'WWS-XXXXXXXX',
          status: 'confirmed',
          participant_count: 1,
          snapshot_price_amount: 49999,
          snapshot_price_currency: 'INR',
          expires_at: null,
        };
        return mock.supabase;
      },
    }));

    const { createPaymentOrder } = await import('@/lib/payments/repository');
    const result = await createPaymentOrder('booking-2');
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.errorCode).toBe('BOOKING_NOT_PAYABLE');
    vi.doUnmock('@/lib/supabase/admin');
  });

  it('rejects an expired booking', async () => {
    vi.resetModules();
    vi.doMock('@/lib/supabase/admin', () => ({
      createAdminClient: () => {
        const mock = makeSupabaseMock();
        mock.state.booking = {
          id: 'booking-3',
          reference: 'WWS-EXPIRED1',
          status: 'pending',
          participant_count: 1,
          snapshot_price_amount: 49999,
          snapshot_price_currency: 'INR',
          expires_at: new Date(Date.now() - 60_000).toISOString(),
        };
        return mock.supabase;
      },
    }));

    const { createPaymentOrder } = await import('@/lib/payments/repository');
    const result = await createPaymentOrder('booking-3');
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.errorCode).toBe('BOOKING_NOT_PAYABLE');
    vi.doUnmock('@/lib/supabase/admin');
  });

  it('reuses an existing pending payment instead of creating a second Razorpay order (retry/double-click safety)', async () => {
    vi.resetModules();
    const createOrderSpy = vi.fn();
    vi.doMock('@/lib/supabase/admin', () => ({
      createAdminClient: () => {
        const mock = makeSupabaseMock();
        mock.state.booking = {
          id: 'booking-4',
          reference: 'WWS-RETRY0001',
          status: 'pending',
          participant_count: 1,
          snapshot_price_amount: 49999,
          snapshot_price_currency: 'INR',
          expires_at: new Date(Date.now() + 60_000).toISOString(),
        };
        mock.state.existingPayment = {
          provider_reference: 'order_EXISTING',
          amount: 49999,
          currency: 'INR',
        };
        return mock.supabase;
      },
    }));
    vi.doMock('@/lib/payments/razorpay', () => ({
      createRazorpayOrder: createOrderSpy,
      fetchRazorpayPayment: vi.fn(),
    }));

    const { createPaymentOrder } = await import('@/lib/payments/repository');
    const result = await createPaymentOrder('booking-4');

    expect(result.ok).toBe(true);
    if (result.ok) expect(result.order.orderId).toBe('order_EXISTING');
    expect(createOrderSpy).not.toHaveBeenCalled();
    vi.doUnmock('@/lib/supabase/admin');
    vi.doUnmock('@/lib/payments/razorpay');
  });
});

describe('recordPaymentResult', () => {
  it('maps a successful RPC call to a safe result', async () => {
    vi.resetModules();
    vi.doMock('@/lib/supabase/admin', () => ({
      createAdminClient: () => {
        const mock = makeSupabaseMock();
        mock.state.rpcResult = {
          data: { booking_id: 'booking-9', status: 'succeeded' },
          error: null,
        };
        // The follow-up read of the booking's own current status.
        mock.supabase.from = vi.fn((table: string) => {
          if (table === 'bookings') {
            return {
              select: () => ({
                eq: () => ({ maybeSingle: async () => ({ data: { status: 'confirmed' } }) }),
              }),
            };
          }
          throw new Error(`unexpected table: ${table}`);
        }) as unknown as typeof mock.supabase.from;
        return mock.supabase;
      },
    }));

    const { recordPaymentResult } = await import('@/lib/payments/repository');
    const result = await recordPaymentResult({
      provider: 'razorpay',
      providerOrderId: 'order_1',
      providerPaymentId: 'pay_1',
      status: 'succeeded',
      reportedAmount: 49999,
      reportedCurrency: 'INR',
      failureReason: null,
    });

    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.result.bookingId).toBe('booking-9');
      expect(result.result.bookingStatus).toBe('confirmed');
      expect(result.result.paymentStatus).toBe('succeeded');
    }
    vi.doUnmock('@/lib/supabase/admin');
  });

  it('maps ORDER_NOT_FOUND to PAYMENT_NOT_FOUND, never leaking the raw SQL error', async () => {
    vi.resetModules();
    vi.doMock('@/lib/supabase/admin', () => ({
      createAdminClient: () => {
        const mock = makeSupabaseMock();
        mock.state.rpcResult = { data: null, error: { message: 'PAYMENT_ERROR: ORDER_NOT_FOUND' } };
        return mock.supabase;
      },
    }));

    const { recordPaymentResult } = await import('@/lib/payments/repository');
    const result = await recordPaymentResult({
      provider: 'razorpay',
      providerOrderId: 'order_missing',
      providerPaymentId: 'pay_1',
      status: 'succeeded',
      reportedAmount: 49999,
      reportedCurrency: 'INR',
      failureReason: null,
    });

    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.errorCode).toBe('PAYMENT_NOT_FOUND');
    vi.doUnmock('@/lib/supabase/admin');
  });

  it('maps AMOUNT_MISMATCH to VERIFICATION_FAILED', async () => {
    vi.resetModules();
    vi.doMock('@/lib/supabase/admin', () => ({
      createAdminClient: () => {
        const mock = makeSupabaseMock();
        mock.state.rpcResult = { data: null, error: { message: 'PAYMENT_ERROR: AMOUNT_MISMATCH' } };
        return mock.supabase;
      },
    }));

    const { recordPaymentResult } = await import('@/lib/payments/repository');
    const result = await recordPaymentResult({
      provider: 'razorpay',
      providerOrderId: 'order_1',
      providerPaymentId: 'pay_1',
      status: 'succeeded',
      reportedAmount: 1,
      reportedCurrency: 'INR',
      failureReason: null,
    });

    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.errorCode).toBe('VERIFICATION_FAILED');
    vi.doUnmock('@/lib/supabase/admin');
  });
});

describe('verifyAndRecordPayment', () => {
  it('rejects an invalid checkout signature before ever calling Razorpay', async () => {
    vi.resetModules();
    // Explicit, self-contained mock rather than relying on the file-level
    // static `vi.mock` surviving whatever a previous test's `doUnmock`
    // calls did to it.
    vi.doMock('@/lib/supabase/admin', () => ({
      createAdminClient: () => makeSupabaseMock().supabase,
    }));
    const fetchPaymentSpy = vi.fn();
    vi.doMock('@/lib/payments/razorpay', () => ({
      createRazorpayOrder: vi.fn(),
      fetchRazorpayPayment: fetchPaymentSpy,
    }));

    const { verifyAndRecordPayment } = await import('@/lib/payments/repository');
    const result = await verifyAndRecordPayment({
      razorpayOrderId: 'order_1',
      razorpayPaymentId: 'pay_1',
      razorpaySignature: 'not-a-real-signature',
    });

    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.errorCode).toBe('INVALID_SIGNATURE');
    expect(fetchPaymentSpy).not.toHaveBeenCalled();
    vi.doUnmock('@/lib/supabase/admin');
    vi.doUnmock('@/lib/payments/razorpay');
  });
});
