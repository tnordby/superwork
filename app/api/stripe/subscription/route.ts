import { NextRequest, NextResponse } from 'next/server';
import { stripe } from '@/lib/stripe/config';
import { createClient } from '@/lib/supabase/server';
import { getTotalAmountPaidForSubscription } from '@/lib/stripe/helpers';

export async function GET(request: NextRequest) {
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

    // Get subscription ID from query params
    const { searchParams } = new URL(request.url);
    const subscriptionId = searchParams.get('subscriptionId');

    if (!subscriptionId) {
      return NextResponse.json(
        { error: 'Subscription ID is required' },
        { status: 400 }
      );
    }

    const { data: workspace } = await supabase
      .from('workspaces')
      .select('stripe_subscription_id')
      .eq('owner_id', user.id)
      .maybeSingle();

    if (workspace?.stripe_subscription_id !== subscriptionId) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    // Fetch subscription from Stripe
    const subscription = await stripe.subscriptions.retrieve(subscriptionId);

    if (!subscription) {
      return NextResponse.json(
        { error: 'Subscription not found' },
        { status: 404 }
      );
    }

    // Get the price details
    const priceId = subscription.items.data[0]?.price.id;
    const price = await stripe.prices.retrieve(priceId);

    const paid = await getTotalAmountPaidForSubscription(subscriptionId);
    const amount =
      paid.totalCents > 0 ? paid.totalCents : (price.unit_amount || 0);
    const currency =
      paid.totalCents > 0 ? paid.currency : price.currency;

    return NextResponse.json({
      amount,
      currency,
      interval: price.recurring?.interval || 'month',
      status: subscription.status,
      perPeriodAmount: price.unit_amount || 0,
    });
  } catch (error) {
    console.error('Error fetching subscription:', error);
    return NextResponse.json(
      { error: 'Failed to fetch subscription' },
      { status: 500 }
    );
  }
}
