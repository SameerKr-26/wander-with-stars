/**
 * Content validation boundary — Phase 3.6.
 *
 * A Zod mirror of `lib/content/types.ts`'s `TripDetail` and everything it
 * references, using the project's existing validation technology
 * (Zod is already used at `lib/env/client.ts` / `lib/env/server.ts` for the
 * exact same reason CLAUDE.md states it for: "Validate all external input
 * with Zod at the boundary").
 *
 * This is the VALIDATION half of the ingestion pipeline
 * (raw → normalize.ts → HERE → TripDetail). It rejects malformed content —
 * it does not repair it. Every `.min(1)` here means "reject empty," not
 * "trim it for you"; whitespace cleanup, slug derivation and enum
 * case-folding are `normalize.ts`'s job, run *before* this schema sees the
 * data. Keeping the two separate is deliberate: a schema that both
 * "fixes" and "rejects" hides which failures are the source data's fault.
 *
 * Every schema here is named to match its `lib/content/types.ts` type
 * one-for-one, so drift between the two is easy to spot in review.
 */

import { z } from 'zod';

/* ---------------------------------------------------------------- media */

/**
 * `alt` on an image is allowed to be an empty string — an intentionally
 * decorative image (see components/trips/trip-gallery.tsx's existing
 * `alt={media.kind === 'image' ? media.alt : ''}` pattern) is not malformed
 * content, so this does not require `.min(1)` the way `src` does.
 *
 * `src`/`poster` are validated as non-empty strings, not URLs: real media
 * will eventually be Supabase Storage paths (see docs/ARCHITECTURE.md §14),
 * which are not necessarily full URLs. Path-shape validation belongs to
 * whichever module owns that Storage convention once it exists.
 */
export const tripMediaSchema = z.discriminatedUnion('kind', [
  z.object({
    kind: z.literal('image'),
    src: z.string().min(1, 'image src must not be empty'),
    alt: z.string(),
    focalPoint: z.enum(['center', 'top', 'bottom']).optional(),
  }),
  z.object({
    kind: z.literal('video'),
    src: z.string().min(1, 'video src must not be empty'),
    poster: z.string().min(1, 'video poster must not be empty'),
    alt: z.string(),
  }),
  z.object({
    kind: z.literal('placeholder'),
  }),
]);

/* --------------------------------------------------------------- people */

/** Shared by `host` and `guide` — see `GuidePreview = HostPreview` in lib/content/types.ts. */
export const hostPreviewSchema = z.object({
  name: z.string().min(1, 'name must not be empty'),
  avatar: tripMediaSchema.optional(),
  tagline: z.string().min(1).optional(),
});

/* ------------------------------------------------------------- signals */

export const travelStyleSignalSchema = z.enum([
  'adventure',
  'social',
  'party',
  'relaxation',
  'culture',
  'nature',
]);

/**
 * `Partial<Record<TravelStyleSignal, number>>` — every key optional, but any
 * key present must be a real signal. `z.partialRecord` (not `z.record`,
 * which would require every enum key to be present) is exactly this shape.
 */
export const tripStyleScoresSchema = z.partialRecord(travelStyleSignalSchema, z.number());

export const availabilityStatusSchema = z.enum(['open', 'almost-full', 'waitlisted', 'sold-out']);

export const tripAvailabilitySchema = z.object({
  status: availabilityStatusSchema,
  spotsLeft: z.number().int().nonnegative().optional(),
});

export const tripPriceSchema = z.object({
  amount: z.number().positive('price amount must be positive'),
  // Format-only (ISO 4217 shape), not a full currency-code whitelist — see
  // the report/README note on this limitation.
  currency: z
    .string()
    .regex(/^[A-Z]{3}$/, 'currency must be a 3-letter ISO 4217-style code, e.g. INR'),
});

/* ---------------------------------------------------------------- trip */

export const tripItineraryDaySchema = z.object({
  day: z.number().int().positive('day must be a positive integer'),
  title: z.string().min(1, 'itinerary day title must not be empty'),
  summary: z.string().min(1, 'itinerary day summary must not be empty'),
});

/**
 * The array-level shape, not just each day: rejects duplicate or
 * out-of-order day numbers, which a single day's own schema can't catch.
 * This is a structural-correctness check, not an inference — it never
 * renumbers or reorders, only rejects.
 */
export const tripItinerarySchema = z.array(tripItineraryDaySchema).superRefine((days, ctx) => {
  const seen = new Set<number>();
  days.forEach((entry, index) => {
    if (seen.has(entry.day)) {
      ctx.addIssue({
        code: 'custom',
        path: [index, 'day'],
        message: `duplicate itinerary day number: ${entry.day}`,
      });
    }
    seen.add(entry.day);
  });

  for (let i = 1; i < days.length; i += 1) {
    if (days[i]!.day < days[i - 1]!.day) {
      ctx.addIssue({
        code: 'custom',
        path: [i, 'day'],
        message: `itinerary day numbers must be non-decreasing (day ${days[i]!.day} follows day ${days[i - 1]!.day})`,
      });
    }
  }
});

export const tripAccommodationSchema = z.object({
  name: z.string().min(1).optional(),
  type: z.string().min(1).optional(),
  description: z.string().min(1).optional(),
  nights: z.number().int().positive().optional(),
  media: tripMediaSchema.optional(),
});

export const tripTransportSchema = z.object({
  mode: z.string().min(1, 'transport mode must not be empty'),
  description: z.string().min(1).optional(),
});

export const tripMeetingPointSchema = z.object({
  location: z.string().min(1, 'meeting point location must not be empty'),
  time: z.string().min(1).optional(),
  instructions: z.string().min(1).optional(),
});

