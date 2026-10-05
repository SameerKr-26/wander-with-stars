import 'server-only';

import { getPaymentEnv } from './env';

/**
 * Thin Razorpay REST client — Phase 4.7.
 *
 * Plain `fetch` against Razorpay's documented REST API, not the `razorpay`
 * npm SDK — CLAUDE.md's own convention ("check package.json before adding
 * a dependency") plus the fact that this project needs exactly two calls
 * (create an order, fetch a payment), both simple enough that a dependency
 * would trade a few lines of code for an opaque third-party HTTP client
 * this project would then have to trust with every request. Authenticates
 * with HTTP Basic Auth (`key_id:key_secret`), exactly as Razorpay's docs
 * specify for server-to-server calls — no client-facing request ever goes
 * through this module.
 */

const RAZORPAY_API_BASE = 'https://api.razorpay.com/v1';

function authHeader(): string {
  const { RAZORPAY_KEY_ID, RAZORPAY_KEY_SECRET } = getPaymentEnv();
  const token = Buffer.from(`${RAZORPAY_KEY_ID}:${RAZORPAY_KEY_SECRET}`).toString('base64');
  return `Basic ${token}`;
}

export interface RazorpayOrder {
  id: string;
  amount: number;
  currency: string;
  status: string;
  receipt: string | null;
}

export interface RazorpayPayment {
  id: string;
  order_id: string | null;
  status: string;
  amount: number;
  currency: string;
  error_description: string | null;
}

class RazorpayApiError extends Error {
  constructor(
    message: string,
    public readonly status: number,
  ) {
    super(message);
    this.name = 'RazorpayApiError';
  }
}

/**
 * Creates a Razorpay order for `amountInSubunits` (paise, an integer — see
 * `lib/payments/amount.ts`) — the caller (`lib/payments/repository.ts`)
 * derives that amount from the booking itself, never from a request
 * parameter this module accepts. `payment_capture: 1` auto-captures a
 * successful authorization immediately, so this project's payments never
 * sit in Razorpay's separate "authorized but not captured" state — a
 * simplification deliberate for this phase's scope (no manual-capture
 * workflow, no partial capture), matching `receipt` to the booking's own
 * customer-facing reference so the two are traceable against each other in
 * the Razorpay dashboard without exposing the booking's UUID to it.
 */
export async function createRazorpayOrder(params: {
  amountInSubunits: number;
  currency: string;
  receipt: string;
}): Promise<RazorpayOrder> {
  const response = await fetch(`${RAZORPAY_API_BASE}/orders`, {
    method: 'POST',
    headers: { Authorization: authHeader(), 'Content-Type': 'application/json' },
    body: JSON.stringify({
      amount: params.amountInSubunits,
      currency: params.currency,
      receipt: params.receipt,
      payment_capture: 1,
    }),
  });

  if (!response.ok) {
    throw new RazorpayApiError(
      `Razorpay order creation failed (${response.status})`,
      response.status,
    );
  }

  return (await response.json()) as RazorpayOrder;
}

/** Fetches a payment by id — the independent, server-side verification `verifyPaymentAction` performs before ever trusting the client's own success callback. */
export async function fetchRazorpayPayment(paymentId: string): Promise<RazorpayPayment> {
  const response = await fetch(`${RAZORPAY_API_BASE}/payments/${encodeURIComponent(paymentId)}`, {
    headers: { Authorization: authHeader() },
  });

  if (!response.ok) {
    throw new RazorpayApiError(
      `Razorpay payment fetch failed (${response.status})`,
      response.status,
    );
  }

  return (await response.json()) as RazorpayPayment;
}
