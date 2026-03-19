import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { createServiceRoleClient } from '@/lib/supabase/admin';
import { resolvePlatformRole } from '@/lib/auth/resolve-platform-role';
import { isAdmin, normalizePlatformRole } from '@/lib/auth/platform-role';

export async function GET() {
  try {
    const supabase = await createClient();
    const {
      data: { user },
      error,
    } = await supabase.auth.getUser();

    if (error || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const actorRole = await resolvePlatformRole(supabase, user.id, user.user_metadata?.role);
    if (!isAdmin(actorRole)) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const admin = createServiceRoleClient();
    const { data: listData, error: listError } = await admin.auth.admin.listUsers({
      page: 1,
      perPage: 200,
    });

    if (listError) {
      return NextResponse.json({ error: listError.message }, { status: 500 });
    }

    const ids = listData.users.map((u) => u.id);
    const { data: roleRows } = await admin.from('user_platform_roles').select('user_id, role').in('user_id', ids);

    const roleByUser = new Map((roleRows ?? []).map((r) => [r.user_id as string, r.role as string]));

    const users = listData.users.map((u) => {
      const fromTable = roleByUser.get(u.id);
      const effective = normalizePlatformRole(fromTable ?? (u.user_metadata?.role as string | undefined));
      return {
        id: u.id,
        email: u.email ?? '',
        effectiveRole: effective,
      };
    });

    return NextResponse.json({ users }, { status: 200 });
  } catch (e) {
    console.error('[admin/users] GET failed:', e);
    const message = e instanceof Error ? e.message : 'Internal error';
    if (message.includes('SUPABASE_SERVICE_ROLE_KEY')) {
      return NextResponse.json(
        { error: 'Server is missing SUPABASE_SERVICE_ROLE_KEY to list users.' },
        { status: 503 }
      );
    }
    return NextResponse.json({ error: 'Failed to list users' }, { status: 500 });
  }
}
