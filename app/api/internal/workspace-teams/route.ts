import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { resolvePlatformRole } from '@/lib/auth/resolve-platform-role';
import { isInternalStaff } from '@/lib/auth/platform-role';
import { readSelectedWorkspaceIdFromRequest } from '@/lib/internal/client-context';
import { tryCreateServiceRoleClient } from '@/lib/supabase/admin';

/**
 * Lists workspace_teams for a client workspace. Internal-only; workspace_id must match the
 * selected client cookie so providers can assign projects.team_id on the project detail page.
 */
export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient();
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const platformRole = await resolvePlatformRole(supabase, user.id, user.user_metadata?.role);
    if (!isInternalStaff(platformRole)) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const workspaceId = request.nextUrl.searchParams.get('workspace_id')?.trim() || '';
    if (!workspaceId) {
      return NextResponse.json({ error: 'workspace_id query parameter is required' }, { status: 400 });
    }

    const selectedWorkspaceId = readSelectedWorkspaceIdFromRequest(request);
    if (!selectedWorkspaceId || selectedWorkspaceId !== workspaceId) {
      return NextResponse.json(
        { error: 'Workspace does not match the selected client in the sidebar.' },
        { status: 403 }
      );
    }

    const admin = tryCreateServiceRoleClient();
    if (!admin) {
      return NextResponse.json(
        { error: 'Server is missing service role configuration for this operation.' },
        { status: 503 }
      );
    }

    const { data: workspace, error: wsError } = await admin
      .from('workspaces')
      .select('id, type')
      .eq('id', workspaceId)
      .maybeSingle();

    if (wsError) {
      return NextResponse.json({ error: wsError.message }, { status: 500 });
    }
    if (!workspace || workspace.type !== 'client') {
      return NextResponse.json({ error: 'Client workspace not found' }, { status: 404 });
    }

    const { data: teams, error: teamsError } = await admin
      .from('workspace_teams')
      .select('id, name')
      .eq('workspace_id', workspaceId)
      .order('name', { ascending: true });

    if (teamsError) {
      return NextResponse.json({ error: teamsError.message }, { status: 500 });
    }

    return NextResponse.json({ teams: teams ?? [] }, { status: 200 });
  } catch (e) {
    console.error('[internal/workspace-teams] GET failed:', e);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
