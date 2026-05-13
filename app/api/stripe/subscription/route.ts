import { NextRequest, NextResponse } from 'next/server';
import type { SupabaseClient } from '@supabase/supabase-js';
import { stripe } from '@/lib/stripe/config';
import { createClient } from '@/lib/supabase/server';
import { getTotalAmountPaidForSubscription } from '@/lib/stripe/helpers';

async function userCanAccessSubscriptionWorkspace(
  supabase: SupabaseClient,
  userId: string,
  subscriptionId: string
): Promise<boolean> {
  const { data: ws } = await supabase
    .from('workspaces')
    .select('id, owner_id')
    .eq('stripe_subscription_id', subscriptionId)
    .maybeSingle();

  if (!ws) return false;
  if (ws.owner_id === userId) return true;

  const { data: mem } = await supabase
    .from('workspace_members')
    .select('user_id')
    .eq('workspace_id', ws.id)
    .eq('user_id', userId)
    .maybeSingle();

  return Boolean(mem);
}

export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient();
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const subscriptionId = searchParams.get('subscriptionId');

    if (!subscriptionId) {
      return NextResponse.json({ error: 'Subscription ID is required' }, { status: 400 });
    }

    const allowed = await userCanAccessSubscriptionWorkspace(supabase, user.id, subscriptionId);
    if (!allowed) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const subscription = await stripe.subscriptions.retrieve(subscriptionId);

    if (!subscription) {
      return NextResponse.json({ error: 'Subscription not found' }, { status: 404 });
    }

    const priceId = subscription.items.data[0]?.price.id;
    const price = priceId ? await stripe.prices.retrieve(priceId) : null;

    const paid = await getTotalAmountPaidForSubscription(subscriptionId);
    const amount = paid.totalCents > 0 ? paid.totalCents : (price?.unit_amount ?? 0);
    const currency = paid.totalCents > 0 ? paid.currency : price?.currency ?? 'usd';

    return NextResponse.json({
      amount,
      currency,
      interval: price?.recurring?.interval || 'month',
      status: subscription.status,
      perPeriodAmount: price?.unit_amount || 0,
    });
  } catch (error) {
    console.error('Error fetching subscription:', error);
    return NextResponse.json({ error: 'Failed to fetch subscription' }, { status: 500 });
  }
}
