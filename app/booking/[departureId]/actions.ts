'use server';

import {
  createPendingBooking,
  type BookingCreationErrorCode,
  type SafeBookingResult,
} from '@/lib/booking/repository';
import { bookingCreateInputSchema } from '@/lib/booking/validation';
import { getTravellerSession } from '@/lib/traveller/auth';

/**
 * The one write surface `components/booking/booking-wizard.tsx` submits
 * to. A plain async function the client calls directly (not a
 * `<form action={...}>`): the wizard is a multi-step client component
 * managing its own state, so it needs a result value to react to
 * (success/error) rather than a page navigation.
 *
 * Re-validates everything server-side (Zod here, then the database itself
 * inside `create_pending_booking`) — never trusts that the client's own
 * validation ran or wasn't tampered with. `traveller_id` is derived from
 * the request's own session (`getTravellerSession`), never accepted as a
 * field on `rawInput` — there is no `travellerId` key in
 * `bookingCreateInputSchema` at all, so a forged one in the raw payload is
 * simply dropped by the parse, not silently trusted.
 */
export interface BookingActionResult {
  ok: boolean;
  booking?: SafeBookingResult;
  errorMessage?: string;
}

const FRIENDLY_MESSAGES: Record<BookingCreationErrorCode, string> = {
  DEPARTURE_NOT_FOUND: "We couldn't find that departure. It may no longer be available.",
  DEPARTURE_NOT_BOOKABLE: 'This departure is no longer open for booking.',
  TRIP_NOT_PUBLISHED: 'This trip is not currently available to book.',
  NO_PARTICIPANTS: 'Add at least one participant to continue.',
  INSUFFICIENT_CAPACITY: "There aren't enough seats left on this departure for your group.",
  UNKNOWN: 'Something went wrong creating your booking. Please try again.',
};

export async function submitBookingAction(rawInput: unknown): Promise<BookingActionResult> {
  const parsed = bookingCreateInputSchema.safeParse(rawInput);
  if (!parsed.success) {
    return {
      ok: false,
      errorMessage: parsed.error.issues[0]?.message ?? 'Check your details and try again.',
    };
  }

  const session = await getTravellerSession();

  const result = await createPendingBooking({
    ...parsed.data,
    travellerId: session?.userId ?? null,
  });

  if (!result.ok) {
    return { ok: false, errorMessage: FRIENDLY_MESSAGES[result.errorCode] };
  }

  return { ok: true, booking: result.booking };
}
