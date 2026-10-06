import { describe, expect, it } from 'vitest';

import {
  citySchema,
  DIETARY_PREFERENCES,
  dietaryPreferenceSchema,
  displayNameSchema,
  emailSchema,
  forgotPasswordSchema,
  passwordSchema,
  phoneSchema,
  profileOnboardingSchema,
  profileUpdateSchema,
  resetPasswordSchema,
  signInSchema,
  signUpStep1Schema,
  TRAVEL_INTERESTS,
  travelInterestsSchema,
  TRAVEL_STYLES,
  travelStyleSchema,
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

describe('signUpStep1Schema', () => {
  it('accepts a valid Step 1 submission (email, password, matching confirmation)', () => {
    expect(
      signUpStep1Schema.safeParse({
        email: 'new@example.com',
        password: 'abcdef',
        confirmPassword: 'abcdef',
      }).success,
    ).toBe(true);
  });

  it('rejects mismatched password confirmation', () => {
    const result = signUpStep1Schema.safeParse({
      email: 'new@example.com',
      password: 'abcdef',
      confirmPassword: 'different',
    });
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.issues[0]?.path).toEqual(['confirmPassword']);
    }
  });

  it('rejects an invalid email or too-short password', () => {
    expect(
      signUpStep1Schema.safeParse({ email: 'bad', password: '123', confirmPassword: '123' })
        .success,
    ).toBe(false);
  });
});

describe('profileOnboardingSchema (signup Step 2)', () => {
  it('accepts just a full name — every other field is optional', () => {
    expect(profileOnboardingSchema.safeParse({ displayName: 'New Traveller' }).success).toBe(true);
  });

  it('accepts a fully filled-in submission', () => {
    expect(
      profileOnboardingSchema.safeParse({
        displayName: 'New Traveller',
        phone: '+91 98765 43210',
        city: 'Mumbai',
        travelStyle: 'Adventure',
        travelInterests: ['Beaches', 'Food'],
        dietaryPreference: 'Vegetarian',
      }).success,
    ).toBe(true);
  });

  it('rejects a missing full name', () => {
    expect(profileOnboardingSchema.safeParse({ displayName: '' }).success).toBe(false);
  });

  it('rejects a controlled-vocabulary value outside the allowed set — never silently accepted', () => {
    expect(
      profileOnboardingSchema.safeParse({
        displayName: 'New Traveller',
        travelStyle: 'Extreme Sports',
      }).success,
    ).toBe(false);
    expect(
      profileOnboardingSchema.safeParse({
        displayName: 'New Traveller',
        dietaryPreference: 'Keto',
      }).success,
    ).toBe(false);
    expect(
      profileOnboardingSchema.safeParse({
        displayName: 'New Traveller',
        travelInterests: ['Skydiving'],
      }).success,
    ).toBe(false);
  });
});

describe('travelStyleSchema / travelInterestsSchema / dietaryPreferenceSchema', () => {
  it('every documented travel style is accepted', () => {
    for (const style of TRAVEL_STYLES) {
      expect(travelStyleSchema.safeParse(style).success).toBe(true);
    }
  });

  it('every documented dietary preference is accepted', () => {
    for (const preference of DIETARY_PREFERENCES) {
      expect(dietaryPreferenceSchema.safeParse(preference).success).toBe(true);
    }
  });

  it('travel interests accepts multiple valid selections', () => {
    expect(travelInterestsSchema.safeParse([...TRAVEL_INTERESTS]).success).toBe(true);
  });
});

describe('phoneSchema', () => {
  it('accepts a plausible international number', () => {
    expect(phoneSchema.safeParse('+91 98765 43210').success).toBe(true);
    expect(phoneSchema.safeParse('(123) 456-7890').success).toBe(true);
  });

  it('rejects letters and obviously malformed values', () => {
    expect(phoneSchema.safeParse('not a phone').success).toBe(false);
    expect(phoneSchema.safeParse('123').success).toBe(false);
  });
});

describe('citySchema', () => {
  it('accepts a normal city name', () => {
    expect(citySchema.safeParse('Mumbai').success).toBe(true);
  });

  it('rejects an empty city', () => {
    expect(citySchema.safeParse('').success).toBe(false);
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

  it('profileUpdateSchema is profileOnboardingSchema reused, not a second near-identical schema', () => {
    expect(profileUpdateSchema).toBe(profileOnboardingSchema);
    expect(profileUpdateSchema.safeParse({ displayName: 'Jordan' }).success).toBe(true);
    expect(profileUpdateSchema.safeParse({ displayName: '' }).success).toBe(false);
  });
});
