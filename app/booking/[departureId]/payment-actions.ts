'use server';

import { createPaymentOrder, verifyAndRecordPayment } from '@/lib/payments/repository';
import { createPaymentOrderInputSchema, verifyPaymentInputSchema } from '@/lib/payments/validation';

/**
 * Server Actions the payment step (`components/booking/payment-step.tsx`)
 * calls — the same "plain async function the client calls directly"
 * pattern `app/booking/[departureId]/actions.ts`'s `submitBookingAction`
 * already established (Phase 4.6), for the same reason: the wizard is a
 * multi-step client component that needs a result value to react to, not
 * a page navigation.
 */

export interface CreatePaymentOrderResult {
  ok: boolean;
  order?: {
    orderId: string;
    amount: number;
    amountInSubunits: number;
    currency: string;
    keyId: string;
    bookingReference: string;
  };
  errorMessage?: string;
}

const ORDER_ERROR_MESSAGES: Record<string, string> = {
  BOOKING_NOT_FOUND: "We couldn't find that booking.",
  BOOKING_NOT_PAYABLE: 'This booking is no longer available for payment — it may have expired.',
  UNKNOWN: 'Something went wrong starting your payment. Please try again.',
};

export async function createPaymentOrderAction(
  rawInput: unknown,
): Promise<CreatePaymentOrderResult> {
  const parsed = createPaymentOrderInputSchema.safeParse(rawInput);
  if (!parsed.success) {
    return { ok: false, errorMessage: 'Invalid request.' };
  }

  const result = await createPaymentOrder(parsed.data.bookingId);
  if (!result.ok) {
    return {
      ok: false,
      errorMessage: ORDER_ERROR_MESSAGES[result.errorCode] ?? ORDER_ERROR_MESSAGES.UNKNOWN!,
    };
  }

  return { ok: true, order: result.order };
}

export interface VerifyPaymentResult {
  ok: boolean;
  bookingStatus?: string;
  paymentStatus?: string;
  /** True only for a definitive rejection (bad signature, amount mismatch) — false means "not resolved yet," not "failed." */
  definitive?: boolean;
  errorMessage?: string;
}

const VERIFY_ERROR_MESSAGES: Record<string, { message: string; definitive: boolean }> = {
  INVALID_SIGNATURE: { message: 'We could not verify this payment.', definitive: true },
  PAYMENT_NOT_FOUND: {
    message: 'Payment verification in progress — please wait a moment.',
    definitive: false,
  },
  VERIFICATION_FAILED: {
    message: 'Payment verification in progress — please wait a moment.',
    definitive: false,
  },
  UNKNOWN: {
    message: 'Payment verification in progress — please wait a moment.',
    definitive: false,
  },
};

export async function verifyPaymentAction(rawInput: unknown): Promise<VerifyPaymentResult> {
  const parsed = verifyPaymentInputSchema.safeParse(rawInput);
  if (!parsed.success) {
    return { ok: false, errorMessage: 'Invalid request.', definitive: true };
  }

  const result = await verifyAndRecordPayment({
    razorpayOrderId: parsed.data.razorpayOrderId,
    razorpayPaymentId: parsed.data.razorpayPaymentId,
    razorpaySignature: parsed.data.razorpaySignature,
  });

  if (!result.ok) {
    const mapped = VERIFY_ERROR_MESSAGES[result.errorCode] ?? VERIFY_ERROR_MESSAGES.UNKNOWN!;
    return { ok: false, errorMessage: mapped.message, definitive: mapped.definitive };
  }

  return {
    ok: true,
    bookingStatus: result.result.bookingStatus,
    paymentStatus: result.result.paymentStatus,
  };
}
