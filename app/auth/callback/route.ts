import { type NextRequest, NextResponse } from 'next/server';
import { createServerClient } from '@supabase/ssr';
import { cookies } from 'next/headers';
import { isBlockedSignupEmailDomain } from '@/lib/auth/blocked-signup-email-domains';

function safeNextPath(raw: string | null): string {
  if (!raw || !raw.startsWith('/') || raw.startsWith('//')) {
    return '/';
  }
  return raw;
}

export async function GET(request: NextRequest) {
  const url = new URL(request.url);
  const code = url.searchParams.get('code');
  const nextPath = safeNextPath(url.searchParams.get('next'));

  const cookieStore = await cookies();

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll();
        },
        setAll(cookiesToSet) {
          try {
            cookiesToSet.forEach(({ name, value, options }) => {
              cookieStore.set(name, value, options);
            });
          } catch {
            // ignore when called from non-mutable context
          }
        },
      },
    }
  );

  if (!code) {
    const login = new URL('/login', url.origin);
    login.searchParams.set('error', 'oauth');
    return NextResponse.redirect(login);
  }

  const { error: exchangeError } = await supabase.auth.exchangeCodeForSession(code);
  if (exchangeError) {
    const login = new URL('/login', url.origin);
    login.searchParams.set('error', 'oauth');
    return NextResponse.redirect(login);
  }

  const {
    data: { user },
  } = await supabase.auth.getUser();
  const email = user?.email ?? null;

  if (email && isBlockedSignupEmailDomain(email)) {
    await supabase.auth.signOut();
    const signup = new URL('/signup', url.origin);
    signup.searchParams.set('error', 'work-email');
    return NextResponse.redirect(signup);
  }

  return NextResponse.redirect(new URL(nextPath, url.origin));
}
