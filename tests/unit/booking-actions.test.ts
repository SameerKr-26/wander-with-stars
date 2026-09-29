import { describe, expect, it, vi } from 'vitest';

/**
 * `app/booking/[departureId]/actions.ts`'s `submitBookingAction`, tested
 * with a mocked `lib/booking/repository` and `lib/traveller/auth` — proves
 * the Zod-rejection path, the traveller-id-derivation-from-session path,
 * and the friendly-error-message mapping, all without a live database.
 */

vi.mock('server-only', () => ({}));

const createPendingBooking = vi.fn();
vi.mock('@/lib/booking/repository', () => ({
  createPendingBooking,
}));

const getTravellerSession = vi.fn();
vi.mock('@/lib/traveller/auth', () => ({
  getTravellerSession,
}));

const validInput = {
  tripDepartureId: '11111111-1111-4111-8111-111111111111',
  idempotencyKey: '22222222-2222-4222-8222-222222222222',
  contactName: 'A Traveller',
  contactEmail: 'traveller@example.com',
  participants: [{ fullName: 'A Traveller', isLead: true }],
};

describe('submitBookingAction', () => {
  it('rejects malformed input before ever calling the repository', async () => {
    const { submitBookingAction } = await import('@/app/booking/[departureId]/actions');
    const result = await submitBookingAction({ ...validInput, contactEmail: 'not-an-email' });
    expect(result.ok).toBe(false);
    expect(result.errorMessage).toBeTruthy();
    expect(createPendingBooking).not.toHaveBeenCalled();
  });

  it('never trusts a client-submitted travellerId — it is not even in the schema', async () => {
    getTravellerSession.mockResolvedValue(null);
    createPendingBooking.mockResolvedValue({
      ok: true,
      booking: { reference: 'WWS-ABCDEFGH', status: 'pending', participantCount: 1 },
    });

    const { submitBookingAction } = await import('@/app/booking/[departureId]/actions');
    await submitBookingAction({ ...validInput, travellerId: 'forged-user-id' } as never);

    const callArgs = createPendingBooking.mock.calls[0]![0];
    expect(callArgs.travellerId).toBeNull(); // no session => null, forged field ignored
  });

  it('derives travellerId from the session when one exists', async () => {
    getTravellerSession.mockResolvedValue({
      userId: 'user-123',
      email: 'a@example.com',
      displayName: 'A',
    });
    createPendingBooking.mockResolvedValue({
      ok: true,
      booking: { reference: 'WWS-ABCDEFGH', status: 'pending', participantCount: 1 },
    });

    const { submitBookingAction } = await import('@/app/booking/[departureId]/actions');
    await submitBookingAction(validInput);

    const callArgs = createPendingBooking.mock.calls[0]![0];
    expect(callArgs.travellerId).toBe('user-123');
  });

  it('returns a friendly message for a known error code, never the raw code itself as user-facing text', async () => {
    getTravellerSession.mockResolvedValue(null);
    createPendingBooking.mockResolvedValue({ ok: false, errorCode: 'INSUFFICIENT_CAPACITY' });

    const { submitBookingAction } = await import('@/app/booking/[departureId]/actions');
    const result = await submitBookingAction(validInput);

    expect(result.ok).toBe(false);
    expect(result.errorMessage).not.toContain('INSUFFICIENT_CAPACITY');
    expect(result.errorMessage).toMatch(/seats/i);
  });

  it('passes through a successful booking result unchanged', async () => {
    getTravellerSession.mockResolvedValue(null);
    const booking = {
      reference: 'WWS-ABCDEFGH',
      status: 'pending',
      participantCount: 2,
      snapshotTripTitle: 'Thailand Full Moon Party',
      snapshotDestination: 'Phuket',
      snapshotDepartureDate: '2026-10-25',
      snapshotReturnDate: '2026-10-31',
      snapshotPriceAmount: 49999,
      snapshotPriceCurrency: 'INR',
      expiresAt: '2026-09-29T18:00:00Z',
      createdAt: '2026-09-29T17:30:00Z',
    };
    createPendingBooking.mockResolvedValue({ ok: true, booking });

    const { submitBookingAction } = await import('@/app/booking/[departureId]/actions');
    const result = await submitBookingAction(validInput);

    expect(result.ok).toBe(true);
    expect(result.booking).toEqual(booking);
  });
});
