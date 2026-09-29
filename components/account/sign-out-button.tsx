'use client';

import { useRouter } from 'next/navigation';

import { Button } from '@/components/ui';
import { createClient } from '@/lib/supabase/client';

/** Mirrors app/admin/_components/admin-sign-out-button.tsx exactly. */
export function SignOutButton() {
  const router = useRouter();

  async function handleClick() {
    const supabase = createClient();
    await supabase.auth.signOut();
    router.push('/login');
    router.refresh();
  }

  return (
    <Button type="button" variant="secondary" size="sm" onClick={handleClick}>
      Sign out
    </Button>
  );
}
