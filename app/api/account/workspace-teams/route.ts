import { NextRequest, NextResponse } from 'next/server';
import type { SupabaseClient } from '@supabase/supabase-js';
import { createClient } from '@/lib/supabase/server';
import { displayNameFromProfile, type ProfileRow } from '@/lib/account/profile-display';
import {
  resolveCustomerWorkspaceContext,
  teamsApiErrorForContext,
} from '@/lib/account/customer-workspace-context';
import { resolvePlatformRole } from '@/lib/auth/resolve-platform-role';
import { getWorkspaceBudgetSnapshot } from '@/lib/billing/workspace-budget';
import { fetchProjectsForTeamSpendRollups } from '@/lib/billing/projects-cost-query';
import { sumCommittedBalanceCents, sumUsedBalanceCents } from '@/lib/billing/project-balances';

async function fetchProfilesByUserIds(
  admin: SupabaseClient,
  userIds: string[]
): Promise<{ map: Map<string, ProfileRow>; error: { message: string } | null }> {
  const unique = [...new Set(userIds)].filter(Boolean);
  const map = new Map<string, ProfileRow>();
  if (unique.length === 0) return { map, error: null };

  const { data: rows, error } = await admin
    .from('profiles')
    .select('id, first_name, last_name, email')
    .in('id', unique);

  if (error) {
    console.error('[workspace-teams] profiles batch load failed:', error);
    return { map, error: { message: error.message } };
  }

  for (const row of rows ?? []) {
    map.set(row.id as string, row as ProfileRow);
  }
  return { map, error: null };
}

