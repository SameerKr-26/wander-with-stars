import { z } from 'zod';

/**
 * Traveller auth/profile validation — Phase 4.5.
 *
 * Mirrors what Supabase Auth itself actually enforces
 * (`supabase/config.toml`'s `[auth]` section: `minimum_password_length = 6`,
 * no `password_requirements` complexity rule) rather than inventing a
 * stricter policy the server doesn't share — this is early, honest UX
 * feedback, not the security boundary. Supabase Auth re-validates every
 * signup/password-change request server-side regardless of what this schema
 * allows through (docs/SECURITY.md §15: never pretend frontend validation
 * is security).
 */

export const emailSchema = z.email('Enter a valid email address.');

export const passwordSchema = z.string().min(6, 'Password must be at least 6 characters.');

export const displayNameSchema = z
  .string()
  .trim()
  .min(1, 'Enter a display name.')
  .max(80, 'Display name must be 80 characters or fewer.');

/**
 * Signup Step 1 — create account (Phase 4.8A). Previously bundled
 * `displayName` in with email/password as a single-step form; the brief
 * now explicitly separates account creation (this) from profile
 * onboarding (`profileOnboardingSchema`, Step 2) — "Full name" moved
 * there. `confirmPassword` only needs to match; its own strength is
 * already covered by `passwordSchema` on `password`.
 */
export const signUpStep1Schema = z
  .object({
    email: emailSchema,
    password: passwordSchema,
    confirmPassword: z.string().min(1, 'Confirm your password.'),
  })
  .refine((data) => data.password === data.confirmPassword, {
    message: 'Passwords do not match.',
    path: ['confirmPassword'],
  });

export const signInSchema = z.object({
  email: emailSchema,
  password: z.string().min(1, 'Enter your password.'),
});

export const forgotPasswordSchema = z.object({
  email: emailSchema,
});

export const resetPasswordSchema = z.object({
  password: passwordSchema,
});

/**
 * Onboarding profile fields — Phase 4.8A.
 *
 * `TRAVEL_STYLES`/`TRAVEL_INTERESTS`/`DIETARY_PREFERENCES` are the single
 * TypeScript source of truth for these controlled vocabularies; the
 * matching SQL CHECK constraints
 * (`supabase/migrations/20261001090000_extend_traveller_profiles.sql`)
 * mirror these exact string lists and must be kept in sync by inspection
 * — the same two-layer-enforcement discipline `lib/booking/status.ts`
 * already documents for its own SQL/TS pair. Never accept an arbitrary
 * string from the browser for any of these three fields: the server
 * schema here is what actually rejects a value outside the set (the
 * database CHECK constraint is the second, independent backstop).
 */
export const TRAVEL_STYLES = [
  'Adventure',
  'Relaxation',
  'Backpacking',
  'Cultural',
  'Nightlife',
  'Luxury',
  'Nature',
  'Photography',
] as const;
export type TravelStyle = (typeof TRAVEL_STYLES)[number];

export const TRAVEL_INTERESTS = [
  'Beaches',
  'Mountains',
  'Food',
  'Culture',
  'Parties / nightlife',
  'Wildlife',
  'Photography',
  'Road trips',
] as const;
export type TravelInterest = (typeof TRAVEL_INTERESTS)[number];

export const DIETARY_PREFERENCES = [
  'No preference',
  'Vegetarian',
  'Vegan',
  'Jain',
  'Other',
] as const;
export type DietaryPreference = (typeof DIETARY_PREFERENCES)[number];

/**
 * Lenient on purpose — this phase's own "phone validation without
 * over-restricting international numbers" rule. Accepts an optional
 * leading `+`, digits, and the separators a traveller might reasonably
 * type (space, hyphen, parentheses, dot), 7-20 characters — wide enough
 * for real international numbers, narrow enough to catch an obviously
 * malformed value (e.g. letters).
 */
export const phoneSchema = z
  .string()
  .trim()
  .min(1)
  .regex(/^\+?[0-9 ()\-.]{7,20}$/, 'Enter a valid phone number.');

export const citySchema = z.string().trim().min(1).max(80, 'City must be 80 characters or fewer.');

export const travelStyleSchema = z.enum(TRAVEL_STYLES, 'Select a valid travel style.');

export const travelInterestsSchema = z
  .array(z.enum(TRAVEL_INTERESTS, 'Select valid travel interests.'))
  .max(TRAVEL_INTERESTS.length);

export const dietaryPreferenceSchema = z.enum(
  DIETARY_PREFERENCES,
  'Select a valid dietary preference.',
);

/**
 * Step 2 of signup — traveller profile onboarding. Only `displayName`
 * ("Full name") is required; every other field is optional, matching the
 * brief exactly. `.optional()` here means "may be omitted from the
 * object sent to the server" — the signup form itself converts an empty
 * input back to `undefined` before building that object (the same
 * `value || undefined` convention `components/booking/booking-wizard.tsx`
 * already uses for its own optional `contactPhone` field), so an empty
 * string never reaches this schema as a value needing its own "empty is
 * fine" case.
 */
export const profileOnboardingSchema = z.object({
  displayName: displayNameSchema,
  phone: phoneSchema.optional(),
  city: citySchema.optional(),
  travelStyle: travelStyleSchema.optional(),
  travelInterests: travelInterestsSchema.optional(),
  dietaryPreference: dietaryPreferenceSchema.optional(),
});

/** Profile editing (`/dashboard/profile`, Part 5) submits the identical
 * shape onboarding does — one schema, reused, not a second nearly-identical
 * one. */
export const profileUpdateSchema = profileOnboardingSchema;

export type SignUpStep1Input = z.infer<typeof signUpStep1Schema>;
export type SignInInput = z.infer<typeof signInSchema>;
export type ForgotPasswordInput = z.infer<typeof forgotPasswordSchema>;
export type ResetPasswordInput = z.infer<typeof resetPasswordSchema>;
export type ProfileOnboardingInput = z.infer<typeof profileOnboardingSchema>;
export type ProfileUpdateInput = ProfileOnboardingInput;
