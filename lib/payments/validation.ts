import { z } from 'zod';

/**
 * Payment-flow input validation — Phase 4.7.
 *
 * Mirrors `lib/booking/validation.ts`'s own boundary-validation convention.
 * None of these accept a price, amount or currency from the client — see
 * each schema's own comment for why.
 */

/** `createPaymentOrderAction`'s only input: which booking to pay for. The amount is derived server-side from that booking, never accepted here. */
export const createPaymentOrderInputSchema = z.object({
  bookingId: z.uuid('A valid booking is required'),
});
export type CreatePaymentOrderInput = z.infer<typeof createPaymentOrderInputSchema>;

/**
 * `verifyPaymentAction`'s input — exactly the three fields Razorpay
 * Checkout's success handler callback provides. This is a fast,
 * client-triggered convenience path (see lib/payments/repository.ts's own
 * header for why it is not the sole source of truth) — the signature is
 * verified server-side before any of these values are trusted for
 * anything.
 */
export const verifyPaymentInputSchema = z.object({
  razorpayOrderId: z.string().min(1, 'A valid order id is required'),
  razorpayPaymentId: z.string().min(1, 'A valid payment id is required'),
  razorpaySignature: z.string().min(1, 'A valid signature is required'),
});
export type VerifyPaymentInput = z.infer<typeof verifyPaymentInputSchema>;

/**
 * A Razorpay webhook payload, narrowed to exactly the fields this project
 * reads. Razorpay's real payload carries much more (entity metadata,
 * card/bank details for the payment method used, ...) — none of it is
 * validated or stored here; `.passthrough()`-free and deliberately narrow
 * so an unexpected/malformed payload fails validation rather than being
 * silently accepted with missing fields.
 */
export const razorpayWebhookPayloadSchema = z.object({
  event: z.string().min(1),
  payload: z.object({
    payment: z.object({
      entity: z.object({
        id: z.string().min(1),
        order_id: z.string().min(1),
        status: z.string().min(1),
        amount: z.number().int().nonnegative(),
        currency: z.string().length(3),
        error_description: z.string().nullable().optional(),
      }),
    }),
  }),
});
export type RazorpayWebhookPayload = z.infer<typeof razorpayWebhookPayloadSchema>;
