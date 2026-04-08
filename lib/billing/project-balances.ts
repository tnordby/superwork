/**
 * Project cost is stored in minor units (cents), consistent with Stripe amounts.
 */

export type ProjectCostRow = {
  cost: number | null;
  status: string;
};

const COMMITTED_STATUSES = new Set(['in_progress', 'in_review', 'on_hold']);

export function sumUsedBalanceCents(projects: ProjectCostRow[]): number {
  return projects
    .filter((p) => p.status === 'completed')
    .reduce((sum, p) => sum + (p.cost ?? 0), 0);
}

/** Committed budget starts once project work has actually started. */
export function sumCommittedBalanceCents(projects: ProjectCostRow[]): number {
  return projects
    .filter((p) => COMMITTED_STATUSES.has(p.status))
    .reduce((sum, p) => sum + (p.cost ?? 0), 0);
}
