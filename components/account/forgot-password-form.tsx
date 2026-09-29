'use client';

import { useState, type FormEvent } from 'react';

import { Button, Field, Input, Stack, Text } from '@/components/ui';
import { createClient } from '@/lib/supabase/client';
import { forgotPasswordSchema } from '@/lib/traveller/validation';

/**
 * Password recovery request — `resetPasswordForEmail`, the flow Supabase
 * Auth already supports without any extra configuration (no separate
 * provider, no custom token store). Always shows the same success message
 * regardless of whether the email matches an account — confirming or
 * denying an account's existence here is exactly the enumeration risk
 * docs/SECURITY.md §13 warns against, and Supabase's own API already
 * behaves this way (it never reveals whether the address is registered).
 */
export function ForgotPasswordForm() {
  const [email, setEmail] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [sent, setSent] = useState(false);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const parsed = forgotPasswordSchema.safeParse({ email });
    if (!parsed.success) {
      setError(parsed.error.issues[0]?.message ?? 'Enter a valid email address.');
      return;
    }

    setSubmitting(true);
    setError(null);

    const supabase = createClient();
    await supabase.auth.resetPasswordForEmail(parsed.data.email, {
      redirectTo: `${window.location.origin}/reset-password`,
    });

    // Intentionally ignore any error from Supabase here too — surfacing it
    // (e.g. "rate limited") is the only case worth distinguishing, and even
    // that risks leaking timing/enumeration signal for marginal benefit.
    setSent(true);
    setSubmitting(false);
  }

  if (sent) {
    return (
      <Text>
        If an account exists for that email, we&apos;ve sent a link to reset your password.
      </Text>
    );
  }

  return (
    <form onSubmit={handleSubmit}>
      <Stack gap={4}>
        <Field label="Email" required>
          <Input
            type="email"
            required
            autoComplete="username"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
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
          {submitting ? 'Sending…' : 'Send reset link'}
        </Button>
      </Stack>
    </form>
  );
}
