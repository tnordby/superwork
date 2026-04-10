/**
 * Project cost is stored in minor units (cents), consistent with Stripe amounts.
 */

export type ProjectCostRow = {
  /** Minor units; DB may return string or bigint. */
  cost: number | null | string | bigint | undefined;
  status: string;
};

/** Include `review` (customer UI) and `in_review` (legacy/DB) */
const COMMITTED_STATUSES = new Set(['in_progress', 'in_review', 'on_hold', 'review']);

/** Postgres numeric / int8 can arrive as string or bigint; mixing with number in `+` throws. */
function centsFromRow(cost: unknown): number {
  if (cost === null || cost === undefined) return 0;
  if (typeof cost === 'bigint') return Number(cost);
  if (typeof cost === 'number') return Number.isFinite(cost) ? cost : 0;
  if (typeof cost === 'string') {
    const n = Number(cost);
    return Number.isFinite(n) ? n : 0;
  }
  return 0;
}

export function sumUsedBalanceCents(projects: ProjectCostRow[]): number {
  return projects
    .filter((p) => p.status === 'completed')
    .reduce((sum, p) => sum + centsFromRow(p.cost), 0);
}

/** Committed budget starts once project work has actually started. */
export function sumCommittedBalanceCents(projects: ProjectCostRow[]): number {
  return projects
    .filter((p) => COMMITTED_STATUSES.has(p.status))
    .reduce((sum, p) => sum + centsFromRow(p.cost), 0);
}
