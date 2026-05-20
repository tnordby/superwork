'use client';

import { useEffect } from 'react';
import { usePathname, useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
import { DEFAULT_POST_AUTH_PATH } from '@/lib/auth/post-auth-path';

const AUTH_ENTRY_PATHS = ['/login', '/signup'];

/**
 * If the user already has a session (e.g. after OAuth cookies are set), leave login/signup for the dashboard.
 */
export function RedirectIfAuthenticated() {
  const pathname = usePathname();
  const router = useRouter();

  useEffect(() => {
    if (!AUTH_ENTRY_PATHS.some((p) => pathname.startsWith(p))) return;

    const supabase = createClient();
    void supabase.auth.getSession().then(({ data: { session } }) => {
      if (session?.user) {
        router.replace(DEFAULT_POST_AUTH_PATH);
        router.refresh();
      }
    });
  }, [pathname, router]);

  return null;
}
