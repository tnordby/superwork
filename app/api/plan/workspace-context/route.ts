import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { resolveCustomerWorkspaceContext, customerCanManageBilling } from '@/lib/account/customer-workspace-context';
import {
  sumCommittedBalanceCents,
  sumUsedBalanceCents,
} from '@/lib/billing/project-balances';
import { monthlyBudgetFromStripeRecurringUnitAmount } from '@/lib/billing/capacity-pricing';
import { stripe } from '@/lib/stripe/config';
import { getTotalAmountPaidForSubscription, currentPeriodEndIsoFromSubscription } from '@/lib/stripe/helpers';

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

    const ctx = await resolveCustomerWorkspaceContext(user.id);
    if ('error' in ctx) {
      return NextResponse.json({ error: ctx.error }, { status: ctx.status });
    }

    const { data: workspace } = await ctx.admin
      .from('workspaces')
      .select(
        'id, name, stripe_customer_id, stripe_subscription_id, stripe_subscription_status, subscription_interval, current_period_end'
      )
      .eq('id', ctx.workspace.id)
      .single();

    if (!workspace) {
      return NextResponse.json({ error: 'Workspace not found' }, { status: 404 });
    }

    const { data: planTerms } = await ctx.admin
      .from('workspace_plan_terms')
      .select('*')
      .eq('workspace_id', ctx.workspace.id)
      .maybeSingle();

    const { data: projectRows } = await ctx.admin
      .from('projects')
      .select('cost, status')
      .eq('workspace_id', ctx.workspace.id);

    const projects = projectRows ?? [];
    const usedBalance = sumUsedBalanceCents(projects);
    const committedBalance = sumCommittedBalanceCents(projects);

    let stripePerPeriodCents: number | null = null;
    let billingAnchorCents: number | null = null;
    let stripeCurrency = 'eur';
    let stripeInterval: string | null = null;
    let stripeIntervalCount: number | null = null;

    if (workspace.stripe_subscription_id && process.env.STRIPE_SECRET_KEY) {
      try {
        const subscription = await stripe.subscriptions.retrieve(workspace.stripe_subscription_id);
        const price = subscription.items.data[0]?.price;
        const paid = await getTotalAmountPaidForSubscription(workspace.stripe_subscription_id);
        stripePerPeriodCents = price?.unit_amount ?? null;
        billingAnchorCents = paid.totalCents > 0 ? paid.totalCents : (price?.unit_amount ?? null);
        stripeCurrency = paid.totalCents > 0 ? paid.currency : price?.currency ?? 'eur';
        stripeInterval = price?.recurring?.interval ?? null;
        stripeIntervalCount = price?.recurring?.interval_count ?? null;

        const freshEnd = currentPeriodEndIsoFromSubscription(subscription);
        if (freshEnd && freshEnd !== workspace.current_period_end) {
          await ctx.admin
            .from('workspaces')
            .update({ current_period_end: freshEnd })
            .eq('id', workspace.id);
          workspace.current_period_end = freshEnd;
        }
      } catch {
        stripePerPeriodCents = null;
        billingAnchorCents = null;
      }
    }

    const effectiveMonthlyFromTerms =
      planTerms?.monthly_budget_eur != null ? Number(planTerms.monthly_budget_eur) : null;

    let effectiveMonthlyEur = effectiveMonthlyFromTerms;
    if (
      (effectiveMonthlyEur == null || !Number.isFinite(effectiveMonthlyEur)) &&
      stripePerPeriodCents != null &&
      stripeInterval
    ) {
      const fromStripe = monthlyBudgetFromStripeRecurringUnitAmount(
        stripePerPeriodCents,
        stripeInterval,
        stripeIntervalCount ?? undefined
      );
      if (fromStripe != null && fromStripe > 0) {
        effectiveMonthlyEur = fromStripe;
      }
    }

    return NextResponse.json({
      workspace,
      planTerms,
      stripePreview: {
        perPeriodCents: stripePerPeriodCents,
        billingAnchorCents,
        currency: stripeCurrency,
        interval: stripeInterval,
        intervalCount: stripeIntervalCount,
      },
      effectiveMonthlyEur: effectiveMonthlyEur && Number.isFinite(effectiveMonthlyEur) ? effectiveMonthlyEur : null,
      canManageBilling: customerCanManageBilling(ctx),
      projectCosts: {
        usedBalance,
        committedBalance,
      },
    });
  } catch (error) {
    console.error('[plan/workspace-context]', error);
    return NextResponse.json({ error: 'Failed to load plan context' }, { status: 500 });
  }
}
