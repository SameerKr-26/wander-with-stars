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

export const signUpSchema = z.object({
  email: emailSchema,
  password: passwordSchema,
  displayName: displayNameSchema,
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

export const profileUpdateSchema = z.object({
  displayName: displayNameSchema,
});

export type SignUpInput = z.infer<typeof signUpSchema>;
export type SignInInput = z.infer<typeof signInSchema>;
export type ForgotPasswordInput = z.infer<typeof forgotPasswordSchema>;
export type ResetPasswordInput = z.infer<typeof resetPasswordSchema>;
export type ProfileUpdateInput = z.infer<typeof profileUpdateSchema>;
