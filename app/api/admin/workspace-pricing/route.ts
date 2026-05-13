import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { createServiceRoleClient } from '@/lib/supabase/admin';
import { resolvePlatformRole } from '@/lib/auth/resolve-platform-role';
import { isAdmin } from '@/lib/auth/platform-role';

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
    const { data: workspaces, error: wsError } = await admin
      .from('workspaces')
      .select('id, name, type, stripe_subscription_id, stripe_subscription_status')
      .eq('type', 'client')
      .order('name', { ascending: true })
      .limit(200);

    if (wsError) {
      return NextResponse.json({ error: wsError.message }, { status: 500 });
    }

    const list = workspaces ?? [];
    const ids = list.map((w) => w.id);
    const { data: termRows } =
      ids.length > 0
        ? await admin.from('workspace_plan_terms').select('*').in('workspace_id', ids)
        : { data: [] as unknown[] };

    const termsByWorkspace = new Map(
      (termRows ?? []).map((row) => [(row as { workspace_id: string }).workspace_id, row])
    );

    const rows = list.map((w) => ({
      ...w,
      planTerms: termsByWorkspace.get(w.id) ?? null,
    }));

    return NextResponse.json({ rows });
  } catch (e) {
    console.error('[admin/workspace-pricing]', e);
    return NextResponse.json({ error: 'Failed to load workspace pricing' }, { status: 500 });
  }
}
