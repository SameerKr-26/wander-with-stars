/**
 * Admin form input validation — Phase 4.3.
 *
 * Deliberately separate from `lib/content/ingest/schema.ts`: that schema
 * validates the nested, UI-shaped `TripDetail` domain object; these
 * validate flat form submissions against the normalized database row shape
 * (`lib/content/db/schema.ts`) each one writes to. Constraints here
 * deliberately mirror the corresponding migration's CHECK constraints
 * (slug regex, currency regex, positive-price, non-negative duration) so a
 * bad submission is rejected with a useful message before it ever reaches
 * the database — but the database constraint remains authoritative; this
 * is a better error message, not a replacement for it.
 */
import { z } from 'zod';

const SLUG_REGEX = /^[a-z0-9]+(-[a-z0-9]+)*$/;
const CURRENCY_REGEX = /^[A-Z]{3}$/;

export const tripCoreInputSchema = z.object({
  slug: z
    .string()
    .min(1, 'Slug is required')
    .regex(SLUG_REGEX, 'Slug must be lowercase kebab-case (e.g. "bali-community")'),
  title: z.string().min(1, 'Title is required'),
  destination: z.string().min(1, 'Destination is required'),
  country: z.string().min(1, 'Country is required'),
  durationNights: z.coerce.number().int().nonnegative('Duration must be 0 or more nights'),
  tagline: z
    .string()
    .trim()
    .min(1)
    .optional()
    .or(z.literal('').transform(() => undefined)),
  overview: z.string().min(1, 'Overview is required'),
  hostId: z
    .string()
    .uuid('Invalid host')
    .optional()
    .or(z.literal('').transform(() => undefined)),
});
export type TripCoreInput = z.infer<typeof tripCoreInputSchema>;

export const itineraryDayInputSchema = z.object({
  dayNumber: z.coerce.number().int().positive('Day number must be a positive integer'),
  title: z.string().min(1, 'Day title is required'),
  summary: z.string().min(1, 'Day summary is required'),
});
export type ItineraryDayInput = z.infer<typeof itineraryDayInputSchema>;

export const listLabelInputSchema = z.object({
  label: z.string().min(1, 'Label must not be empty'),
});
export type ListLabelInput = z.infer<typeof listLabelInputSchema>;

export const DEPARTURE_STATUSES = [
  'draft',
  'published',
  'booking_open',
  'almost_full',
  'sold_out',
  'in_progress',
  'completed',
] as const;

export const departureInputSchema = z
  .object({
    departureDate: z.iso.date('Departure date must be a valid date'),
    returnDate: z.iso
      .date('Return date must be a valid date')
      .optional()
      .or(z.literal('').transform(() => undefined)),
    priceAmount: z.coerce.number().positive('Price must be positive').optional(),
    priceCurrency: z
      .string()
      .regex(CURRENCY_REGEX, 'Currency must be a 3-letter code, e.g. INR')
      .optional()
      .or(z.literal('').transform(() => undefined)),
    capacity: z.coerce.number().int().positive('Capacity must be a positive integer').optional(),
    status: z.enum(DEPARTURE_STATUSES),
  })
  .refine((v) => (v.priceAmount === undefined) === (v.priceCurrency === undefined), {
    message: 'Price amount and currency must be set together',
    path: ['priceCurrency'],
  })
  .refine((v) => !v.returnDate || v.returnDate >= v.departureDate, {
    message: 'Return date must not be before the departure date',
    path: ['returnDate'],
  });
export type DepartureInput = z.infer<typeof departureInputSchema>;

export const CONTENT_STATUSES = ['draft', 'review', 'approved', 'published', 'archived'] as const;
export const statusTransitionInputSchema = z.object({
  to: z.enum(CONTENT_STATUSES),
});
