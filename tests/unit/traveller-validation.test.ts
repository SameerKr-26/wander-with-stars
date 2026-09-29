import { describe, expect, it } from 'vitest';

import {
  displayNameSchema,
  emailSchema,
  forgotPasswordSchema,
  passwordSchema,
  profileUpdateSchema,
  resetPasswordSchema,
  signInSchema,
  signUpSchema,
} from '@/lib/traveller/validation';

/**
 * Pure validation tests — Phase 4.5. `passwordSchema`'s minimum (6) mirrors
 * `supabase/config.toml`'s actual configured `minimum_password_length`, not
 * an invented stricter rule — see that file's own comment.
 */

describe('emailSchema', () => {
  it('accepts a valid email', () => {
    expect(emailSchema.safeParse('traveller@example.com').success).toBe(true);
  });

  it('rejects a malformed email', () => {
    expect(emailSchema.safeParse('not-an-email').success).toBe(false);
    expect(emailSchema.safeParse('').success).toBe(false);
  });
});

describe('passwordSchema', () => {
  it('accepts a 6-character password (the configured minimum)', () => {
    expect(passwordSchema.safeParse('abcdef').success).toBe(true);
  });

  it('rejects anything shorter than 6 characters', () => {
    expect(passwordSchema.safeParse('abcde').success).toBe(false);
    expect(passwordSchema.safeParse('').success).toBe(false);
  });
});

describe('displayNameSchema', () => {
  it('accepts a normal display name', () => {
    expect(displayNameSchema.safeParse('Jordan Traveller').success).toBe(true);
  });

  it('trims surrounding whitespace', () => {
    const result = displayNameSchema.safeParse('  Jordan  ');
    expect(result.success).toBe(true);
    if (result.success) expect(result.data).toBe('Jordan');
  });

  it('rejects an empty or whitespace-only name', () => {
    expect(displayNameSchema.safeParse('').success).toBe(false);
    expect(displayNameSchema.safeParse('   ').success).toBe(false);
  });

  it('rejects a name longer than 80 characters', () => {
    expect(displayNameSchema.safeParse('a'.repeat(81)).success).toBe(false);
    expect(displayNameSchema.safeParse('a'.repeat(80)).success).toBe(true);
  });
});

describe('signUpSchema', () => {
  it('accepts a valid signup submission', () => {
    expect(
      signUpSchema.safeParse({
        email: 'new@example.com',
        password: 'abcdef',
        displayName: 'New Traveller',
      }).success,
    ).toBe(true);
  });

  it('rejects an invalid field combination', () => {
    expect(signUpSchema.safeParse({ email: 'bad', password: '123', displayName: '' }).success).toBe(
      false,
    );
  });
});

describe('signInSchema', () => {
  it('accepts email + any non-empty password (Supabase itself checks correctness)', () => {
    expect(signInSchema.safeParse({ email: 'a@example.com', password: 'x' }).success).toBe(true);
  });

  it('rejects an empty password', () => {
    expect(signInSchema.safeParse({ email: 'a@example.com', password: '' }).success).toBe(false);
  });
});

describe('forgotPasswordSchema / resetPasswordSchema / profileUpdateSchema', () => {
  it('forgotPasswordSchema requires a valid email', () => {
    expect(forgotPasswordSchema.safeParse({ email: 'a@example.com' }).success).toBe(true);
    expect(forgotPasswordSchema.safeParse({ email: 'nope' }).success).toBe(false);
  });

  it('resetPasswordSchema enforces the same password rule as signup', () => {
    expect(resetPasswordSchema.safeParse({ password: 'abcdef' }).success).toBe(true);
    expect(resetPasswordSchema.safeParse({ password: 'abc' }).success).toBe(false);
  });

  it('profileUpdateSchema enforces the same display-name rule as signup', () => {
    expect(profileUpdateSchema.safeParse({ displayName: 'Jordan' }).success).toBe(true);
    expect(profileUpdateSchema.safeParse({ displayName: '' }).success).toBe(false);
  });
});
