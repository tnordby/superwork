import type { NextRequest } from 'next/server';

/** Session cookies: `sb-<ref>-auth-token` or chunked `sb-<ref>-auth-token.0` (not `…-code-verifier`). */
const SESSION_COOKIE_NAME = /^sb-.+-auth-token(\.\d+)?$/;

export function hasSupabaseAuthSession(request: NextRequest): boolean {
  return request.cookies.getAll().some(
    (cookie) => SESSION_COOKIE_NAME.test(cookie.name) && cookie.value.length > 0
  );
}
