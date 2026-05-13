import { NextRequest, NextResponse } from 'next/server';
import { stripe, STRIPE_CONFIG } from '@/lib/stripe/config';
import { createClient } from '@/lib/supabase/server';
import {
  customerCanManageBilling,
  resolveCustomerWorkspaceContext,
} from '@/lib/account/customer-workspace-context';
import { assertValidBoosterAmount, hoursFromBudgetEur } from '@/lib/billing/capacity-pricing';
import { computeBoosterValidity } from '@/lib/billing/booster-validity';

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

    const body = (await request.json()) as { workspaceId?: string; amountEur?: number };
    const workspaceId = typeof body.workspaceId === 'string' ? body.workspaceId : '';
    const amountEur = typeof body.amountEur === 'number' ? body.amountEur : NaN;

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
      return NextResponse.json(
        { error: 'You do not have permission to purchase boosters for this workspace' },
        { status: 403 }
      );
    }

    const { data: workspace, error: workspaceError } = await ctx.admin
      .from('workspaces')
      .select('*')
      .eq('id', workspaceId)
      .single();

    if (workspaceError || !workspace) {
      return NextResponse.json({ error: 'Workspace not found' }, { status: 404 });
    }

    const { data: terms } = await ctx.admin
      .from('workspace_plan_terms')
      .select('monthly_budget_eur')
      .eq('workspace_id', workspaceId)
      .maybeSingle();

    let monthlySubscriptionEur =
      terms?.monthly_budget_eur != null ? Number(terms.monthly_budget_eur) : 0;

    if (!Number.isFinite(monthlySubscriptionEur) || monthlySubscriptionEur <= 0) {
      if (!workspace.stripe_subscription_id) {
        return NextResponse.json(
          { error: 'Subscribe to a plan before purchasing boosters.' },
          { status: 400 }
        );
      }
      const sub = await stripe.subscriptions.retrieve(workspace.stripe_subscription_id as string);
      const price = sub.items.data[0]?.price;
      if (price?.recurring?.interval === 'month' && price.unit_amount != null) {
        monthlySubscriptionEur = price.unit_amount / 100;
      } else if (price?.recurring?.interval === 'year' && price.unit_amount != null) {
        const annualMajor = price.unit_amount / 100;
        monthlySubscriptionEur = Math.round((annualMajor / 12 / 0.92) * 100) / 100;
      } else {
        return NextResponse.json(
          { error: 'Could not determine monthly subscription amount for boosters.' },
          { status: 400 }
        );
      }
    }

    try {
      assertValidBoosterAmount(amountEur, monthlySubscriptionEur);
    } catch {
      return NextResponse.json({ error: 'Invalid booster amount' }, { status: 400 });
    }

    let customerId = workspace.stripe_customer_id as string | null;
    if (!customerId) {
      const customer = await stripe.customers.create({
        email: user.email ?? undefined,
        metadata: { workspace_id: workspaceId, user_id: user.id },
      });
      customerId = customer.id;
      await ctx.admin.from('workspaces').update({ stripe_customer_id: customerId }).eq('id', workspaceId);
    }

    const { validFromIso, validUntilIso } = computeBoosterValidity(new Date());
    const hoursGranted = hoursFromBudgetEur(amountEur);

    const boosterMeta = {
      workspace_id: workspaceId,
      user_id: user.id,
      checkout_kind: 'booster',
      amount_eur: String(amountEur),
      hours_granted: String(hoursGranted),
      valid_from: validFromIso,
      valid_until: validUntilIso,
    };

    const session = await stripe.checkout.sessions.create({
      customer: customerId,
      mode: 'payment',
      payment_method_types: ['card'],
      line_items: [
        {
          price_data: {
            currency: 'eur',
            unit_amount: Math.round(amountEur * 100),
            product_data: {
              name: `Superwork Booster — extra capacity`,
            },
          },
          quantity: 1,
        },
      ],
      success_url: `${STRIPE_CONFIG.appUrl}/plan/boosters?paid=1`,
      cancel_url: `${STRIPE_CONFIG.appUrl}/plan/boosters`,
      metadata: boosterMeta,
    });

    return NextResponse.json({ sessionId: session.id, url: session.url });
  } catch (error) {
    console.error('Error creating booster checkout:', error);
    return NextResponse.json({ error: 'Failed to create booster checkout' }, { status: 500 });
  }
}
