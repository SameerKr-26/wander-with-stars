import { NextResponse, type NextRequest } from 'next/server';

import { fromProviderSubunits } from '@/lib/payments/amount';
import { getPaymentEnv } from '@/lib/payments/env';
import { recordPaymentResult } from '@/lib/payments/repository';
import { isRecordablePaymentStatus, mapRazorpayPaymentStatus } from '@/lib/payments/status';
import { razorpayWebhookPayloadSchema } from '@/lib/payments/validation';
import { verifyRazorpayWebhookSignature } from '@/lib/payments/webhook';

/**
 * POST /api/webhooks/razorpay — Phase 4.7.
 *
 * The authoritative confirmation path this phase's whole architecture is
 * built around: Razorpay's servers call this directly, independent of
 * whether the traveller's browser is even still open (Cases E/F in this
 * phase's own brief). `verifyAndRecordPayment`
 * (`lib/payments/repository.ts`, the checkout-return fast path) converges
 * on the exact same `record_payment_result()` database call this route
 * makes, so whichever one reaches a genuine success first performs the
 * confirmation and the other becomes a safe no-op.
 *
 * Never cached, never statically optimized — a webhook is a one-time
 * event delivery, not a page.
 */
export const dynamic = 'force-dynamic';

/** Always 200 for anything this handler itself understood and processed correctly (including "duplicate, already handled") — Razorpay retries on any non-2xx, and retrying a webhook we've already correctly rejected (bad signature, malformed payload) would never succeed differently. Reserved for genuinely unexpected failures (e.g. the database is unreachable) where a retry might actually help. */
function ok(): NextResponse {
  return NextResponse.json({ received: true }, { status: 200 });
}

export async function POST(request: NextRequest): Promise<NextResponse> {
  const rawBody = await request.text();
  const signatureHeader = request.headers.get('x-razorpay-signature');

  let webhookSecret: string;
  try {
    webhookSecret = getPaymentEnv().RAZORPAY_WEBHOOK_SECRET;
  } catch {
    // Misconfigured deployment — not the sender's fault, but also nothing
    // a retry fixes. Logged server-side only; the response body never
    // reveals why.
    console.error('razorpay webhook: payment environment not configured');
    return NextResponse.json({ error: 'unavailable' }, { status: 503 });
  }

  if (!verifyRazorpayWebhookSignature(rawBody, signatureHeader, webhookSecret)) {
    // Deliberately 400, not 200: an invalid signature must never be
    // silently accepted, and returning 400 (not 401/403) avoids
    // confirming to an attacker which specific check failed.
    return NextResponse.json({ error: 'invalid signature' }, { status: 400 });
  }

  let parsedBody: unknown;
  try {
    parsedBody = JSON.parse(rawBody);
  } catch {
    return NextResponse.json({ error: 'malformed payload' }, { status: 400 });
  }

  const parsed = razorpayWebhookPayloadSchema.safeParse(parsedBody);
  if (!parsed.success) {
    // A signature-valid but unrecognized/malformed event shape — accept
    // it (200) rather than have Razorpay retry a payload this handler
    // will never be able to parse any differently. Only events this
    // project actually models (`payment.*`) are expected to match; any
    // other subscribed event type is intentionally ignored here.
    return ok();
  }

  const entity = parsed.data.payload.payment.entity;
  const mappedStatus = mapRazorpayPaymentStatus(entity.status);
  if (!mappedStatus || !isRecordablePaymentStatus(mappedStatus)) {
    // e.g. `authorized` — not yet a resolved outcome from this project's
    // point of view; nothing to record yet. A later event (captured/
    // failed) for the same payment will arrive when it resolves.
    return ok();
  }

  const result = await recordPaymentResult({
    provider: 'razorpay',
    providerOrderId: entity.order_id,
    providerPaymentId: entity.id,
    status: mappedStatus,
    reportedAmount: fromProviderSubunits(entity.amount),
    reportedCurrency: entity.currency,
    failureReason: entity.error_description ?? null,
  });

  if (!result.ok) {
    // PAYMENT_NOT_FOUND / VERIFICATION_FAILED (amount mismatch) are both
    // real problems worth an operator seeing in logs, but not something a
    // Razorpay retry of the SAME event will ever resolve differently —
    // acknowledging with 200 stops the retry storm; UNKNOWN (e.g. a
    // transient database error) is the one case a retry might genuinely
    // help, so that alone gets a 500.
    console.error(`razorpay webhook: could not record payment result (${result.errorCode})`);
    if (result.errorCode === 'UNKNOWN') {
      return NextResponse.json({ error: 'processing failed' }, { status: 500 });
    }
    return ok();
  }

  return ok();
}
