import { NextResponse } from 'next/server';
import type { User } from '@supabase/supabase-js';
import type { createClient } from '@/lib/supabase/server';

type ServerSupabaseClient = Awaited<ReturnType<typeof createClient>>;

export async function requireAuthenticatedUser(supabase: ServerSupabaseClient): Promise<
  { user: User; errorResponse: null } | { user: null; errorResponse: NextResponse }
> {
  const {
    data: { user },
    error,
  } = await supabase.auth.getUser();

  if (error || !user) {
    return {
      user: null,
      errorResponse: NextResponse.json({ error: 'Unauthorized' }, { status: 401 }),
    };
  }

  return { user, errorResponse: null };
}

export function requireRole(
  user: User,
  allowedRoles: string[]
): NextResponse | null {
  const userRole = user.user_metadata?.role;
  if (!allowedRoles.includes(userRole)) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  return null;
}
