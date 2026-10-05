'use client';

import { useEffect, useRef, useState } from 'react';
import Script from 'next/script';

import {
  createPaymentOrderAction,
  verifyPaymentAction,
  type CreatePaymentOrderResult,
} from '@/app/booking/[departureId]/payment-actions';
import { Button, GlassPanel, Stack, Text } from '@/components/ui';
import type { SafeBookingResult } from '@/lib/booking/repository';
import { formatBookingDate, formatBookingPrice } from '@/lib/booking/format';

import { ReviewRow } from './review-row';

/**
 * PaymentStep — Phase 4.7.
 *
 * Razorpay Checkout (`checkout.razorpay.com/v1/checkout.js`) is a modal
 * overlay, not a page redirect — the traveller never navigates away from
 * `/booking/[departureId]`, so the selected departure/booking context
 * (Phase 4.6's own requirement) is never at risk of being lost here
 * either. This component only ever displays an amount the SERVER returned
 * (`createPaymentOrderAction`'s response) — never one computed in the
 * browser from `summary`/participant count, which is exactly the "do not
 * display an amount calculated purely in the browser" rule this phase
 * states explicitly.
 *
 * On the checkout `handler` callback, this calls `verifyPaymentAction` —
 * a FAST, convenience path, not the authoritative one. The webhook
 * (`app/api/webhooks/razorpay/route.ts`) is what actually confirms a
 * booking if the browser never returns at all (closed tab, crashed,
 * network drop after payment — Cases E/F in this phase's own brief); both
 * converge on the same idempotent database function, so whichever
 * resolves first is authoritative and the other is a safe no-op.
 */

declare global {
  interface Window {
    Razorpay?: new (options: RazorpayCheckoutOptions) => { open: () => void };
  }
}

interface RazorpayCheckoutOptions {
  key: string;
  amount: number;
  currency: string;
  order_id: string;
  name: string;
  description?: string;
  prefill?: { name?: string; email?: string; contact?: string };
  handler: (response: {
    razorpay_order_id: string;
    razorpay_payment_id: string;
    razorpay_signature: string;
  }) => void;
  modal?: { ondismiss?: () => void };
  theme?: { color?: string };
}

type PaymentState =
  | { phase: 'idle' }
  | { phase: 'creating-order' }
  | { phase: 'awaiting-checkout'; order: NonNullable<CreatePaymentOrderResult['order']> }
  | { phase: 'verifying' }
  | { phase: 'confirmed'; paymentStatus: string }
  | { phase: 'pending-verification'; message: string }
  | { phase: 'failed'; message: string }
  | { phase: 'cancelled' };

