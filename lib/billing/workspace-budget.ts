import type { SupabaseClient } from '@supabase/supabase-js';
import { getTotalAmountPaidForSubscription } from '@/lib/stripe/helpers';
import { sumCommittedBalanceCents, sumUsedBalanceCents, type ProjectCostRow } from './project-balances';

export type WorkspaceBudgetSnapshot = {
  totalPurchasedCents: number;
  usedCents: number;
  committedCents: number;
  availableCents: number;
  currency: string;
};

/**
 * Loads workspace prepaid total (Stripe paid invoices) and project usage for balance checks.
 * All amounts in minor units (cents).
 */
export async function getWorkspaceBudgetSnapshot(
  supabase: SupabaseClient,
  workspaceId: string
): Promise<WorkspaceBudgetSnapshot> {
  const { data: workspace, error: wsError } = await supabase
    .from('workspaces')
    .select('stripe_subscription_id')
    .eq('id', workspaceId)
    .maybeSingle();

  if (wsError) {
    console.error('[workspace-budget] workspace load failed:', wsError);
  }

  const { data: projectRows, error: projError } = await supabase
    .from('projects')
    .select('cost, status')
    .eq('workspace_id', workspaceId);

  if (projError) {
    console.error('[workspace-budget] projects load failed:', projError);
  }

  const projects = (projectRows ?? []) as ProjectCostRow[];
  const usedCents = sumUsedBalanceCents(projects);
  const committedCents = sumCommittedBalanceCents(projects);

  let totalPurchasedCents = 0;
  let currency = 'usd';

  const subscriptionId = workspace?.stripe_subscription_id;
  if (subscriptionId && process.env.STRIPE_SECRET_KEY) {
    try {
      const paid = await getTotalAmountPaidForSubscription(subscriptionId);
      if (paid.totalCents > 0) {
        totalPurchasedCents = paid.totalCents;
        currency = paid.currency;
      } else {
        const { stripe } = await import('@/lib/stripe/config');
        const subscription = await stripe.subscriptions.retrieve(subscriptionId);
        const primaryPrice = subscription.items.data[0]?.price;
        totalPurchasedCents = primaryPrice?.unit_amount ?? 0;
        currency = primaryPrice?.currency ?? 'usd';
      }
    } catch (e) {
      console.error('[workspace-budget] Stripe load failed:', e);
    }
  }

  const availableCents = totalPurchasedCents - usedCents - committedCents;

  return {
    totalPurchasedCents,
    usedCents,
    committedCents,
    availableCents,
    currency,
  };
}

/**
 * Quote `final_price` / `estimated_price` are stored in major units (e.g. EUR); convert to cents.
 * Uses `final_price` when set (including 0); otherwise `estimated_price` — aligned with SQL coalesce.
 */
export function quotePriceToCents(finalPrice: unknown, estimatedPrice: unknown): number {
  const picked =
    finalPrice !== null && finalPrice !== undefined
      ? Number(finalPrice)
      : estimatedPrice !== null && estimatedPrice !== undefined
        ? Number(estimatedPrice)
        : 0;
  if (!Number.isFinite(picked) || picked <= 0) {
    return 0;
  }
  return Math.round(picked * 100);
}
