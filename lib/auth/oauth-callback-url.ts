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

/**
 * Origin used in signInWithOAuth redirectTo. Prefer the browser host so production
 * is correct even when NEXT_PUBLIC_APP_URL was left as localhost in hosting env.
 */
export function browserOriginForOAuth(): string {
  const envOrigin = process.env.NEXT_PUBLIC_APP_URL?.replace(/\/$/, '') ?? '';

  if (typeof window === 'undefined') {
    return envOrigin;
  }

  const windowOrigin = window.location.origin;
  if (!envOrigin) return windowOrigin;

  const envIsLocal = envOrigin.includes('localhost') || envOrigin.includes('127.0.0.1');
  const windowIsLocal = windowOrigin.includes('localhost') || windowOrigin.includes('127.0.0.1');
  if (envIsLocal && !windowIsLocal) {
    return windowOrigin;
  }

  return windowOrigin;
}
