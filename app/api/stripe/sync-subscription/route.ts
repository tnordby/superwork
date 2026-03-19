import { NextRequest, NextResponse } from 'next/server';
import { stripe } from '@/lib/stripe/config';
import { createClient } from '@/lib/supabase/server';
import { getTotalAmountPaidForSubscription } from '@/lib/stripe/helpers';

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient();

    // Get the authenticated user
    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    // Get user's workspace
    const { data: workspace, error: workspaceError } = await supabase
      .from('workspaces')
      .select('*')
      .eq('owner_id', user.id)
      .single();

    if (workspaceError || !workspace) {
      return NextResponse.json(
        { error: 'Workspace not found' },
        { status: 404 }
      );
    }

    if (!workspace.stripe_customer_id) {
      return NextResponse.json(
        { error: 'No Stripe customer ID found' },
        { status: 400 }
      );
    }

    // Fetch active subscriptions from Stripe
    const subscriptions = await stripe.subscriptions.list({
      customer: workspace.stripe_customer_id,
      status: 'active',
      limit: 1,
    });

    if (subscriptions.data.length === 0) {
      return NextResponse.json(
        { error: 'No active subscription found in Stripe' },
        { status: 404 }
      );
    }

    const subscription = subscriptions.data[0];
    const price = subscription.items.data[0].price;
    const paid = await getTotalAmountPaidForSubscription(subscription.id);
    const reportedAmount =
      paid.totalCents > 0 ? paid.totalCents : (price.unit_amount ?? 0);
    const reportedCurrency =
      paid.totalCents > 0 ? paid.currency : price.currency;

    // Determine interval
    let interval = 'monthly';
    if (price.recurring?.interval === 'year') {
      interval = 'annual';
    } else if (price.recurring?.interval === 'month') {
      if (price.recurring?.interval_count === 3) interval = 'quarterly';
      else if (price.recurring?.interval_count === 6) interval = 'biannual';
    }

    // Update workspace with subscription details
    const { error: updateError } = await supabase
      .from('workspaces')
      .update({
        stripe_subscription_id: subscription.id,
        stripe_subscription_status: subscription.status,
        stripe_price_id: price.id,
        subscription_interval: interval,
        current_period_end: new Date(subscription.current_period_end * 1000).toISOString(),
      })
      .eq('id', workspace.id);

    if (updateError) {
      console.error('Error updating workspace:', updateError);
      return NextResponse.json(
        { error: 'Failed to update workspace' },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      subscription: {
        id: subscription.id,
        status: subscription.status,
        amount: reportedAmount,
        currency: reportedCurrency,
        perPeriodAmount: price.unit_amount,
        interval,
      },
    });
  } catch (error) {
    console.error('Error syncing subscription:', error);
    return NextResponse.json(
      { error: 'Failed to sync subscription' },
      { status: 500 }
    );
  }
}
