import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import {
  resolveCustomerWorkspaceContext,
  teamsApiErrorForContext,
} from '@/lib/account/customer-workspace-context';
import { resolvePlatformRole } from '@/lib/auth/resolve-platform-role';
import { getWorkspaceBudgetSnapshot } from '@/lib/billing/workspace-budget';
import { fetchProjectCostRowsForTeamId } from '@/lib/billing/projects-cost-query';
import { sumCommittedBalanceCents, sumUsedBalanceCents } from '@/lib/billing/project-balances';

function majorToCents(value: unknown): number | null {
  if (value === undefined || value === null || value === '') return 0;
  const n = typeof value === 'number' ? value : Number(String(value).replace(',', '.'));
  if (!Number.isFinite(n) || n < 0) return null;
  return Math.round(n * 100);
}

type RouteContext = { params: Promise<{ teamId: string }> };

export async function PATCH(request: NextRequest, context: RouteContext) {
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

    const { data: existing, error: loadError } = await admin
      .from('workspace_teams')
      .select('id, workspace_id, name, description, budget_allocated_cents')
      .eq('id', teamId)
      .maybeSingle();

    if (loadError) {
      return NextResponse.json({ error: loadError.message }, { status: 500 });
    }
    if (!existing || existing.workspace_id !== workspace.id) {
      return NextResponse.json({ error: 'Team not found' }, { status: 404 });
    }

    const body = await request.json().catch(() => ({}));
    const name =
      typeof body?.name === 'string' ? body.name.trim() : (existing.name as string);
    const description =
      body?.description === undefined
        ? (existing.description as string | null)
        : typeof body?.description === 'string' && body.description.trim()
          ? body.description.trim()
          : null;

    let budgetCents = Number(existing.budget_allocated_cents || 0);
    if (body?.budget_allocated !== undefined) {
      const parsed = majorToCents(body.budget_allocated);
      if (parsed === null) {
        return NextResponse.json({ error: 'Invalid budget amount' }, { status: 400 });
      }
      budgetCents = parsed;
    }

    if (!name) {
      return NextResponse.json({ error: 'Team name is required' }, { status: 400 });
    }

    const budget = await getWorkspaceBudgetSnapshot(admin, workspace.id);

    const { data: otherTeams, error: sumError } = await admin
      .from('workspace_teams')
      .select('id, budget_allocated_cents')
      .eq('workspace_id', workspace.id)
      .neq('id', teamId);

    if (sumError) {
      return NextResponse.json({ error: sumError.message }, { status: 500 });
    }

    const sumOthers = (otherTeams ?? []).reduce(
      (s, r) => s + Number(r.budget_allocated_cents || 0),
      0
    );

    if (sumOthers + budgetCents > budget.availableCents) {
      return NextResponse.json(
        {
          error:
            'Total team budgets cannot exceed your workspace available balance. Reduce allocations or free up budget from committed projects first.',
        },
        { status: 400 }
      );
    }

    const teamProjects = await fetchProjectCostRowsForTeamId(admin, teamId);
    if (!teamProjects.ok) {
      return NextResponse.json({ error: teamProjects.message }, { status: 500 });
    }

    const attributedSpendCents =
      sumUsedBalanceCents(teamProjects.rows) + sumCommittedBalanceCents(teamProjects.rows);
    if (budgetCents < attributedSpendCents) {
      return NextResponse.json(
        {
          error:
            'Team budget cannot be lower than used and committed totals already linked to this team. Raise the budget, or change the team on those projects first.',
        },
        { status: 400 }
      );
    }

    const { data: updated, error: updateError } = await admin
      .from('workspace_teams')
      .update({
        name,
        description,
        budget_allocated_cents: budgetCents,
      })
      .eq('id', teamId)
      .select('id, name, description, budget_allocated_cents, created_at, updated_at')
      .single();

    if (updateError) {
      return NextResponse.json({ error: updateError.message }, { status: 500 });
    }

    return NextResponse.json({ team: updated }, { status: 200 });
  } catch (e) {
    console.error('[workspace-teams teamId] PATCH failed:', e);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function DELETE(_request: NextRequest, context: RouteContext) {
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

    const { data: existing, error: loadError } = await admin
      .from('workspace_teams')
      .select('id, workspace_id')
      .eq('id', teamId)
      .maybeSingle();

    if (loadError) {
      return NextResponse.json({ error: loadError.message }, { status: 500 });
    }
    if (!existing || existing.workspace_id !== workspace.id) {
      return NextResponse.json({ error: 'Team not found' }, { status: 404 });
    }

    const { count: linkedProjectCount, error: countError } = await admin
      .from('projects')
      .select('id', { count: 'exact', head: true })
      .eq('team_id', teamId);

    if (countError) {
      return NextResponse.json({ error: countError.message }, { status: 500 });
    }

    if ((linkedProjectCount ?? 0) > 0) {
      return NextResponse.json(
        {
          error:
            'This team still has projects linked for usage and budget tracking. Change or clear the team on those projects before deleting it.',
        },
        { status: 400 }
      );
    }

    const { error: delError } = await admin.from('workspace_teams').delete().eq('id', teamId);

    if (delError) {
      return NextResponse.json({ error: delError.message }, { status: 500 });
    }

    return NextResponse.json({ success: true }, { status: 200 });
  } catch (e) {
    console.error('[workspace-teams teamId] DELETE failed:', e);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
