import { NextRequest, NextResponse } from 'next/server';
import { stripe, STRIPE_CONFIG } from '@/lib/stripe/config';
import { createClient } from '@/lib/supabase/server';
import {
  customerCanManageBilling,
  resolveCustomerWorkspaceContext,
} from '@/lib/account/customer-workspace-context';
import {
  assertValidSubscriptionMonthly,
  commitmentPeriodChargeCents,
  parseCapacityBillingPeriod,
  stripeRecurringForCapacityPeriod,
  type CapacityBillingPeriod,
} from '@/lib/billing/capacity-pricing';
import {
  missingCapacityProductIdMessage,
  stripeCapacityProductIdOrNull,
} from '@/lib/stripe/capacity-product-env';

type CapacityCheckoutBody = {
  monthlyBudgetEur: number;
  /** Preferred: monthly | quarterly | biannual | annual */
  billingPeriod?: CapacityBillingPeriod;
  /** @deprecated Use billingPeriod: 'annual' */
  annualPrepay?: boolean;
};

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

    const body = (await request.json()) as {
      priceId?: string;
      workspaceId?: string;
      capacityCheckout?: CapacityCheckoutBody;
    };

    const workspaceId = typeof body.workspaceId === 'string' ? body.workspaceId : '';
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
        { error: 'You do not have permission to manage billing for this workspace' },
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

    const activeStatuses = ['active', 'trialing'];
    if (
      workspace.stripe_subscription_id &&
      typeof workspace.stripe_subscription_status === 'string' &&
      activeStatuses.includes(workspace.stripe_subscription_status)
    ) {
      return NextResponse.json(
        { error: 'This workspace already has an active subscription. Use plan change instead.' },
        { status: 400 }
      );
    }

    let customerId = workspace.stripe_customer_id as string | null;

    if (!customerId) {
      const customer = await stripe.customers.create({
        email: user.email ?? undefined,
        metadata: {
          workspace_id: workspaceId,
          user_id: user.id,
        },
      });
      customerId = customer.id;

      await ctx.admin.from('workspaces').update({ stripe_customer_id: customerId }).eq('id', workspaceId);
    }

    const successUrl = `${STRIPE_CONFIG.appUrl}/billing/success?session_id={CHECKOUT_SESSION_ID}`;
    const cancelUrl = `${STRIPE_CONFIG.appUrl}/billing/cancel`;

    const sharedMeta = {
      workspace_id: workspaceId,
      user_id: user.id,
    };

    if (body.capacityCheckout) {
      const productId = stripeCapacityProductIdOrNull();
      if (!productId) {
        return NextResponse.json(
          { error: missingCapacityProductIdMessage(), code: 'MISSING_STRIPE_SUPERWORK_CAPACITY_PRODUCT_ID' },
          { status: 503 }
        );
      }

      const { monthlyBudgetEur, billingPeriod: billingPeriodRaw, annualPrepay } = body.capacityCheckout;
      try {
        assertValidSubscriptionMonthly(monthlyBudgetEur);
      } catch {
        return NextResponse.json({ error: 'Invalid subscription amount' }, { status: 400 });
      }

      const billingPeriod: CapacityBillingPeriod =
        parseCapacityBillingPeriod(billingPeriodRaw) ?? (annualPrepay === true ? 'annual' : 'monthly');

      const committedFloor = monthlyBudgetEur;
      const capacityMeta = {
        ...sharedMeta,
        checkout_kind: 'capacity_subscription',
        monthly_budget_eur: String(monthlyBudgetEur),
        billing_period: billingPeriod,
        annual_prepay: billingPeriod === 'annual' ? 'true' : 'false',
        committed_monthly_floor_eur: String(committedFloor),
        pricing_model: 'slider_v1',
      };

      const recurring = stripeRecurringForCapacityPeriod(billingPeriod);
      const unitAmountCents = commitmentPeriodChargeCents(monthlyBudgetEur, billingPeriod);

      const session = await stripe.checkout.sessions.create({
        customer: customerId,
        mode: 'subscription',
        payment_method_types: ['card'],
        line_items: [
          {
            price_data: {
              currency: 'eur',
              product: productId,
              unit_amount: unitAmountCents,
              recurring,
            },
            quantity: 1,
          },
        ],
        success_url: successUrl,
        cancel_url: cancelUrl,
        metadata: capacityMeta,
        subscription_data: {
          metadata: capacityMeta,
        },
      });

      return NextResponse.json({ sessionId: session.id, url: session.url });
    }

    const priceId = typeof body.priceId === 'string' ? body.priceId : '';
    if (!priceId) {
      return NextResponse.json(
        { error: 'Provide capacityCheckout or priceId (legacy).' },
        { status: 400 }
      );
    }

    const session = await stripe.checkout.sessions.create({
      customer: customerId,
      mode: 'subscription',
      payment_method_types: ['card'],
      line_items: [{ price: priceId, quantity: 1 }],
      success_url: successUrl,
      cancel_url: cancelUrl,
      metadata: {
        ...sharedMeta,
        checkout_kind: 'legacy_price',
      },
      subscription_data: {
        metadata: {
          ...sharedMeta,
          checkout_kind: 'legacy_price',
        },
      },
    });

    return NextResponse.json({ sessionId: session.id, url: session.url });
  } catch (error) {
    console.error('Error creating checkout session:', error);
    return NextResponse.json({ error: 'Failed to create checkout session' }, { status: 500 });
  }
}
