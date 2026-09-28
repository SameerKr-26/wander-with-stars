'use client';

import { useRouter } from 'next/navigation';

import { createClient } from '@/lib/supabase/client';

export function AdminSignOutButton() {
  const router = useRouter();

  async function handleClick() {
    const supabase = createClient();
    await supabase.auth.signOut();
    router.push('/admin/login');
    router.refresh();
  }

  return (
    <button
      type="button"
      onClick={handleClick}
      style={{
        padding: 'var(--space-2) var(--space-3)',
        borderRadius: 'var(--radius-control)',
        border: '1px solid var(--color-border)',
        background: 'transparent',
        cursor: 'pointer',
        fontSize: 'var(--text-sm)',
      }}
    >
      Sign out
    </button>
  );
}
