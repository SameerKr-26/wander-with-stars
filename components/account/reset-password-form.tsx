'use client';

import { useEffect, useState, type FormEvent } from 'react';
import { useRouter } from 'next/navigation';

import { Button, Field, Input, Stack, Text } from '@/components/ui';
import { createClient } from '@/lib/supabase/client';
import { resetPasswordSchema } from '@/lib/traveller/validation';

/**
 * Password reset — the landing page a `resetPasswordForEmail` link opens.
 * Supabase's own recovery-link flow exchanges the link's token for a
 * temporary session automatically (the browser client's `detectSessionInUrl`
 * default), so this form only ever needs `updateUser({ password })` — no
 * manual token handling. An expired or already-used link simply never
 * produces a session, which `hasSession === false` below turns into an
 * honest "this link no longer works" state rather than a confusing form
 * that fails silently on submit.
 */
export function ResetPasswordForm() {
  const router = useRouter();
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [done, setDone] = useState(false);
  const [hasSession, setHasSession] = useState<boolean | null>(null);

  useEffect(() => {
    const supabase = createClient();
    supabase.auth.getSession().then(({ data }) => setHasSession(Boolean(data.session)));
  }, []);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const parsed = resetPasswordSchema.safeParse({ password });
    if (!parsed.success) {
      setError(parsed.error.issues[0]?.message ?? 'Enter a valid password.');
      return;
    }

    setSubmitting(true);
    setError(null);

    const supabase = createClient();
    const { error: updateError } = await supabase.auth.updateUser({
      password: parsed.data.password,
    });

    if (updateError) {
      setError('This link has expired or is no longer valid. Request a new one.');
      setSubmitting(false);
      return;
    }

    setDone(true);
    setSubmitting(false);
  }

  if (hasSession === null) return null;

  if (!hasSession) {
    return (
      <Stack gap={3}>
        <Text role="alert">This reset link is invalid or has expired.</Text>
        <Button variant="secondary" onClick={() => router.push('/forgot-password')}>
          Request a new link
        </Button>
      </Stack>
    );
  }

  if (done) {
    return (
      <Stack gap={3}>
        <Text>Your password has been updated.</Text>
        <Button onClick={() => router.push('/login')}>Sign in</Button>
      </Stack>
    );
  }

  return (
    <form onSubmit={handleSubmit}>
      <Stack gap={4}>
        <Field label="New password" description="At least 6 characters." required>
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
          {submitting ? 'Updating…' : 'Update password'}
        </Button>
      </Stack>
    </form>
  );
}
