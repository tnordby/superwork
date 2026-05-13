/**
 * Builds the Supabase OAuth redirect URL (PKCE callback).
 * Must match a URL allowlisted in Supabase Dashboard → Authentication → URL configuration.
 */
export function buildOAuthCallbackUrl(origin: string, nextPath: string): string {
  const base = origin.replace(/\/$/, '');
  const path = nextPath.startsWith('/') ? nextPath : '/';
  const url = new URL('/auth/callback', base);
  url.searchParams.set('next', path);
  return url.toString();
}

export function browserOriginForOAuth(): string {
  if (typeof window !== 'undefined') {
    return window.location.origin;
  }
  return process.env.NEXT_PUBLIC_APP_URL?.replace(/\/$/, '') ?? '';
}
