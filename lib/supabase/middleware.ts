import { NextResponse, type NextRequest } from 'next/server';

export async function updateSession(request: NextRequest) {
  const supabaseResponse = NextResponse.next({
    request,
  });

  // Check for auth session cookies instead of making network requests
  // This avoids fetch failures in Edge Runtime
  const accessToken = request.cookies.get('sb-gekhzcrvszhsisesgwpy-auth-token')?.value;
  const hasSession = !!accessToken;

  // Protect routes - redirect to login if not authenticated
  // Skip redirect for API routes - they handle auth internally
  if (
    !hasSession &&
    !request.nextUrl.pathname.startsWith('/login') &&
    !request.nextUrl.pathname.startsWith('/signup') &&
    !request.nextUrl.pathname.startsWith('/auth') &&
    !request.nextUrl.pathname.startsWith('/api/')
  ) {
    const url = request.nextUrl.clone();
    url.pathname = '/login';
    return NextResponse.redirect(url);
  }

  // Redirect to home if already logged in and trying to access login/signup
  if (hasSession && (request.nextUrl.pathname.startsWith('/login') || request.nextUrl.pathname.startsWith('/signup'))) {
    const url = request.nextUrl.clone();
    url.pathname = '/';
    return NextResponse.redirect(url);
  }

  return supabaseResponse;
}
