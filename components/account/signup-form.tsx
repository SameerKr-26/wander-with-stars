'use client';

import { useEffect, useState, type FormEvent } from 'react';
import { useRouter } from 'next/navigation';

import { completeOnboardingAction } from '@/app/(account)/actions';
import { Button, Checkbox, Field, Input, Select, Stack, Text } from '@/components/ui';
import { createClient } from '@/lib/supabase/client';
import {
  DIETARY_PREFERENCES,
  profileOnboardingSchema,
  signUpStep1Schema,
  TRAVEL_INTERESTS,
  TRAVEL_STYLES,
} from '@/lib/traveller/validation';

/**
 * Traveller sign-up — a two-step "Join the WWS traveller community" flow
 * (Phase 4.8A), not a single giant form.
 *
 * Step 1 (account): email/password/confirm — `supabase.auth.signUp()` runs
 * client-side exactly as before (see the original single-step
 * implementation's own comment on why: the browser client sets the session
 * cookie itself, and `enable_confirmations = false` locally means the
 * session is live immediately, no "check your email" interstitial needed).
 *
 * Step 2 (profile): full name (required) plus the optional onboarding
 * fields, saved via `completeOnboardingAction` — a real, explicit server
 * step (`lib/traveller/profile.ts`'s `upsertOwnProfile`), not a database
 * trigger, so a failure surfaces as a visible, retryable error rather than
 * a silent partial account.
 *
 * Safe across a browser refresh or returning later mid-onboarding: on
 * mount, this checks whether a Supabase session ALREADY exists (the
 * traveller completed Step 1, then refreshed or navigated away before
 * Step 2) and jumps straight to Step 2 if so — re-submitting Step 1 for an
 * already-authenticated email would otherwise fail with "already
 * registered".
 */
export function SignupForm() {
  const router = useRouter();
  const [step, setStep] = useState<'account' | 'profile' | 'checking'>('checking');

  useEffect(() => {
    let cancelled = false;
    const supabase = createClient();
    supabase.auth.getUser().then(({ data }) => {
      if (!cancelled) setStep(data.user ? 'profile' : 'account');
    });
    return () => {
      cancelled = true;
    };
  }, []);

  if (step === 'checking') return null;
  if (step === 'account') return <AccountStep onCreated={() => setStep('profile')} />;
  return (
    <ProfileStep
      onComplete={() => {
        router.push('/dashboard');
        router.refresh();
      }}
    />
  );
}

function AccountStep({ onCreated }: { onCreated: () => void }) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const parsed = signUpStep1Schema.safeParse({ email, password, confirmPassword });
    if (!parsed.success) {
      setError(parsed.error.issues[0]?.message ?? 'Check your details and try again.');
      return;
    }

    setSubmitting(true);
    setError(null);

    const supabase = createClient();
    const { data, error: signUpError } = await supabase.auth.signUp({
      email: parsed.data.email,
      password: parsed.data.password,
    });

    if (signUpError) {
      // Supabase's own message here ("User already registered") is safe to
      // show — unlike sign-in, a clear "this email is taken" is the
      // expected, helpful signup UX, not an enumeration risk in the same
      // way a login failure would be.
      setError(
        signUpError.message.toLowerCase().includes('already registered')
          ? 'An account with this email already exists.'
          : 'Could not create your account. Please try again.',
      );
      setSubmitting(false);
      return;
    }

    if (!data.session) {
      // Email confirmation is required by this environment's Supabase
      // config — no session exists yet to continue onboarding with.
      setError('Check your email to confirm your account before signing in.');
      setSubmitting(false);
      return;
    }

    onCreated();
  }

  return (
    <form onSubmit={handleSubmit}>
      <Stack gap={4}>
        <Text variant="small" tone="secondary">
          Step 1 of 2 — create your account
        </Text>
        <Field label="Email" required>
          <Input
            type="email"
            required
            autoComplete="username"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
          />
        </Field>
        <Field label="Password" description="At least 6 characters." required>
          <Input
            type="password"
            required
            autoComplete="new-password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
          />
        </Field>
        <Field label="Confirm password" required>
          <Input
            type="password"
            required
            autoComplete="new-password"
            value={confirmPassword}
            onChange={(e) => setConfirmPassword(e.target.value)}
          />
        </Field>
        {error ? (
          <Text
            role="alert"
            variant="small"
            style={{ color: 'var(--wws-charcoal)', fontWeight: 600 }}
          >
            {error}
          </Text>
        ) : null}
        <Button type="submit" disabled={submitting}>
          {submitting ? 'Creating account…' : 'Continue'}
        </Button>
      </Stack>
    </form>
  );
}

