import type { SupabaseClient } from '@supabase/supabase-js';
import {
  hasActiveSubscription,
  type SubscriptionStatus,
} from '@/lib/stripe/access-control';
import { getWorkspaceBudgetSnapshot } from '@/lib/billing/workspace-budget';

export const PROJECT_CREATION_BLOCKED_MESSAGE = 'You are not on an active plan';

export const PROJECT_CREATION_PLAN_PATH = '/plan';

export type ProjectCreationEligibility = {
  allowed: boolean;
  hasActivePlan: boolean;
  hasAvailableBalance: boolean;
  availableBalanceCents: number;
};

export function evaluateProjectCreationEligibility(params: {
  stripeSubscriptionStatus: string | null | undefined;
  availableBalanceCents: number;
}): ProjectCreationEligibility {
  const hasActivePlan = hasActiveSubscription(
    (params.stripeSubscriptionStatus ?? null) as SubscriptionStatus
  );
  const hasAvailableBalance = params.availableBalanceCents > 0;

  return {
    allowed: hasActivePlan && hasAvailableBalance,
    hasActivePlan,
    hasAvailableBalance,
    availableBalanceCents: params.availableBalanceCents,
  };
}

export async function getWorkspaceProjectCreationEligibility(
  supabase: SupabaseClient,
  workspaceId: string,
  stripeSubscriptionStatus: string | null | undefined
): Promise<ProjectCreationEligibility> {
  const budget = await getWorkspaceBudgetSnapshot(supabase, workspaceId);
  return evaluateProjectCreationEligibility({
    stripeSubscriptionStatus,
    availableBalanceCents: budget.availableCents,
  });
}
