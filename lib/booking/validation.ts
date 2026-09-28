/**
 * Booking-domain input validation — Phase 4.4.
 *
 * No booking-creation UI or Server Action exists yet to call these (out of
 * scope this phase — see the migration's header). They exist now so the
 * validation boundary a future checkout flow needs is designed
 * deliberately, alongside the schema it validates against, rather than
 * bolted on later — and so `lib/booking/schema.ts`'s shapes have a
 * matching, testable Zod mirror the same way every other content boundary
 * in this project does (`lib/content/ingest/schema.ts`,
 * `lib/admin/validation.ts`). Mirrors the migration's CHECK constraints
 * exactly; the database constraint remains authoritative regardless.
 */
import { z } from 'zod';

const CURRENCY_REGEX = /^[A-Z]{3}$/;

export const bookingParticipantInputSchema = z.object({
  fullName: z.string().min(1, 'Participant name is required'),
  isLead: z.boolean().optional(),
});
export type BookingParticipantInput = z.infer<typeof bookingParticipantInputSchema>;

export const bookingContactInputSchema = z.object({
  contactName: z.string().min(1, 'Contact name is required'),
  contactEmail: z.email('A valid contact email is required'),
  contactPhone: z.string().min(1).optional(),
});
export type BookingContactInput = z.infer<typeof bookingContactInputSchema>;

/**
 * `participants` and `participantCount` must agree — checked here
 * (`.refine`), not only left as the "application-layer invariant" the
 * migration's own comment on `bookings.participant_count` documents as
 * unenforceable cross-table in a single CHECK constraint.
 */
export const bookingCreateInputSchema = bookingContactInputSchema
  .extend({
    tripDepartureId: z.uuid('A valid departure is required'),
    participants: z
      .array(bookingParticipantInputSchema)
      .min(1, 'At least one participant is required'),
  })
  .refine((v) => v.participants.filter((p) => p.isLead).length <= 1, {
    message: 'At most one participant may be marked as lead',
    path: ['participants'],
  });
export type BookingCreateInput = z.infer<typeof bookingCreateInputSchema>;

export const paymentCreateInputSchema = z.object({
  bookingId: z.uuid('A valid booking is required'),
  provider: z.string().min(1, 'Payment provider is required'),
  providerReference: z.string().min(1).optional(),
  amount: z.number().positive('Amount must be positive'),
  currency: z.string().regex(CURRENCY_REGEX, 'Currency must be a 3-letter code, e.g. INR'),
});
export type PaymentCreateInput = z.infer<typeof paymentCreateInputSchema>;
