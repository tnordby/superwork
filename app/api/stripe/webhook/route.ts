import { NextRequest, NextResponse } from 'next/server';
import { stripe, STRIPE_CONFIG } from '@/lib/stripe/config';
import { createClient } from '@/lib/supabase/server';
import Stripe from 'stripe';

export async function POST(request: NextRequest) {
  const body = await request.text();
  const signature = request.headers.get('stripe-signature');

  if (!signature) {
    return NextResponse.json(
      { error: 'No signature provided' },
      { status: 400 }
    );
  }

  let event: Stripe.Event;

  try {
    event = stripe.webhooks.constructEvent(
      body,
      signature,
      STRIPE_CONFIG.webhookSecret
    );
  } catch (error) {
    console.error('Webhook signature verification failed:', error);
    return NextResponse.json(
      { error: 'Invalid signature' },
      { status: 400 }
    );
  }

  const supabase = await createClient();

  try {
    switch (event.type) {
      case 'checkout.session.completed': {
        const session = event.data.object as Stripe.Checkout.Session;
        const workspaceId = session.metadata?.workspace_id;

        if (workspaceId && session.subscription) {
          const subscription = await stripe.subscriptions.retrieve(
            session.subscription as string
          );

          await supabase
            .from('workspaces')
            .update({
              stripe_customer_id: session.customer as string,
              stripe_subscription_id: subscription.id,
              stripe_subscription_status: subscription.status,
              stripe_price_id: subscription.items.data[0]?.price.id,
              subscription_interval: getIntervalFromPrice(subscription.items.data[0]?.price),
              current_period_end: new Date(subscription.current_period_end * 1000).toISOString(),
            })
            .eq('id', workspaceId);

          console.log(`✓ Checkout completed for workspace ${workspaceId}`);
        }
        break;
      }

      case 'invoice.paid': {
        const invoice = event.data.object as Stripe.Invoice;
        const subscriptionId = invoice.subscription as string;

        if (subscriptionId) {
          const subscription = await stripe.subscriptions.retrieve(subscriptionId);
          const workspaceId = subscription.metadata?.workspace_id;

          if (workspaceId) {
            await supabase
              .from('workspaces')
              .update({
                stripe_subscription_status: 'active',
                current_period_end: new Date(subscription.current_period_end * 1000).toISOString(),
              })
              .eq('id', workspaceId);

            console.log(`✓ Invoice paid for workspace ${workspaceId}`);
          }
        }
        break;
      }

      case 'invoice.payment_failed': {
        const invoice = event.data.object as Stripe.Invoice;
        const subscriptionId = invoice.subscription as string;

        if (subscriptionId) {
          const subscription = await stripe.subscriptions.retrieve(subscriptionId);
          const workspaceId = subscription.metadata?.workspace_id;

          if (workspaceId) {
            await supabase
              .from('workspaces')
              .update({
                stripe_subscription_status: 'past_due',
              })
              .eq('id', workspaceId);

            console.log(`⚠ Payment failed for workspace ${workspaceId}`);
            // TODO: Send email notification to client
          }
        }
        break;
      }

      case 'customer.subscription.updated': {
        const subscription = event.data.object as Stripe.Subscription;
        const workspaceId = subscription.metadata?.workspace_id;

        if (workspaceId) {
          await supabase
            .from('workspaces')
            .update({
              stripe_subscription_status: subscription.status,
              stripe_price_id: subscription.items.data[0]?.price.id,
              subscription_interval: getIntervalFromPrice(subscription.items.data[0]?.price),
              current_period_end: new Date(subscription.current_period_end * 1000).toISOString(),
            })
            .eq('id', workspaceId);

          console.log(`✓ Subscription updated for workspace ${workspaceId}`);
        }
        break;
      }

      case 'customer.subscription.deleted': {
        const subscription = event.data.object as Stripe.Subscription;
        const workspaceId = subscription.metadata?.workspace_id;

        if (workspaceId) {
          await supabase
            .from('workspaces')
            .update({
              stripe_subscription_status: 'canceled',
              stripe_subscription_id: null,
              current_period_end: null,
            })
            .eq('id', workspaceId);

          console.log(`✓ Subscription cancelled for workspace ${workspaceId}`);
        }
        break;
      }

      case 'payment_method.attached': {
        console.log('✓ Payment method attached');
        break;
      }

      default:
        console.log(`Unhandled event type: ${event.type}`);
    }

    return NextResponse.json({ received: true });
  } catch (error) {
    console.error('Error processing webhook:', error);
    return NextResponse.json(
      { error: 'Webhook processing failed' },
      { status: 500 }
    );
  }
}

// Helper function to determine billing interval from price
function getIntervalFromPrice(price?: Stripe.Price): string {
  if (!price || !price.recurring) return 'monthly';

  const { interval, interval_count } = price.recurring;

  if (interval === 'year') return 'annual';
  if (interval === 'month') {
    if (interval_count === 3) return 'quarterly';
    if (interval_count === 6) return 'biannual';
    return 'monthly';
  }

  return 'monthly';
}
