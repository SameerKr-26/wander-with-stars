import { createHmac } from 'node:crypto';

import { expect, test } from '@playwright/test';

/**
 * Razorpay webhook route — Phase 4.7.
 *
 * Pure HTTP tests (Playwright's `request` fixture — no browser needed)
 * against the real running dev server's `/api/webhooks/razorpay` route.
 * The signing secret here (`TEST_WEBHOOK_SECRET`) must match whatever
 * `RAZORPAY_WEBHOOK_SECRET` the dev server was started with — see
 * `playwright.db.config.ts`'s `webServer.env`. This is the same technique
 * `lib/payments/webhook.ts`'s own header describes as the standard way to
 * test a Razorpay webhook handler offline: compute the exact signature
 * Razorpay itself would compute, and POST it directly — no real Razorpay
 * account, tunnel, or network access to Razorpay's servers required.
 */

const TEST_WEBHOOK_SECRET = 'test-webhook-secret-for-e2e';

function sign(body: string): string {
  return createHmac('sha256', TEST_WEBHOOK_SECRET).update(body, 'utf8').digest('hex');
}

function capturedPayload(
  overrides: Partial<{
    orderId: string;
    paymentId: string;
    amount: number;
    currency: string;
    status: string;
  }> = {},
) {
  return JSON.stringify({
    event: `payment.${overrides.status === 'failed' ? 'failed' : 'captured'}`,
    payload: {
      payment: {
        entity: {
          id: overrides.paymentId ?? 'pay_test123',
          order_id: overrides.orderId ?? 'order_test123',
          status: overrides.status ?? 'captured',
          amount: overrides.amount ?? 4999900,
          currency: overrides.currency ?? 'INR',
          error_description: overrides.status === 'failed' ? 'Card declined' : null,
        },
      },
    },
  });
}

test.describe('POST /api/webhooks/razorpay', () => {
  test('rejects a request with an invalid signature', async ({ request }) => {
    const body = capturedPayload();
    const response = await request.post('/api/webhooks/razorpay', {
      data: body,
      headers: {
        'x-razorpay-signature': 'not-a-real-signature',
        'content-type': 'application/json',
      },
    });
    expect(response.status()).toBe(400);
  });

  test('rejects a request with no signature header at all', async ({ request }) => {
    const body = capturedPayload();
    const response = await request.post('/api/webhooks/razorpay', {
      data: body,
      headers: { 'content-type': 'application/json' },
    });
    expect(response.status()).toBe(400);
  });

  test('accepts a malformed-but-validly-signed payload with 200 (never retried forever)', async ({
    request,
  }) => {
    const body = JSON.stringify({ not: 'a real razorpay payload' });
    const response = await request.post('/api/webhooks/razorpay', {
      data: body,
      headers: { 'x-razorpay-signature': sign(body), 'content-type': 'application/json' },
    });
    expect(response.status()).toBe(200);
  });

  test('a genuinely unknown order id is acknowledged (200), not a 500 that triggers endless retries', async ({
    request,
  }) => {
    const body = capturedPayload({ orderId: `order_never_created_${Date.now()}` });
    const response = await request.post('/api/webhooks/razorpay', {
      data: body,
      headers: { 'x-razorpay-signature': sign(body), 'content-type': 'application/json' },
    });
    expect(response.status()).toBe(200);
  });

  test('a tampered body (valid-looking but wrong signature for THIS body) is rejected', async ({
    request,
  }) => {
    const originalBody = capturedPayload({ amount: 100 });
    const signature = sign(originalBody);
    const tamperedBody = capturedPayload({ amount: 999999999 });
    const response = await request.post('/api/webhooks/razorpay', {
      data: tamperedBody,
      headers: { 'x-razorpay-signature': signature, 'content-type': 'application/json' },
    });
    expect(response.status()).toBe(400);
  });
});