export function PaymentStep({
  booking,
  contactName,
  contactEmail,
  contactPhone,
  onConfirmed,
  onBack,
}: {
  booking: SafeBookingResult;
  contactName: string;
  contactEmail: string;
  contactPhone: string;
  onConfirmed: (paymentStatus: string) => void;
  onBack: () => void;
}) {
  const [state, setState] = useState<PaymentState>({ phase: 'idle' });
  const [scriptReady, setScriptReady] = useState(false);
  const openedOrderIdRef = useRef<string | null>(null);

  async function startPayment() {
    setState({ phase: 'creating-order' });
    const result = await createPaymentOrderAction({ bookingId: booking.id });
    if (!result.ok || !result.order) {
      setState({ phase: 'failed', message: result.errorMessage ?? 'Could not start payment.' });
      return;
    }
    setState({ phase: 'awaiting-checkout', order: result.order });
  }

  // Opens Razorpay Checkout as soon as both the order exists AND the
  // script has loaded — order creation and script loading race each
  // other, and this effect only fires once both are actually ready.
  // `openedOrderIdRef` guards against opening the SAME order's checkout
  // twice on a re-render (e.g. scriptReady flipping after the order was
  // already set) — a genuinely new order (a "Try again" retry) has its
  // own new `orderId`, so the guard never blocks a real retry.
  useEffect(() => {
    if (state.phase !== 'awaiting-checkout' || !scriptReady || !window.Razorpay) return;
    if (openedOrderIdRef.current === state.order.orderId) return;
    openedOrderIdRef.current = state.order.orderId;

    const razorpay = new window.Razorpay({
      key: state.order.keyId,
      amount: state.order.amountInSubunits,
      currency: state.order.currency,
      order_id: state.order.orderId,
      name: 'Wander With Stars',
      description: `Booking ${booking.reference}`,
      prefill: {
        name: contactName,
        email: contactEmail,
        ...(contactPhone ? { contact: contactPhone } : {}),
      },
      theme: { color: '#0497B2' },
      handler: (response) => {
        setState({ phase: 'verifying' });
        verifyPaymentAction({
          razorpayOrderId: response.razorpay_order_id,
          razorpayPaymentId: response.razorpay_payment_id,
          razorpaySignature: response.razorpay_signature,
        }).then((result) => {
          if (result.ok && result.bookingStatus === 'confirmed') {
            setState({ phase: 'confirmed', paymentStatus: result.paymentStatus ?? 'succeeded' });
            onConfirmed(result.paymentStatus ?? 'succeeded');
            return;
          }
          if (result.definitive) {
            setState({
              phase: 'failed',
              message: result.errorMessage ?? 'Payment could not be verified.',
            });
            return;
          }
          setState({
            phase: 'pending-verification',
            message:
              result.errorMessage ??
              'Payment verification in progress — this can take a moment. Please check back shortly.',
          });
        });
      },
      modal: {
        ondismiss: () => setState({ phase: 'cancelled' }),
      },
    });
    razorpay.open();
    // eslint-disable-next-line react-hooks/exhaustive-deps -- `state` and callback props are intentionally excluded: the ref guard above (not this dependency list) is what prevents re-opening, and including them would re-run this effect on every unrelated parent re-render
  }, [state, scriptReady]);

  const payableAmount = booking.snapshotPriceAmount * booking.participantCount;

  return (
    <Stack gap={5}>
      <Script
        src="https://checkout.razorpay.com/v1/checkout.js"
        onLoad={() => setScriptReady(true)}
      />
      <Text style={{ fontWeight: 'var(--weight-subheading)', fontSize: 'var(--text-lg)' }}>
        Pay to confirm
      </Text>

      {/*
       * Booking review — this phase's own explicit requirement: "Before
       * payment, display authoritative values: trip, selected departure,
       * participant count, booking reference, amount payable, currency."
       * Every value here comes from `booking` (the server-returned
       * SafeBookingResult from create_pending_booking), never recomputed
       * in the browser. Status is hardcoded "Pending" — this step is only
       * ever reached while the booking is pending; PaymentStep never
       * claims anything stronger than that on its own.
       */}
      <GlassPanel variant="tinted" radius="panel" style={{ padding: 'var(--space-6)' }}>
        <Stack gap={4}>
          <Stack gap={1}>
            <Text variant="label" tone="brand" uppercase>
              Booking reference
            </Text>
            <Text style={{ fontSize: 'var(--text-2xl)', fontWeight: 'var(--weight-heading)' }}>
              {booking.reference}
            </Text>
          </Stack>
          <Stack gap={2}>
            <ReviewRow
              label="Trip"
              value={`${booking.snapshotTripTitle} — ${booking.snapshotDestination}`}
            />
            <ReviewRow label="Departs" value={formatBookingDate(booking.snapshotDepartureDate)} />
            <ReviewRow label="Travellers" value={String(booking.participantCount)} />
            <ReviewRow
              label="Amount payable"
              value={formatBookingPrice(payableAmount, booking.snapshotPriceCurrency)}
            />
            <ReviewRow label="Status" value="Pending" />
          </Stack>
        </Stack>
      </GlassPanel>

      {state.phase === 'awaiting-checkout' || state.phase === 'creating-order' ? (
        <GlassPanel variant="tinted" radius="panel" style={{ padding: 'var(--space-5)' }}>
          <Stack gap={2}>
            <Text variant="meta" tone="muted" uppercase>
              Amount payable
            </Text>
            <Text style={{ fontSize: 'var(--text-2xl)', fontWeight: 'var(--weight-heading)' }}>
              {state.phase === 'awaiting-checkout'
                ? formatBookingPrice(state.order.amount, state.order.currency)
                : '—'}
            </Text>
          </Stack>
        </GlassPanel>
      ) : null}

      {state.phase === 'verifying' ? <Text>Verifying your payment…</Text> : null}

      {state.phase === 'confirmed' ? (
        <Text style={{ fontWeight: 600 }}>Payment confirmed.</Text>
      ) : null}

      {state.phase === 'pending-verification' ? (
        <Stack gap={3}>
          <Text role="status">{state.message}</Text>
          <Button type="button" variant="secondary" onClick={() => setState({ phase: 'idle' })}>
            Check status again
          </Button>
        </Stack>
      ) : null}

      {state.phase === 'cancelled' ? (
        <Text role="alert">
          Payment was not completed. Your booking is still pending — you can try again.
        </Text>
      ) : null}

      {state.phase === 'failed' ? <Text role="alert">{state.message}</Text> : null}

      {state.phase === 'idle' ||
      state.phase === 'cancelled' ||
      state.phase === 'failed' ||
      state.phase === 'pending-verification' ? (
        <div className="flex" style={{ gap: 'var(--space-3)' }}>
          <Button type="button" variant="secondary" onClick={onBack}>
            Back
          </Button>
          <Button type="button" onClick={startPayment}>
            {state.phase === 'idle' ? 'Pay now' : 'Try again'}
          </Button>
        </div>
      ) : null}
    </Stack>
  );
}
