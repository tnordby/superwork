import { NextRequest, NextResponse } from 'next/server';
import { stripe, STRIPE_CONFIG } from '@/lib/stripe/config';
import { createClient } from '@/lib/supabase/server';
import { sendEmail } from '@/lib/email/send';
import SubscriptionActivatedEmail from '@/emails/templates/billing/subscription-activated';
import PaymentFailedEmail from '@/emails/templates/billing/payment-failed';
import { formatAmount } from '@/lib/stripe/utils';
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

          const price = subscription.items.data[0]?.price;
          const interval = getIntervalFromPrice(price);

          await supabase
            .from('workspaces')
            .update({
              stripe_customer_id: session.customer as string,
              stripe_subscription_id: subscription.id,
              stripe_subscription_status: subscription.status,
              stripe_price_id: price?.id,
              subscription_interval: interval,
              current_period_end: new Date(subscription.current_period_end * 1000).toISOString(),
            })
            .eq('id', workspaceId);

          // Get workspace owner details
          const { data: workspace } = await supabase
            .from('workspaces')
            .select('owner_id, name')
            .eq('id', workspaceId)
            .single();

          if (workspace) {
            const { data: { user } } = await supabase.auth.admin.getUserById(workspace.owner_id);

            if (user?.email) {
              // Get product name
              const product = await stripe.products.retrieve(price?.product as string);

              // Send subscription activated email
              await sendEmail({
                to: user.email,
                subject: `You're subscribed — welcome to ${product.name}`,
                template: SubscriptionActivatedEmail({
                  userName: user.user_metadata?.full_name || user.email?.split('@')[0] || 'there',
                  planName: product.name,
                  amount: formatAmount(price?.unit_amount || 0, price?.currency || 'usd'),
                  billingInterval: interval,
                  nextBillingDate: new Date(subscription.current_period_end * 1000).toLocaleDateString('en-US', {
                    month: 'long',
                    day: 'numeric',
                    year: 'numeric',
                  }),
                  dashboardUrl: `${process.env.NEXT_PUBLIC_APP_URL}/account/plan`,
                }),
                templateId: 'BILL-01',
                metadata: {
                  workspace_id: workspaceId,
                  subscription_id: subscription.id,
                },
              });

              console.log(`✓ Subscription activated email sent to ${user.email}`);
            }
          }

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

            // Get workspace owner details
            const { data: workspace } = await supabase
              .from('workspaces')
              .select('owner_id, name')
              .eq('id', workspaceId)
              .single();

            if (workspace) {
              const { data: { user } } = await supabase.auth.admin.getUserById(workspace.owner_id);

              if (user?.email) {
                const price = subscription.items.data[0]?.price;
                const product = await stripe.products.retrieve(price?.product as string);

                // Calculate next retry date (typically 3-7 days)
                const nextRetryDate = new Date();
                nextRetryDate.setDate(nextRetryDate.getDate() + 3);

                // Send payment failed email
                await sendEmail({
                  to: user.email,
                  subject: 'Action required: your Superwork payment failed',
                  template: PaymentFailedEmail({
                    userName: user.user_metadata?.full_name || user.email?.split('@')[0] || 'there',
                    amount: formatAmount(invoice.amount_due, invoice.currency),
                    planName: product.name,
                    retryDate: nextRetryDate.toLocaleDateString('en-US', {
                      month: 'long',
                      day: 'numeric',
                      year: 'numeric',
                    }),
                    updatePaymentUrl: `${process.env.NEXT_PUBLIC_APP_URL}/account/plan`,
                  }),
                  templateId: 'BILL-03',
                  metadata: {
                    workspace_id: workspaceId,
                    subscription_id: subscription.id,
                    invoice_id: invoice.id,
                  },
                });

                console.log(`⚠ Payment failed email sent to ${user.email}`);
              }
            }

            console.log(`⚠ Payment failed for workspace ${workspaceId}`);
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
