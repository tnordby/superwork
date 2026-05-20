import { createServerClient } from '@supabase/ssr';
import { NextResponse, type NextRequest } from 'next/server';
import { DEFAULT_POST_AUTH_PATH } from '@/lib/auth/post-auth-path';
import { hasSupabaseAuthSession } from '@/lib/supabase/session-cookies';

/** PKCE code landed on Site URL root (misconfigured Supabase) — forward to our callback route. */
function redirectOAuthCodeToCallback(request: NextRequest): NextResponse | null {
  const code = request.nextUrl.searchParams.get('code');
  if (!code || request.nextUrl.pathname.startsWith('/auth/callback')) {
    return null;
  }

  const url = request.nextUrl.clone();
  url.pathname = '/auth/callback';
  if (!url.searchParams.has('next')) {
    const next =
      request.nextUrl.pathname === '/' || request.nextUrl.pathname === ''
        ? DEFAULT_POST_AUTH_PATH
        : `${request.nextUrl.pathname}${request.nextUrl.search}`;
    url.searchParams.set('next', next);
  }
  return NextResponse.redirect(url);
}

const AUTH_ENTRY_PREFIXES = ['/login', '/signup'] as const;

function isAuthEntryPath(pathname: string): boolean {
  return AUTH_ENTRY_PREFIXES.some((p) => pathname.startsWith(p));
}

function isPublicPath(pathname: string): boolean {
  return (
    isAuthEntryPath(pathname) ||
    pathname.startsWith('/auth') ||
    pathname.startsWith('/api/')
  );
}

export async function updateSession(request: NextRequest) {
  const oauthRedirect = redirectOAuthCodeToCallback(request);
  if (oauthRedirect) {
    return oauthRedirect;
  }

  let supabaseResponse = NextResponse.next({
    request,
  });

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet) {
          supabaseResponse = NextResponse.next({
            request,
          });
          cookiesToSet.forEach(({ name, value, options }) => {
            supabaseResponse.cookies.set(name, value, options);
          });
        },
      },
    }
  );

  const {
    data: { user },
  } = await supabase.auth.getUser();

  const {
    data: { session },
  } = await supabase.auth.getSession();

  const hasSession = !!user || !!session || hasSupabaseAuthSession(request);

  if (!hasSession && !isPublicPath(request.nextUrl.pathname)) {
    const url = request.nextUrl.clone();
    url.pathname = '/login';
    return NextResponse.redirect(url);
  }

  if (hasSession && isAuthEntryPath(request.nextUrl.pathname)) {
    const url = request.nextUrl.clone();
    url.pathname = DEFAULT_POST_AUTH_PATH;
    return NextResponse.redirect(url);
  }

  return supabaseResponse;
}
