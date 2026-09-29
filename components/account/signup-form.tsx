'use client';

import { useState, type FormEvent } from 'react';
import { useRouter } from 'next/navigation';

import { Button, Field, Input, Stack, Text } from '@/components/ui';
import { createTravellerProfileAction } from '@/app/(account)/actions';
import { createClient } from '@/lib/supabase/client';
import { signUpSchema } from '@/lib/traveller/validation';

/**
 * Traveller sign-up.
 *
 * `supabase.auth.signUp()` runs client-side (the browser client sets the
 * session cookie itself once Supabase confirms the account — the same
 * `@supabase/ssr` cookie handling every other client-side auth call in this
 * project already relies on). `supabase/config.toml`'s
 * `[auth.email] enable_confirmations = false` means this project's local
 * (and, per that same config, deployed) Supabase instance signs the user in
 * immediately — no "check your email" interstitial to build, because there
 * is nothing to wait for. If a deployed environment ever flips that flag on,
 * `signUp`'s response still succeeds without an active session, and the
 * unhandled state below (no redirect) is exactly the safe fallback: this
 * form does not claim a session exists when Supabase hasn't granted one.
 *
 * Profile creation is a separate, explicit server step
 * (`createTravellerProfileAction`) — not a database trigger — so a failure
 * creating the profile surfaces as a real, visible error rather than a
 * silent partial account.
 */
export function SignupForm() {
  const router = useRouter();
  const [displayName, setDisplayName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const parsed = signUpSchema.safeParse({ displayName, email, password });
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
      // config — no session exists yet to create a profile against.
      setError('Check your email to confirm your account before signing in.');
      setSubmitting(false);
      return;
    }

    try {
      await createTravellerProfileAction(parsed.data.displayName);
    } catch {
      setError('Your account was created, but we could not set up your profile. Please try again.');
      setSubmitting(false);
      return;
    }

    router.push('/dashboard');
    router.refresh();
  }

  return (
    <form onSubmit={handleSubmit}>
      <Stack gap={4}>
        <Field label="Display name" required>
          <Input
            type="text"
            required
            autoComplete="name"
            value={displayName}
            onChange={(e) => setDisplayName(e.target.value)}
          />
        </Field>
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
          {submitting ? 'Creating account…' : 'Create account'}
        </Button>
      </Stack>
    </form>
  );
}
