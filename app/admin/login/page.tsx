import type { Metadata } from 'next';

import { AdminLoginForm } from '../_components/admin-login-form';

export const metadata: Metadata = {
  title: 'Sign in — WWS Admin',
  robots: { index: false, follow: false },
};

export default function AdminLoginPage() {
  return (
    <main style={{ padding: 'var(--space-8) var(--space-6)', maxWidth: '480px', margin: '0 auto' }}>
      <h1 style={{ fontSize: 'var(--text-xl)', fontWeight: 700, marginBottom: 'var(--space-6)' }}>
        WWS Admin
      </h1>
      <AdminLoginForm />
    </main>
  );
}
