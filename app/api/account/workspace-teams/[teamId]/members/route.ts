import { NextRequest, NextResponse } from 'next/server';
import type { SupabaseClient } from '@supabase/supabase-js';
import { createClient } from '@/lib/supabase/server';
import {
  resolveCustomerWorkspaceContext,
  teamsApiErrorForContext,
} from '@/lib/account/customer-workspace-context';
import { resolvePlatformRole } from '@/lib/auth/resolve-platform-role';

async function isEligibleWorkspaceUser(
  admin: SupabaseClient,
  workspaceId: string,
  ownerId: string,
  userId: string
): Promise<boolean> {
  if (userId === ownerId) return true;
  const { data: row } = await admin
    .from('workspace_members')
    .select('user_id')
    .eq('workspace_id', workspaceId)
    .eq('user_id', userId)
    .maybeSingle();
  return Boolean(row);
}

type RouteContext = { params: Promise<{ teamId: string }> };

export async function POST(request: NextRequest, context: RouteContext) {
  try {
    const { teamId } = await context.params;
    const supabase = await createClient();
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const platformRole = await resolvePlatformRole(supabase, user.id, user.user_metadata?.role);
    const wsContext = await resolveCustomerWorkspaceContext(user.id);
    if ('error' in wsContext) {
      const mapped = teamsApiErrorForContext(wsContext, platformRole);
      return NextResponse.json({ error: mapped.error }, { status: mapped.status });
    }

    if (!wsContext.canManageMembers) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const { workspace, admin } = wsContext;

    const { data: team, error: teamError } = await admin
      .from('workspace_teams')
      .select('id, workspace_id')
      .eq('id', teamId)
      .maybeSingle();

    if (teamError) {
      return NextResponse.json({ error: teamError.message }, { status: 500 });
    }
    if (!team || team.workspace_id !== workspace.id) {
      return NextResponse.json({ error: 'Team not found' }, { status: 404 });
    }

    const body = await request.json().catch(() => ({}));
    const memberUserId = typeof body?.user_id === 'string' ? body.user_id.trim() : '';
    if (!memberUserId) {
      return NextResponse.json({ error: 'user_id is required' }, { status: 400 });
    }

    const eligible = await isEligibleWorkspaceUser(
      admin,
      workspace.id,
      workspace.owner_id,
      memberUserId
    );
    if (!eligible) {
      return NextResponse.json(
        {
          error:
            'Only people already in this workspace can be added to a team. Invite them under Members first.',
        },
        { status: 400 }
      );
    }

    const { error: insertError } = await admin.from('workspace_team_members').insert({
      team_id: teamId,
      user_id: memberUserId,
      added_by_user_id: user.id,
    });

    if (insertError) {
      if (insertError.code === '23505') {
        return NextResponse.json({ error: 'That person is already on this team' }, { status: 409 });
      }
      return NextResponse.json({ error: insertError.message }, { status: 500 });
    }

    return NextResponse.json({ success: true }, { status: 201 });
  } catch (e) {
    console.error('[workspace-teams members] POST failed:', e);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function DELETE(request: NextRequest, context: RouteContext) {
  try {
    const { teamId } = await context.params;
    const memberUserId = request.nextUrl.searchParams.get('user_id')?.trim() || '';
    if (!memberUserId) {
      return NextResponse.json({ error: 'user_id query parameter is required' }, { status: 400 });
    }

    const supabase = await createClient();
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const platformRole = await resolvePlatformRole(supabase, user.id, user.user_metadata?.role);
    const wsContext = await resolveCustomerWorkspaceContext(user.id);
    if ('error' in wsContext) {
      const mapped = teamsApiErrorForContext(wsContext, platformRole);
      return NextResponse.json({ error: mapped.error }, { status: mapped.status });
    }

    if (!wsContext.canManageMembers) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const { workspace, admin } = wsContext;

    const { data: team, error: teamError } = await admin
      .from('workspace_teams')
      .select('id, workspace_id')
      .eq('id', teamId)
      .maybeSingle();

    if (teamError) {
      return NextResponse.json({ error: teamError.message }, { status: 500 });
    }
    if (!team || team.workspace_id !== workspace.id) {
      return NextResponse.json({ error: 'Team not found' }, { status: 404 });
    }

    const { error: delError } = await admin
      .from('workspace_team_members')
      .delete()
      .eq('team_id', teamId)
      .eq('user_id', memberUserId);

    if (delError) {
      return NextResponse.json({ error: delError.message }, { status: 500 });
    }

    return NextResponse.json({ success: true }, { status: 200 });
  } catch (e) {
    console.error('[workspace-teams members] DELETE failed:', e);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
