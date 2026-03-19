import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { createServiceRoleClient } from '@/lib/supabase/admin';
import { resolvePlatformRole } from '@/lib/auth/resolve-platform-role';
import { isAdmin, normalizePlatformRole, platformRoleToMetadataRole, type PlatformRole } from '@/lib/auth/platform-role';

const ALLOWED: PlatformRole[] = ['customer', 'consultant', 'project_manager', 'admin'];

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ userId: string }> }
) {
  try {
    const { userId } = await params;
    const supabase = await createClient();
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const actorRole = await resolvePlatformRole(supabase, user.id, user.user_metadata?.role);
    if (!isAdmin(actorRole)) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const body = await request.json();
    const rawRole = typeof body?.role === 'string' ? body.role : '';
    const role = normalizePlatformRole(rawRole);
    if (!ALLOWED.includes(role)) {
      return NextResponse.json({ error: 'Invalid role' }, { status: 400 });
    }

    const admin = createServiceRoleClient();

    const { error: upsertError } = await admin.from('user_platform_roles').upsert(
      {
        user_id: userId,
        role,
        updated_at: new Date().toISOString(),
      },
      { onConflict: 'user_id' }
    );

    if (upsertError) {
      console.error('[admin/platform-role] upsert failed:', upsertError);
      return NextResponse.json({ error: upsertError.message }, { status: 500 });
    }

    const { error: metaError } = await admin.auth.admin.updateUserById(userId, {
      user_metadata: { role: platformRoleToMetadataRole(role) },
    });

    if (metaError) {
      console.error('[admin/platform-role] metadata sync failed:', metaError);
      return NextResponse.json(
        { error: 'Role saved but failed to sync login session metadata; user may need to sign out and back in.' },
        { status: 500 }
      );
    }

    return NextResponse.json({ success: true, role }, { status: 200 });
  } catch (e) {
    console.error('[admin/platform-role] PATCH failed:', e);
    const message = e instanceof Error ? e.message : 'Internal error';
    if (message.includes('SUPABASE_SERVICE_ROLE_KEY')) {
      return NextResponse.json(
        { error: 'Server is missing SUPABASE_SERVICE_ROLE_KEY for admin user updates.' },
        { status: 503 }
      );
    }
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
