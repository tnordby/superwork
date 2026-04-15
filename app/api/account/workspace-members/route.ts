import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { resolveCustomerWorkspaceContext } from '@/lib/account/customer-workspace-context';

type WorkspaceMembershipRole = 'owner' | 'admin' | 'member' | 'consultant' | 'client' | 'viewer';

type MemberRow = {
  user_id: string;
  role: WorkspaceMembershipRole;
  invited_at: string;
  accepted_at: string | null;
};

type ProfileRow = {
  id: string;
  first_name: string | null;
  last_name: string | null;
  email: string | null;
};

type MemberResponseRow = {
  user_id: string;
  role: WorkspaceMembershipRole;
  invited_at: string;
  accepted_at: string | null;
  name: string;
  email: string | null;
};

function normalizeEmail(value: unknown): string {
  return typeof value === 'string' ? value.trim().toLowerCase() : '';
}

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

    const context = await resolveCustomerWorkspaceContext(user.id);
    if ('error' in context) {
      return NextResponse.json({ error: context.error }, { status: context.status });
    }

    const { admin, workspace, actorRole, canManageMembers } = context;

    const { data: members, error: membersError } = await admin
      .from('workspace_members')
      .select('user_id, role, invited_at, accepted_at')
      .eq('workspace_id', workspace.id)
      .order('invited_at', { ascending: false });

    if (membersError) {
      return NextResponse.json({ error: membersError.message }, { status: 500 });
    }

    const memberRows = (members || []) as unknown as MemberRow[];
    const memberIds = memberRows.map((member) => member.user_id).filter(Boolean);
    const profilesById = new Map<string, ProfileRow>();

    if (memberIds.length > 0) {
      const { data: profiles, error: profilesError } = await admin
        .from('profiles')
        .select('id, first_name, last_name, email')
        .in('id', memberIds);

      if (profilesError) {
        return NextResponse.json({ error: profilesError.message }, { status: 500 });
      }

      for (const profile of (profiles || []) as ProfileRow[]) {
        profilesById.set(profile.id, profile);
      }
    }

    const rows: MemberResponseRow[] = memberRows.map((member) => {
      const profile = profilesById.get(member.user_id) ?? null;
      const first = profile?.first_name?.trim() || '';
      const last = profile?.last_name?.trim() || '';
      const fullName = `${first} ${last}`.trim();
      return {
        user_id: member.user_id,
        role: member.role,
        invited_at: member.invited_at,
        accepted_at: member.accepted_at,
        name: fullName || profile?.email || 'Unknown user',
        email: profile?.email || null,
      };
    });

    return NextResponse.json(
      {
        workspace: { id: workspace.id, name: workspace.name },
        actor_role: actorRole,
        can_manage_members: canManageMembers,
        members: rows,
      },
      { status: 200 }
    );
  } catch (error) {
    console.error('[workspace-members] GET failed:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient();
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const context = await resolveCustomerWorkspaceContext(user.id);
    if ('error' in context) {
      return NextResponse.json({ error: context.error }, { status: context.status });
    }

    if (!context.canManageMembers) {
      return NextResponse.json(
        { error: 'Only workspace admins can invite colleagues' },
        { status: 403 }
      );
    }

    const body = await request.json().catch(() => ({}));
    const email = normalizeEmail(body?.email);
    const requestedRole =
      typeof body?.role === 'string' && body.role.trim() ? body.role.trim() : 'member';
    const role = (['admin', 'member', 'viewer'] as const).includes(
      requestedRole as 'admin' | 'member' | 'viewer'
    )
      ? (requestedRole as 'admin' | 'member' | 'viewer')
      : 'member';

    if (!email) {
      return NextResponse.json({ error: 'Email is required' }, { status: 400 });
    }

    const { admin, workspace } = context;

    const { data: profile, error: profileError } = await admin
      .from('profiles')
      .select('id, email')
      .eq('email', email)
      .maybeSingle();

    if (profileError) {
      return NextResponse.json({ error: profileError.message }, { status: 500 });
    }

    if (!profile?.id) {
      return NextResponse.json(
        { error: 'No user found with that email. Ask them to create an account first.' },
        { status: 400 }
      );
    }

    const { error: upsertError } = await admin.from('workspace_members').upsert(
      {
        workspace_id: workspace.id,
        user_id: profile.id,
        role,
        invited_by: user.id,
        invited_at: new Date().toISOString(),
      },
      { onConflict: 'workspace_id,user_id' }
    );

    if (upsertError) {
      return NextResponse.json({ error: upsertError.message }, { status: 500 });
    }

    return NextResponse.json({ success: true }, { status: 200 });
  } catch (error) {
    console.error('[workspace-members] POST failed:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
