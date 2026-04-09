import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { createServiceRoleClient } from '@/lib/supabase/admin';
import { resolvePlatformRole } from '@/lib/auth/resolve-platform-role';
import { isInternalStaff } from '@/lib/auth/platform-role';

export async function GET() {
  try {
    const supabase = await createClient();
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const role = await resolvePlatformRole(supabase, user.id, user.user_metadata?.role);
    if (!isInternalStaff(role)) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    let db: ReturnType<typeof createServiceRoleClient> | typeof supabase;
    try {
      db = createServiceRoleClient();
    } catch {
      db = supabase;
    }

    const { data, error } = await db
      .from('workspaces')
      .select('id, name')
      .eq('type', 'client')
      .order('name', { ascending: true });

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json(
      {
        customers: (data || []).map((w: { id: string; name: string | null }) => ({
          id: w.id,
          name: w.name || 'Customer',
        })),
      },
      { status: 200 }
    );
  } catch (error) {
    console.error('[internal/customer-workspaces] GET failed:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

