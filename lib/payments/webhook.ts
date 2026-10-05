import { createHmac, timingSafeEqual } from 'node:crypto';

/**
 * Razorpay webhook signature verification — Phase 4.7.
 *
 * Razorpay signs each webhook delivery with `HMAC-SHA256(rawBody,
 * webhookSecret)`, hex-encoded, in the `X-Razorpay-Signature` header —
 * exactly Razorpay's documented mechanism, not a bespoke scheme. Verifying
 * against the RAW request body (not a re-serialized `JSON.stringify` of
 * the parsed object) matters: any difference in key order or whitespace
 * changes the HMAC, so the webhook route reads the body as text first and
 * only parses it as JSON after this check passes.
 *
 * `timingSafeEqual` (not `===`) so signature comparison cannot leak timing
 * information about how much of the expected signature a forged one
 * happened to match — the standard defence against a byte-by-byte
 * signature-guessing attack.
 *
 * Pure and dependency-free beyond Node's built-in `crypto` — no import of
 * `lib/payments/env.ts` here, so this stays trivially unit-testable with
 * a plain string secret rather than needing the full server-only
 * environment loaded.
 */
export function verifyRazorpayWebhookSignature(
  rawBody: string,
  signatureHeader: string | null,
  webhookSecret: string,
): boolean {
  if (!signatureHeader) return false;

  const expected = createHmac('sha256', webhookSecret).update(rawBody, 'utf8').digest('hex');

  const expectedBuffer = Buffer.from(expected, 'hex');
  const receivedBuffer = Buffer.from(signatureHeader, 'hex');

  // Different lengths would make timingSafeEqual throw rather than return
  // false — an invalid/malformed header (wrong length, not hex) is exactly
  // as unverified as a wrong-but-well-formed one.
  if (expectedBuffer.length !== receivedBuffer.length) return false;

  return timingSafeEqual(expectedBuffer, receivedBuffer);
}
