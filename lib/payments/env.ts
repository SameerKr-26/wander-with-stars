import 'server-only';

import { z } from 'zod';

/**
 * Razorpay server-only credentials — Phase 4.7.
 *
 * Deliberately NOT added to `lib/env/server.ts`'s eager, module-load-time
 * validation: that file's schema is read by every server render, admin
 * page and content query in this project, so a missing Razorpay key would
 * otherwise break the entire app for anyone working on unrelated code
 * without sandbox credentials configured. Validated lazily instead — only
 * `lib/payments/razorpay.ts` and the webhook route ever call
 * `getPaymentEnv()`, so only an actual payment operation requires these to
 * be present.
 *
 * `RAZORPAY_KEY_ID` is technically not secret (it is also sent to the
 * browser, separately, as `NEXT_PUBLIC_RAZORPAY_KEY_ID` — see
 * `app/booking/[departureId]/payment-actions.ts`) but is read here too,
 * server-side, because the server also needs it to authenticate its own
 * Orders/Payments API calls (Basic Auth: `key_id:key_secret`).
 */
const paymentEnvSchema = z.object({
  RAZORPAY_KEY_ID: z.string().min(1, 'RAZORPAY_KEY_ID is required for payment operations'),
  RAZORPAY_KEY_SECRET: z.string().min(1, 'RAZORPAY_KEY_SECRET is required for payment operations'),
  RAZORPAY_WEBHOOK_SECRET: z
    .string()
    .min(1, 'RAZORPAY_WEBHOOK_SECRET is required to verify webhook signatures'),
});

export type PaymentEnv = z.infer<typeof paymentEnvSchema>;

let cached: PaymentEnv | null = null;

export function getPaymentEnv(): PaymentEnv {
  if (cached) return cached;

  const parsed = paymentEnvSchema.safeParse({
    RAZORPAY_KEY_ID: process.env.RAZORPAY_KEY_ID,
    RAZORPAY_KEY_SECRET: process.env.RAZORPAY_KEY_SECRET,
    RAZORPAY_WEBHOOK_SECRET: process.env.RAZORPAY_WEBHOOK_SECRET,
  });

  if (!parsed.success) {
    const issues = parsed.error.issues
      .map((i) => `  - ${i.path.join('.')}: ${i.message}`)
      .join('\n');
    throw new Error(
      `Invalid Razorpay environment variables:\n${issues}\n\n` +
        'Copy .env.example to .env.local and fill in your Razorpay TEST/sandbox keys. See README.md.',
    );
  }

  cached = parsed.data;
  return cached;
}
