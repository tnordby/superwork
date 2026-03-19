import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { resolvePlatformRole } from '@/lib/auth/resolve-platform-role';
export async function GET() {
  try {
    const supabase = await createClient();
    const {
      data: { user },
      error,
    } = await supabase.auth.getUser();

    if (error || !user) {
      return NextResponse.json({ role: null }, { status: 401 });
    }

    const role = await resolvePlatformRole(supabase, user.id, user.user_metadata?.role);

    return NextResponse.json({ role }, { status: 200 });
  } catch (e) {
    console.error('[me/platform-role] GET failed:', e);
    return NextResponse.json({ error: 'Failed to resolve role' }, { status: 500 });
  }
}
