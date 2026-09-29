import { describe, expect, it } from 'vitest';

import { bookingCreateInputSchema, paymentCreateInputSchema } from '@/lib/booking/validation';

const validDeparture = '11111111-1111-4111-8111-111111111111';
const validIdempotencyKey = '22222222-2222-4222-8222-222222222222';

describe('bookingCreateInputSchema', () => {
  it('accepts a well-formed single-participant booking', () => {
    const result = bookingCreateInputSchema.safeParse({
      tripDepartureId: validDeparture,
      idempotencyKey: validIdempotencyKey,
      contactName: 'A Traveller',
      contactEmail: 'traveller@example.com',
      participants: [{ fullName: 'A Traveller', isLead: true }],
    });
    expect(result.success).toBe(true);
  });

  it('accepts a group booking with several participants', () => {
    const result = bookingCreateInputSchema.safeParse({
      tripDepartureId: validDeparture,
      idempotencyKey: validIdempotencyKey,
      contactName: 'A Traveller',
      contactEmail: 'traveller@example.com',
      participants: [
        { fullName: 'A Traveller', isLead: true },
        { fullName: 'B Traveller' },
        { fullName: 'C Traveller' },
      ],
    });
    expect(result.success).toBe(true);
  });

  it('rejects a missing or invalid idempotency key', () => {
    const missing = bookingCreateInputSchema.safeParse({
      tripDepartureId: validDeparture,
      contactName: 'A Traveller',
      contactEmail: 'traveller@example.com',
      participants: [{ fullName: 'A Traveller' }],
    });
    expect(missing.success).toBe(false);

    const invalid = bookingCreateInputSchema.safeParse({
      tripDepartureId: validDeparture,
      idempotencyKey: 'not-a-uuid',
      contactName: 'A Traveller',
      contactEmail: 'traveller@example.com',
      participants: [{ fullName: 'A Traveller' }],
    });
    expect(invalid.success).toBe(false);
  });

  it('rejects more than 20 participants', () => {
    const result = bookingCreateInputSchema.safeParse({
      tripDepartureId: validDeparture,
      idempotencyKey: validIdempotencyKey,
      contactName: 'A Traveller',
      contactEmail: 'traveller@example.com',
      participants: Array.from({ length: 21 }, (_, i) => ({ fullName: `Traveller ${i}` })),
    });
    expect(result.success).toBe(false);
  });

  it('rejects an invalid email', () => {
    const result = bookingCreateInputSchema.safeParse({
      tripDepartureId: validDeparture,
      contactName: 'A Traveller',
      contactEmail: 'not-an-email',
      participants: [{ fullName: 'A Traveller' }],
    });
    expect(result.success).toBe(false);
  });

  it('rejects a non-uuid departure id', () => {
    const result = bookingCreateInputSchema.safeParse({
      tripDepartureId: 'not-a-uuid',
      contactName: 'A Traveller',
      contactEmail: 'traveller@example.com',
      participants: [{ fullName: 'A Traveller' }],
    });
    expect(result.success).toBe(false);
  });

  it('rejects an empty participant list', () => {
    const result = bookingCreateInputSchema.safeParse({
      tripDepartureId: validDeparture,
      contactName: 'A Traveller',
      contactEmail: 'traveller@example.com',
      participants: [],
    });
    expect(result.success).toBe(false);
  });

  it('rejects more than one participant marked as lead', () => {
    const result = bookingCreateInputSchema.safeParse({
      tripDepartureId: validDeparture,
      contactName: 'A Traveller',
      contactEmail: 'traveller@example.com',
      participants: [
        { fullName: 'A Traveller', isLead: true },
        { fullName: 'B Traveller', isLead: true },
      ],
    });
    expect(result.success).toBe(false);
  });

  it('rejects a blank participant name', () => {
    const result = bookingCreateInputSchema.safeParse({
      tripDepartureId: validDeparture,
      contactName: 'A Traveller',
      contactEmail: 'traveller@example.com',
      participants: [{ fullName: '' }],
    });
    expect(result.success).toBe(false);
  });
});

describe('paymentCreateInputSchema', () => {
  it('accepts a well-formed payment', () => {
    const result = paymentCreateInputSchema.safeParse({
      bookingId: validDeparture,
      provider: 'razorpay',
      providerReference: 'pay_abc123',
      amount: 1000,
      currency: 'INR',
    });
    expect(result.success).toBe(true);
  });

  it('accepts a payment with no provider reference yet', () => {
    const result = paymentCreateInputSchema.safeParse({
      bookingId: validDeparture,
      provider: 'razorpay',
      amount: 1000,
      currency: 'INR',
    });
    expect(result.success).toBe(true);
  });

  it('rejects a non-positive amount', () => {
    const result = paymentCreateInputSchema.safeParse({
      bookingId: validDeparture,
      provider: 'razorpay',
      amount: 0,
      currency: 'INR',
    });
    expect(result.success).toBe(false);
  });

  it('rejects a malformed currency code', () => {
    const result = paymentCreateInputSchema.safeParse({
      bookingId: validDeparture,
      provider: 'razorpay',
      amount: 1000,
      currency: 'inr',
    });
    expect(result.success).toBe(false);
  });
});
