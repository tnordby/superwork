/**
 * Project cost is stored in minor units (cents), consistent with Stripe amounts.
 */

export type ProjectCostRow = {
  cost: number | null;
  status: string;
};

export function sumUsedBalanceCents(projects: ProjectCostRow[]): number {
  return projects
    .filter((p) => p.status === 'completed')
    .reduce((sum, p) => sum + (p.cost ?? 0), 0);
}

/** Committed budget: agreed / active work not yet completed (includes planned, in progress, etc.). */
export function sumCommittedBalanceCents(projects: ProjectCostRow[]): number {
  return projects
    .filter((p) => p.status !== 'completed')
    .reduce((sum, p) => sum + (p.cost ?? 0), 0);
}
