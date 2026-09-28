'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';

import { createClient } from '@/lib/supabase/client';

/**
 * Admin sign-in — email/password against Supabase Auth, via the browser
 * client (RLS applies as normal; this form grants no privilege itself,
 * it only establishes a session for the server to later check against
 * `admin_roles`). Not a traveller account system: there is no sign-up link,
 * no password-reset flow, no profile — an admin account is provisioned
 * out-of-band (`scripts/grant-admin-role.ts`), matching Phase 4.3's "admin
 * identity only, to the minimum extent required" scope.
 */
export function AdminLoginForm() {
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSubmitting(true);
    setError(null);

    const supabase = createClient();
    const { error: signInError } = await supabase.auth.signInWithPassword({ email, password });

    if (signInError) {
      // Never distinguish "wrong password" from "no such user" — that
      // distinction is exactly the kind of account-enumeration signal
      // docs/SECURITY.md's least-privilege principle argues against
      // exposing.
      setError('Invalid email or password.');
      setSubmitting(false);
      return;
    }

    router.push('/admin/trips');
    router.refresh();
  }

  return (
    <form
      onSubmit={handleSubmit}
      style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-4)', maxWidth: '360px' }}
    >
      <label style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-1)' }}>
        <span style={{ fontSize: 'var(--text-sm)' }}>Email</span>
        <input
          type="email"
          required
          autoComplete="username"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          style={inputStyle}
        />
      </label>
      <label style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-1)' }}>
        <span style={{ fontSize: 'var(--text-sm)' }}>Password</span>
        <input
          type="password"
          required
          autoComplete="current-password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          style={inputStyle}
        />
      </label>
      {error ? (
        <p role="alert" style={{ color: '#b3261e', fontSize: 'var(--text-sm)' }}>
          {error}
        </p>
      ) : null}
      <button type="submit" disabled={submitting} style={buttonStyle}>
        {submitting ? 'Signing in…' : 'Sign in'}
      </button>
    </form>
  );
}

const inputStyle: React.CSSProperties = {
  padding: 'var(--space-3)',
  borderRadius: 'var(--radius-control)',
  border: '1px solid var(--color-border)',
  fontSize: 'var(--text-base)',
};

const buttonStyle: React.CSSProperties = {
  padding: 'var(--space-3) var(--space-4)',
  borderRadius: 'var(--radius-control)',
  border: 'none',
  background: 'var(--color-surface-brand)',
  color: 'var(--color-text-on-brand)',
  fontWeight: 600,
  cursor: 'pointer',
};
