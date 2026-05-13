import { NextRequest, NextResponse } from 'next/server';
import type Stripe from 'stripe';
import { stripe } from '@/lib/stripe/config';
import { createClient } from '@/lib/supabase/server';
import {
  customerCanManageBilling,
  resolveCustomerWorkspaceContext,
} from '@/lib/account/customer-workspace-context';
import {
  assertValidSubscriptionMonthly,
  capacityBillingPeriodFromStripeRecurring,
  commitmentPeriodChargeCents,
  hoursFromBudgetEur,
  stripeRecurringForCapacityPeriod,
  type CapacityBillingPeriod,
} from '@/lib/billing/capacity-pricing';
import {
  missingCapacityProductIdMessage,
  stripeCapacityProductIdOrNull,
} from '@/lib/stripe/capacity-product-env';

/**
 * Schedules a capacity change for the next billing period (no mid-cycle proration).
 * Downgrades below the committed floor are blocked and flagged for sales.
 */
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

    const body = (await request.json()) as { workspaceId?: string; newMonthlyBudgetEur?: number };
    const workspaceId = typeof body.workspaceId === 'string' ? body.workspaceId : '';
    const newMonthly = typeof body.newMonthlyBudgetEur === 'number' ? body.newMonthlyBudgetEur : NaN;

    if (!workspaceId) {
      return NextResponse.json({ error: 'workspaceId is required' }, { status: 400 });
    }

    const ctx = await resolveCustomerWorkspaceContext(user.id);
    if ('error' in ctx) {
      return NextResponse.json({ error: ctx.error }, { status: ctx.status });
    }
    if (ctx.workspace.id !== workspaceId) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }
    if (!customerCanManageBilling(ctx)) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    try {
      assertValidSubscriptionMonthly(newMonthly);
    } catch {
      return NextResponse.json(
        { error: 'Amount must be between €4,000 and €30,000 in €500 steps.' },
        { status: 400 }
      );
    }

    const { data: workspace, error: wsError } = await ctx.admin
      .from('workspaces')
      .select('stripe_subscription_id, stripe_subscription_status')
      .eq('id', workspaceId)
      .single();

    if (wsError || !workspace?.stripe_subscription_id) {
      return NextResponse.json({ error: 'No active Stripe subscription for this workspace.' }, { status: 400 });
    }

    const { data: terms } = await ctx.admin
      .from('workspace_plan_terms')
      .select('committed_monthly_floor_eur, pricing_model, legacy_tier')
      .eq('workspace_id', workspaceId)
      .maybeSingle();

    if (terms?.pricing_model === 'enterprise_custom') {
      return NextResponse.json(
        { error: 'Plan changes for enterprise agreements are handled with your account team.' },
        { status: 400 }
      );
    }

    const floorRaw = terms?.committed_monthly_floor_eur;
    const floor = floorRaw != null && floorRaw !== '' ? Number(floorRaw) : null;
    if (floor != null && Number.isFinite(floor) && newMonthly < floor) {
      await ctx.admin
        .from('workspace_plan_terms')
        .update({
          sales_escalation_note: `Downgrade requested below committed floor (€${floor}/mo) to €${newMonthly}/mo — needs sales approval.`,
          sales_escalation_at: new Date().toISOString(),
        })
        .eq('workspace_id', workspaceId);

      return NextResponse.json({
        salesFlagged: true,
        message:
          'This change is below your committed annual level. Our team has been notified and will follow up.',
      });
    }

    const productId = stripeCapacityProductIdOrNull();
    if (!productId) {
      return NextResponse.json(
        { error: missingCapacityProductIdMessage(), code: 'MISSING_STRIPE_SUPERWORK_CAPACITY_PRODUCT_ID' },
        { status: 503 }
      );
    }

    const subscription = (await stripe.subscriptions.retrieve(
      workspace.stripe_subscription_id
    )) as Stripe.Subscription;
    const item = subscription.items.data[0];
    if (!item?.id || !item.price?.id) {
      return NextResponse.json({ error: 'Unexpected subscription shape from Stripe.' }, { status: 500 });
    }

    const currentPrice = await stripe.prices.retrieve(item.price.id);
    const recurring = currentPrice.recurring;
    const billingPeriod: CapacityBillingPeriod =
      capacityBillingPeriodFromStripeRecurring(recurring?.interval, recurring?.interval_count ?? undefined) ??
      (recurring?.interval === 'year' ? 'annual' : 'monthly');

    const newUnitAmountCents = commitmentPeriodChargeCents(newMonthly, billingPeriod);

    const newPrice = await stripe.prices.create({
      product: productId,
      currency: 'eur',
      unit_amount: newUnitAmountCents,
      recurring: stripeRecurringForCapacityPeriod(billingPeriod),
    });

    const subId = subscription.id;
    let scheduleId =
      typeof subscription.schedule === 'string' && subscription.schedule
        ? subscription.schedule
        : null;

    if (!scheduleId) {
      const created = await stripe.subscriptionSchedules.create({
        from_subscription: subId,
      });
      scheduleId = created.id;
    }

    const periodStart = item.current_period_start;
    const periodEnd = item.current_period_end;

    await stripe.subscriptionSchedules.update(scheduleId, {
      end_behavior: 'release',
      phases: [
        {
          items: [{ price: item.price.id, quantity: 1 }],
          start_date: periodStart,
          end_date: periodEnd,
        },
        {
          items: [{ price: newPrice.id, quantity: 1 }],
          start_date: periodEnd,
        },
      ],
    });

    await stripe.subscriptions.update(subId, {
      metadata: {
        ...subscription.metadata,
        workspace_id: workspaceId,
        monthly_budget_eur: String(newMonthly),
        billing_period: billingPeriod,
        annual_prepay: billingPeriod === 'annual' ? 'true' : 'false',
        pricing_model: terms?.pricing_model === 'legacy_tier' ? 'slider_v1' : terms?.pricing_model ?? 'slider_v1',
      },
    });

    const preservedCommitted =
      terms?.committed_monthly_floor_eur != null && terms.committed_monthly_floor_eur !== ''
        ? Number(terms.committed_monthly_floor_eur)
        : newMonthly;

    await ctx.admin
      .from('workspace_plan_terms')
      .upsert(
        {
          workspace_id: workspaceId,
          monthly_budget_eur: newMonthly,
          monthly_hours: hoursFromBudgetEur(newMonthly),
          annual_prepay: billingPeriod === 'annual',
          capacity_billing_period: billingPeriod,
          pricing_model:
            terms?.pricing_model === 'legacy_tier' ? 'slider_v1' : terms?.pricing_model ?? 'slider_v1',
          committed_monthly_floor_eur: preservedCommitted,
          legacy_tier: terms?.legacy_tier ?? null,
          service_fee_eur: 0,
        },
        { onConflict: 'workspace_id' }
      );

    return NextResponse.json({
      ok: true,
      effectiveDate: new Date(periodEnd * 1000).toISOString(),
    });
  } catch (error) {
    console.error('[subscription-change]', error);
    return NextResponse.json(
      { error: 'Could not schedule subscription change. Try again or contact support.' },
      { status: 502 }
    );
  }
}