function majorToCents(value: unknown): number | null {
  if (value === undefined || value === null || value === '') return 0;
  const n = typeof value === 'number' ? value : Number(String(value).replace(',', '.'));
  if (!Number.isFinite(n) || n < 0) return null;
  return Math.round(n * 100);
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

    const platformRole = await resolvePlatformRole(supabase, user.id, user.user_metadata?.role);
    const context = await resolveCustomerWorkspaceContext(user.id);
    if ('error' in context) {
      const mapped = teamsApiErrorForContext(context, platformRole);
      return NextResponse.json({ error: mapped.error }, { status: mapped.status });
    }

    const { workspace, canManageMembers, admin } = context;

    const budget = await getWorkspaceBudgetSnapshot(admin, workspace.id);

    const { data: teamRows, error: teamsError } = await admin
      .from('workspace_teams')
      .select('id, name, description, budget_allocated_cents, created_at')
      .eq('workspace_id', workspace.id)
      .order('name', { ascending: true });

    if (teamsError) {
      return NextResponse.json({ error: teamsError.message }, { status: 500 });
    }

    const teams = teamRows ?? [];
    const teamIds = teams.map((t) => t.id);

    const memberByTeam = new Map<
      string,
      { user_id: string; name: string; email: string | null }[]
    >();

    let rosterRows: { team_id: string; user_id: string }[] = [];
    if (teamIds.length > 0) {
      const { data: roster, error: rosterError } = await admin
        .from('workspace_team_members')
        .select('team_id, user_id')
        .in('team_id', teamIds);

      if (rosterError) {
        return NextResponse.json({ error: rosterError.message }, { status: 500 });
      }
      rosterRows = (roster ?? []) as { team_id: string; user_id: string }[];
    }

    const rosterUserIds = rosterRows.map((r) => r.user_id);

    const { data: wmRows, error: wmError } = await admin
      .from('workspace_members')
      .select('user_id, role')
      .eq('workspace_id', workspace.id)
      .order('invited_at', { ascending: false });

    if (wmError) {
      return NextResponse.json({ error: wmError.message }, { status: 500 });
    }

    const wmUserIds = (wmRows ?? []).map((r) => r.user_id as string);
    const profileIds = [...new Set([...rosterUserIds, ...wmUserIds, workspace.owner_id])];
    const { map: profileMap, error: profilesError } = await fetchProfilesByUserIds(
      admin,
      profileIds
    );
    if (profilesError) {
      return NextResponse.json({ error: profilesError.message }, { status: 500 });
    }

    for (const row of rosterRows) {
      const tid = row.team_id;
      const uid = row.user_id;
      const p = profileMap.get(uid);
      const name = displayNameFromProfile(p);
      const list = memberByTeam.get(tid) ?? [];
      list.push({ user_id: uid, name, email: p?.email ?? null });
      memberByTeam.set(tid, list);
    }

    const workspaceMembers: {
      user_id: string;
      role: string;
      name: string;
      email: string | null;
    }[] = [];
    const seenWorkspaceMemberId = new Set<string>();
    for (const row of wmRows ?? []) {
      const uid = row.user_id as string;
      if (seenWorkspaceMemberId.has(uid)) continue;
      seenWorkspaceMemberId.add(uid);
      const p = profileMap.get(uid);
      workspaceMembers.push({
        user_id: uid,
        role: row.role as string,
        name: displayNameFromProfile(p),
        email: p?.email ?? null,
      });
    }

    const ownerInWorkspaceMembers = workspaceMembers.some((m) => m.user_id === workspace.owner_id);
    if (!ownerInWorkspaceMembers) {
      const op = profileMap.get(workspace.owner_id);
      workspaceMembers.unshift({
        user_id: workspace.owner_id,
        role: 'owner',
        name: displayNameFromProfile(op),
        email: op?.email ?? null,
      });
    }

    const totalAllocatedCents = teams.reduce((s, t) => s + Number(t.budget_allocated_cents || 0), 0);

    const spendByTeam = new Map<string, { used_cents: number; committed_cents: number }>();
    let teamSpendCostColumnMissing = false;
    if (teamIds.length > 0) {
      const rollup = await fetchProjectsForTeamSpendRollups(admin, workspace.id, teamIds);
      if (!rollup.ok) {
        return NextResponse.json({ error: rollup.message }, { status: 500 });
      }
      teamSpendCostColumnMissing = rollup.costColumnMissing;

      for (const tid of teamIds) {
        const list = rollup.byTeam.get(tid) ?? [];
        spendByTeam.set(tid, {
          used_cents: sumUsedBalanceCents(list),
          committed_cents: sumCommittedBalanceCents(list),
        });
      }
    }

    return NextResponse.json(
      {
        workspace: { id: workspace.id, name: workspace.name, owner_id: workspace.owner_id },
        team_spend_cost_column_missing: teamSpendCostColumnMissing,
        can_manage_teams: canManageMembers,
        budget: {
          currency: budget.currency,
          total_purchased_cents: budget.totalPurchasedCents,
          used_cents: budget.usedCents,
          committed_cents: budget.committedCents,
          available_cents: budget.availableCents,
        },
        total_allocated_cents: totalAllocatedCents,
        teams: teams.map((t) => {
          const spend = spendByTeam.get(t.id) ?? { used_cents: 0, committed_cents: 0 };
          const allocated = Number(t.budget_allocated_cents || 0);
          return {
            id: t.id,
            name: t.name,
            description: t.description,
            budget_allocated_cents: allocated,
            used_cents: spend.used_cents,
            committed_cents: spend.committed_cents,
            remaining_envelope_cents: allocated - spend.used_cents - spend.committed_cents,
            over_envelope: spend.used_cents + spend.committed_cents > allocated,
            created_at: t.created_at,
            members: memberByTeam.get(t.id) ?? [],
          };
        }),
        workspace_members: workspaceMembers,
      },
      { status: 200 }
    );
  } catch (e) {
    console.error('[workspace-teams] GET failed:', e);
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

    const platformRole = await resolvePlatformRole(supabase, user.id, user.user_metadata?.role);
    const context = await resolveCustomerWorkspaceContext(user.id);
    if ('error' in context) {
      const mapped = teamsApiErrorForContext(context, platformRole);
      return NextResponse.json({ error: mapped.error }, { status: mapped.status });
    }

    if (!context.canManageMembers) {
      return NextResponse.json(
        { error: 'Only workspace owners and admins can create teams' },
        { status: 403 }
      );
    }

    const body = await request.json().catch(() => ({}));
    const name = typeof body?.name === 'string' ? body.name.trim() : '';
    const description =
      typeof body?.description === 'string' && body.description.trim()
        ? body.description.trim()
        : null;

    if (!name) {
      return NextResponse.json({ error: 'Team name is required' }, { status: 400 });
    }

    const cents = majorToCents(body?.budget_allocated);
    if (cents === null) {
      return NextResponse.json({ error: 'Invalid budget amount' }, { status: 400 });
    }

    const { workspace, admin } = context;

    const budget = await getWorkspaceBudgetSnapshot(admin, workspace.id);

    const { data: existingTeams, error: sumError } = await admin
      .from('workspace_teams')
      .select('budget_allocated_cents')
      .eq('workspace_id', workspace.id);

    if (sumError) {
      return NextResponse.json({ error: sumError.message }, { status: 500 });
    }

    const currentSum = (existingTeams ?? []).reduce(
      (s, r) => s + Number(r.budget_allocated_cents || 0),
      0
    );

    if (currentSum + cents > budget.availableCents) {
      return NextResponse.json(
        {
          error:
            'Total team budgets cannot exceed your workspace available balance. Reduce allocations or free up budget from committed projects first.',
        },
        { status: 400 }
      );
    }

    const { data: created, error: insertError } = await admin
      .from('workspace_teams')
      .insert({
        workspace_id: workspace.id,
        name,
        description,
        budget_allocated_cents: cents,
      })
      .select('id, name, description, budget_allocated_cents, created_at')
      .single();

    if (insertError) {
      return NextResponse.json({ error: insertError.message }, { status: 500 });
    }

    return NextResponse.json({ team: created }, { status: 201 });
  } catch (e) {
    console.error('[workspace-teams] POST failed:', e);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
