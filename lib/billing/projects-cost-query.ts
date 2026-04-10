import type { SupabaseClient } from '@supabase/supabase-js';
import type { ProjectCostRow } from '@/lib/billing/project-balances';

function isMissingCostColumnError(error: { message?: string; code?: string } | null | undefined): boolean {
  if (!error?.message) return false;
  const msg = error.message.toLowerCase();
  if (error.code === '42703') return true;
  if (msg.includes('schema cache') && msg.includes('cost')) return true;
  return msg.includes('cost') && (msg.includes('does not exist') || msg.includes('undefined column'));
}

/**
 * Loads projects for team spend rollups. If `projects.cost` is missing (migration not applied / cache),
 * falls back to `cost = 0` so customer UI still loads.
 */
export async function fetchProjectsForTeamSpendRollups(
  admin: SupabaseClient,
  workspaceId: string,
  teamIds: string[]
): Promise<
  | { ok: true; byTeam: Map<string, ProjectCostRow[]>; costColumnMissing: boolean }
  | { ok: false; message: string }
> {
  if (teamIds.length === 0) {
    return { ok: true, byTeam: new Map(), costColumnMissing: false };
  }

  const primary = await admin
    .from('projects')
    .select('team_id, cost, status')
    .eq('workspace_id', workspaceId)
    .in('team_id', teamIds);

  if (primary.error && isMissingCostColumnError(primary.error)) {
    console.warn(
      '[projects-cost-query] projects.cost column missing; team spend rollups use 0. Run migration 038_ensure_projects_cost_column.sql (or 007_add_project_cost.sql).'
    );
    const fallback = await admin
      .from('projects')
      .select('team_id, status')
      .eq('workspace_id', workspaceId)
      .in('team_id', teamIds);

    if (fallback.error) {
      return { ok: false, message: fallback.error.message };
    }

    const byTeam = new Map<string, ProjectCostRow[]>();
    for (const row of fallback.data ?? []) {
      const tid = row.team_id as string | null;
      if (!tid) continue;
      const list = byTeam.get(tid) ?? [];
      list.push({ cost: 0, status: String(row.status ?? '') });
      byTeam.set(tid, list);
    }
    return { ok: true, byTeam, costColumnMissing: true };
  }

  if (primary.error) {
    return { ok: false, message: primary.error.message };
  }

  const byTeam = new Map<string, ProjectCostRow[]>();
  for (const row of primary.data ?? []) {
    const tid = row.team_id as string | null;
    if (!tid) continue;
    const list = byTeam.get(tid) ?? [];
    list.push({
      cost: row.cost as ProjectCostRow['cost'],
      status: String(row.status ?? ''),
    });
    byTeam.set(tid, list);
  }
  return { ok: true, byTeam, costColumnMissing: false };
}

/**
 * Project rows for one team (used + committed totals). Falls back if `cost` column is missing.
 */
export async function fetchProjectCostRowsForTeamId(
  admin: SupabaseClient,
  teamId: string
): Promise<{ ok: true; rows: ProjectCostRow[] } | { ok: false; message: string }> {
  const primary = await admin.from('projects').select('cost, status').eq('team_id', teamId);

  if (primary.error && isMissingCostColumnError(primary.error)) {
    console.warn(
      '[projects-cost-query] projects.cost missing; team budget floor check uses 0 for project costs.'
    );
    const fallback = await admin.from('projects').select('status').eq('team_id', teamId);
    if (fallback.error) {
      return { ok: false, message: fallback.error.message };
    }
    const rows = (fallback.data ?? []).map((r) => ({
      cost: 0 as const,
      status: String(r.status ?? ''),
    }));
    return { ok: true, rows };
  }

  if (primary.error) {
    return { ok: false, message: primary.error.message };
  }

  const rows = (primary.data ?? []).map((r) => ({
    cost: r.cost as ProjectCostRow['cost'],
    status: String(r.status ?? ''),
  }));
  return { ok: true, rows };
}