export const tripTravellerNoteCategorySchema = z.enum([
  'etiquette',
  'weather',
  'connectivity',
  'money',
  'cultural',
  'health',
  'arrival',
  'other',
]);

export const tripImportantNoteSchema = z.object({
  title: z.string().min(1, 'note title must not be empty'),
  detail: z.string().min(1, 'note detail must not be empty'),
  category: tripTravellerNoteCategorySchema.optional(),
});

export const tripFAQSchema = z.object({
  question: z.string().min(1, 'FAQ question must not be empty'),
  answer: z.string().min(1, 'FAQ answer must not be empty'),
});

export const tripPolicySectionSchema = z.object({
  title: z.string().min(1, 'policy section title must not be empty'),
  body: z.string().min(1, 'policy section body must not be empty'),
});

export const tripPolicySchema = z.object({
  cancellation: tripPolicySectionSchema.optional(),
  refund: tripPolicySectionSchema.optional(),
  paymentTerms: tripPolicySectionSchema.optional(),
  additionalTerms: z.array(tripPolicySectionSchema).optional(),
});

export const tripExtraSchema = z.object({
  name: z.string().min(1, 'extra name must not be empty'),
  price: tripPriceSchema.optional(),
  description: z.string().min(1).optional(),
});

/**
 * Mirrors `TripPreview` in lib/content/types.ts. `slug` is validated as
 * already-normalized lowercase-kebab-case — deriving/cleaning it from a raw
 * title or a messy source value is `normalize.ts`'s job, run before this.
 */
export const tripPreviewSchema = z.object({
  id: z.string().min(1, 'id is required'),
  slug: z
    .string()
    .min(1, 'slug is required')
    .regex(/^[a-z0-9]+(-[a-z0-9]+)*$/, 'slug must be lowercase kebab-case (e.g. "bali-community")'),
  title: z.string().min(1, 'title must not be empty'),
  destination: z.string().min(1, 'destination must not be empty'),
  country: z.string().min(1, 'country must not be empty'),
  departureDate: z.iso.date('departureDate must be an ISO date (YYYY-MM-DD)'),
  durationNights: z.number().int().nonnegative('durationNights must be 0 or more'),
  price: tripPriceSchema,
  availability: tripAvailabilitySchema,
  host: hostPreviewSchema,
  heroMedia: tripMediaSchema,
  styleScores: tripStyleScoresSchema,
  travellerCount: z.number().int().nonnegative().optional(),
  tagline: z.string().min(1).optional(),
});

/**
 * Mirrors `TripDetail` in lib/content/types.ts exactly, field for field.
 * `inclusions`/`exclusions` stay plain non-empty-string arrays, matching
 * that type's own comment on why they were never restructured into
 * `TripInclusion[]`/`TripExclusion[]` objects.
 */
export const tripDetailSchema = tripPreviewSchema.extend({
  overview: z.string().min(1, 'overview must not be empty'),
  inclusions: z.array(z.string().min(1)),
  exclusions: z.array(z.string().min(1)),
  gallery: z.array(tripMediaSchema),
  itineraryPreview: tripItinerarySchema,
  accommodation: z.array(tripAccommodationSchema).optional(),
  transport: z.array(tripTransportSchema).optional(),
  meetingPoint: tripMeetingPointSchema.optional(),
  thingsToCarry: z.array(z.string().min(1)).optional(),
  importantNotes: z.array(tripImportantNoteSchema).optional(),
  faqs: z.array(tripFAQSchema).optional(),
  policy: tripPolicySchema.optional(),
  extras: z.array(tripExtraSchema).optional(),
  guide: hostPreviewSchema.optional(),
});

export type TripDetailInput = z.input<typeof tripDetailSchema>;
export type TripDetailParsed = z.output<typeof tripDetailSchema>;

/**
 * Phase 3.7 — a source can supply everything a trip needs to describe
 * itself (route, itinerary, inclusions/exclusions) well before a sellable
 * departure exists: no price has been set, no date confirmed, no seats
 * opened, no host/creator assigned. `tripDetailSchema` correctly REJECTS
 * that content today (`departureDate`/`price`/`availability`/`host` are
 * required, per `tripPreviewSchema`) — and it should keep doing so for
 * anything claiming to be publishable content, so this is a second,
 * explicitly narrower schema rather than a change to that one.
 *
 * `draftTripDetailSchema` mirrors `tripDetailSchema` field for field, with
 * exactly those four commercial fields made optional. It exists only for
 * content that is intentionally staying in `draft`/`review`
 * (`ContentStatus`, ./types.ts) until a human supplies the missing values —
 * never for anything reaching `lib/content/queries.ts` or a UI component,
 * which still only ever see the strict `TripDetail`/`tripDetailSchema`
 * shape. See docs/ARCHITECTURE.md §14 for the promotion path this implies:
 * re-validating against `tripDetailSchema` once the real values exist is
 * exactly what turns a `DraftTripDetail` into a publishable `TripDetail`.
 *
 * This is the "optional at the content level" side of the two options
 * docs/ARCHITECTURE.md §14 lays out for commercially-incomplete source
 * content — scoped to draft content only, so `TripPreview`/`TripDetail`
 * and everything that already depends on their fields being required
 * (fixtures, queries, every trip-card and trip-detail component) are
 * completely unaffected.
 */
export const draftTripDetailSchema = tripDetailSchema.extend({
  departureDate: tripPreviewSchema.shape.departureDate.optional(),
  price: tripPriceSchema.optional(),
  availability: tripAvailabilitySchema.optional(),
  host: hostPreviewSchema.optional(),
});

export type DraftTripDetailInput = z.input<typeof draftTripDetailSchema>;
export type DraftTripDetailParsed = z.output<typeof draftTripDetailSchema>;