function ProfileStep({ onComplete }: { onComplete: () => void }) {
  const [displayName, setDisplayName] = useState('');
  const [phone, setPhone] = useState('');
  const [city, setCity] = useState('');
  const [travelStyle, setTravelStyle] = useState('');
  const [interests, setInterests] = useState<string[]>([]);
  const [dietaryPreference, setDietaryPreference] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  function toggleInterest(value: string) {
    setInterests((current) =>
      current.includes(value) ? current.filter((v) => v !== value) : [...current, value],
    );
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    const parsed = profileOnboardingSchema.safeParse({
      displayName,
      phone: phone.trim() || undefined,
      city: city.trim() || undefined,
      travelStyle: travelStyle || undefined,
      travelInterests: interests.length > 0 ? interests : undefined,
      dietaryPreference: dietaryPreference || undefined,
    });
    if (!parsed.success) {
      setError(parsed.error.issues[0]?.message ?? 'Check your details and try again.');
      return;
    }

    setSubmitting(true);
    setError(null);

    const result = await completeOnboardingAction(parsed.data);
    if (!result.ok) {
      setError(result.errorMessage);
      setSubmitting(false);
      return;
    }

    onComplete();
  }

  return (
    <form onSubmit={handleSubmit}>
      <Stack gap={5}>
        <Stack gap={1}>
          <Text variant="small" tone="secondary">
            Step 2 of 2 — tell us about yourself
          </Text>
          <Text tone="secondary">
            Help us tailor WWS trips to you. Everything except your name is optional.
          </Text>
        </Stack>

        <Field label="Full name" required>
          <Input
            type="text"
            required
            autoComplete="name"
            value={displayName}
            onChange={(e) => setDisplayName(e.target.value)}
          />
        </Field>

        <Field label="Phone / WhatsApp" description="Optional.">
          <Input
            type="tel"
            autoComplete="tel"
            value={phone}
            onChange={(e) => setPhone(e.target.value)}
          />
        </Field>

        <Field label="City" description="Optional.">
          <Input
            type="text"
            autoComplete="address-level2"
            value={city}
            onChange={(e) => setCity(e.target.value)}
          />
        </Field>

        <Field label="Preferred travel style" description="Optional.">
          <Select value={travelStyle} onChange={(e) => setTravelStyle(e.target.value)}>
            <option value="">No preference</option>
            {TRAVEL_STYLES.map((style) => (
              <option key={style} value={style}>
                {style}
              </option>
            ))}
          </Select>
        </Field>

        <Stack gap={2}>
          <Text variant="small" style={{ fontWeight: 'var(--weight-label)' }}>
            Travel interests{' '}
            <Text as="span" variant="small" tone="muted">
              (optional, pick any)
            </Text>
          </Text>
          <div className="grid grid-cols-2" style={{ gap: 'var(--space-2)' }}>
            {TRAVEL_INTERESTS.map((interest) => (
              <Checkbox
                key={interest}
                label={interest}
                checked={interests.includes(interest)}
                onChange={() => toggleInterest(interest)}
              />
            ))}
          </div>
        </Stack>

        <Field label="Dietary preference" description="Optional.">
          <Select value={dietaryPreference} onChange={(e) => setDietaryPreference(e.target.value)}>
            <option value="">Prefer not to say</option>
            {DIETARY_PREFERENCES.map((preference) => (
              <option key={preference} value={preference}>
                {preference}
              </option>
            ))}
          </Select>
        </Field>

        {error ? (
          <Text
            role="alert"
            variant="small"
            style={{ color: 'var(--wws-charcoal)', fontWeight: 600 }}
          >
            {error}
          </Text>
        ) : null}

        <Button type="submit" disabled={submitting}>
          {submitting ? 'Saving…' : 'Join Wander With Stars'}
        </Button>
      </Stack>
    </form>
  );
}
