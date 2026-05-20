'use client';

import { useEffect, useRef, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
import { isBlockedSignupEmailDomain } from '@/lib/auth/blocked-signup-email-domains';
import { DEFAULT_POST_AUTH_PATH } from '@/lib/auth/post-auth-path';

function safeNextPath(raw: string | null): string {
  if (!raw || !raw.startsWith('/') || raw.startsWith('//')) {
    return DEFAULT_POST_AUTH_PATH;
  }
  return raw;
}

export function AuthCallbackClient() {
  const searchParams = useSearchParams();
  const [message, setMessage] = useState('Signing you in…');
  const started = useRef(false);

  useEffect(() => {
    if (started.current) return;
    started.current = true;

    async function completeSignIn() {
      const code = searchParams.get('code');
      const nextPath = safeNextPath(searchParams.get('next'));

      if (!code) {
        window.location.replace('/login?error=oauth');
        return;
      }

      const supabase = createClient();
      const { data, error } = await supabase.auth.exchangeCodeForSession(code);

      if (error || !data.session) {
        console.error('[auth/callback] exchangeCodeForSession failed:', error?.message);
        window.location.replace('/login?error=oauth');
        return;
      }

      const email = data.session.user.email ?? '';
      if (email && isBlockedSignupEmailDomain(email)) {
        await supabase.auth.signOut();
        window.location.replace('/signup?error=work-email');
        return;
      }

      setMessage('Redirecting to your dashboard…');
      window.location.replace(nextPath);
    }

    void completeSignIn();
  }, [searchParams]);

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 px-4">
      <p className="text-sm text-gray-600">{message}</p>
    </div>
  );
}
