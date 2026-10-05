import { createHmac } from 'node:crypto';

import { describe, expect, it } from 'vitest';

import { verifyRazorpayWebhookSignature } from '@/lib/payments/webhook';
import { razorpayWebhookPayloadSchema } from '@/lib/payments/validation';

const SECRET = 'test-webhook-secret';

function sign(body: string, secret = SECRET): string {
  return createHmac('sha256', secret).update(body, 'utf8').digest('hex');
}

describe('verifyRazorpayWebhookSignature', () => {
  it('accepts a correctly-signed body', () => {
    const body = JSON.stringify({ event: 'payment.captured' });
    expect(verifyRazorpayWebhookSignature(body, sign(body), SECRET)).toBe(true);
  });

  it('rejects a body signed with the wrong secret', () => {
    const body = JSON.stringify({ event: 'payment.captured' });
    expect(verifyRazorpayWebhookSignature(body, sign(body, 'wrong-secret'), SECRET)).toBe(false);
  });

  it('rejects a tampered body — signature no longer matches', () => {
    const originalBody = JSON.stringify({ event: 'payment.captured', amount: 100 });
    const signature = sign(originalBody);
    const tamperedBody = JSON.stringify({ event: 'payment.captured', amount: 999999 });
    expect(verifyRazorpayWebhookSignature(tamperedBody, signature, SECRET)).toBe(false);
  });

  it('rejects a missing signature header', () => {
    const body = JSON.stringify({ event: 'payment.captured' });
    expect(verifyRazorpayWebhookSignature(body, null, SECRET)).toBe(false);
  });

  it('rejects a malformed (non-hex, wrong-length) signature without throwing', () => {
    const body = JSON.stringify({ event: 'payment.captured' });
    expect(() =>
      verifyRazorpayWebhookSignature(body, 'not-a-valid-signature', SECRET),
    ).not.toThrow();
    expect(verifyRazorpayWebhookSignature(body, 'not-a-valid-signature', SECRET)).toBe(false);
  });

  it('rejects an empty signature', () => {
    const body = JSON.stringify({ event: 'payment.captured' });
    expect(verifyRazorpayWebhookSignature(body, '', SECRET)).toBe(false);
  });
});

describe('razorpayWebhookPayloadSchema', () => {
  const validPayload = {
    event: 'payment.captured',
    payload: {
      payment: {
        entity: {
          id: 'pay_ABC123',
          order_id: 'order_XYZ789',
          status: 'captured',
          amount: 4999900,
          currency: 'INR',
        },
      },
    },
  };

  it('accepts a well-formed payment.captured payload', () => {
    expect(razorpayWebhookPayloadSchema.safeParse(validPayload).success).toBe(true);
  });

  it('accepts an optional error_description for a failed payment', () => {
    const failed = {
      ...validPayload,
      event: 'payment.failed',
      payload: {
        payment: {
          entity: {
            ...validPayload.payload.payment.entity,
            status: 'failed',
            error_description: 'Card declined',
          },
        },
      },
    };
    expect(razorpayWebhookPayloadSchema.safeParse(failed).success).toBe(true);
  });

  it('rejects a malformed payload missing required fields', () => {
    expect(razorpayWebhookPayloadSchema.safeParse({ event: 'payment.captured' }).success).toBe(
      false,
    );
    expect(
      razorpayWebhookPayloadSchema.safeParse({
        event: 'payment.captured',
        payload: { payment: { entity: { id: 'pay_1' } } },
      }).success,
    ).toBe(false);
  });

  it('rejects a completely unrelated JSON shape', () => {
    expect(razorpayWebhookPayloadSchema.safeParse({ foo: 'bar' }).success).toBe(false);
    expect(razorpayWebhookPayloadSchema.safeParse(null).success).toBe(false);
    expect(razorpayWebhookPayloadSchema.safeParse('not json').success).toBe(false);
  });
});
