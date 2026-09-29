'use client';

import { useState, type FormEvent } from 'react';
import { useRouter } from 'next/navigation';

import { Button, Field, Input, Stack, Text } from '@/components/ui';
import { createClient } from '@/lib/supabase/client';
import { signInSchema } from '@/lib/traveller/validation';

/**
 * Traveller sign-in — email/password via the browser Supabase client, the
 * same `signInWithPassword` pattern `app/admin/_components/admin-login-form.tsx`
 * already established. Session cookies are set by `@supabase/ssr`'s browser
 * client itself; nothing here touches localStorage.
 */
export function LoginForm() {
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const parsed = signInSchema.safeParse({ email, password });
    if (!parsed.success) {
      setError(parsed.error.issues[0]?.message ?? 'Check your details and try again.');
      return;
    }

    setSubmitting(true);
    setError(null);

    const supabase = createClient();
    const { error: signInError } = await supabase.auth.signInWithPassword(parsed.data);

    if (signInError) {
      // Never distinguish "wrong password" from "no such account" —
      // account enumeration risk (docs/SECURITY.md §13), same rule the
      // admin login form already follows.
      setError('Invalid email or password.');
      setSubmitting(false);
      return;
    }

    router.push('/dashboard');
    router.refresh();
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
        <Field label="Password" required>
          <Input
            type="password"
            required
            autoComplete="current-password"
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
          {submitting ? 'Signing in…' : 'Sign in'}
        </Button>
      </Stack>
    </form>
  );
}
