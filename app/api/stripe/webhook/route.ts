import { NextRequest, NextResponse } from 'next/server';
import { stripe, STRIPE_CONFIG } from '@/lib/stripe/config';
import { tryCreateServiceRoleClient } from '@/lib/supabase/admin';
import { sendEmail } from '@/lib/email/send';
import SubscriptionActivatedEmail from '@/emails/templates/billing/subscription-activated';
import PaymentFailedEmail from '@/emails/templates/billing/payment-failed';
import { formatAmount } from '@/lib/stripe/utils';
import {
  insertBoosterIfPaid,
  upsertWorkspacePlanTermsFromSubscriptionCheckout,
} from '@/lib/stripe/checkout-workspace-sync';
import { hoursFromBudgetEur } from '@/lib/billing/capacity-pricing';
import Stripe from 'stripe';

function getCurrentPeriodEndIso(subscription: unknown): string | null {
  if (!subscription || typeof subscription !== 'object') return null;
  const s = subscription as {
    items?: { data?: Array<{ current_period_end?: number }> };
  };
  const raw = s.items?.data?.[0]?.current_period_end;
  if (typeof raw !== 'number') return null;
  return new Date(raw * 1000).toISOString();
}

function getInvoiceSubscriptionId(invoice: unknown): string | null {
  if (!invoice || typeof invoice !== 'object') return null;
  if (!('subscription' in invoice)) return null;
  const value = (invoice as { subscription?: unknown }).subscription;
  return typeof value === 'string' && value ? value : null;
}

export async function POST(request: NextRequest) {
  const body = await request.text();
  const signature = request.headers.get('stripe-signature');

  if (!signature) {
    return NextResponse.json({ error: 'No signature provided' }, { status: 400 });
  }

  let event: Stripe.Event;

  try {
    event = stripe.webhooks.constructEvent(body, signature, STRIPE_CONFIG.webhookSecret);
  } catch (error) {
    console.error('Webhook signature verification failed:', error);
    return NextResponse.json({ error: 'Invalid signature' }, { status: 400 });
  }

  const admin = tryCreateServiceRoleClient();
  if (!admin) {
    console.error('[stripe webhook] SUPABASE_SERVICE_ROLE_KEY is not configured');
    return NextResponse.json({ error: 'Server misconfigured' }, { status: 500 });
  }

  try {
    switch (event.type) {
      case 'checkout.session.completed': {
        const session = event.data.object as Stripe.Checkout.Session;
        const workspaceId = session.metadata?.workspace_id;
        if (!workspaceId) break;

        if (session.mode === 'payment' && session.metadata?.checkout_kind === 'booster') {
          if (session.payment_status === 'paid') {
            await insertBoosterIfPaid({ admin, workspaceId, session });
            console.log(`✓ Booster recorded for workspace ${workspaceId}`);
          }
          break;
        }

        if (session.mode === 'subscription' && session.subscription) {
          const subscription = await stripe.subscriptions.retrieve(session.subscription as string);
          const price = subscription.items.data[0]?.price;
          const interval = getIntervalFromPrice(price);

          await admin
            .from('workspaces')
            .update({
              stripe_customer_id: session.customer as string,
              stripe_subscription_id: subscription.id,
              stripe_subscription_status: subscription.status,
              stripe_price_id: price?.id,
              subscription_interval: interval,
              current_period_end: getCurrentPeriodEndIso(subscription),
            })
            .eq('id', workspaceId);

          await upsertWorkspacePlanTermsFromSubscriptionCheckout({
            admin,
            workspaceId,
            subscription,
            sessionMetadata: session.metadata ?? undefined,
            stripe,
          });

          const { data: workspace } = await admin
            .from('workspaces')
            .select('owner_id, name')
            .eq('id', workspaceId)
            .single();

          if (workspace) {
            const { data: ownerAuth } = await admin.auth.admin.getUserById(workspace.owner_id);
            const user = ownerAuth?.user;

            if (user?.email && price) {
              const product = await stripe.products.retrieve(price.product as string);

              await sendEmail({
                to: user.email,
                subject: `You're subscribed — welcome to ${product.name}`,
                template: SubscriptionActivatedEmail({
                  userName: user.user_metadata?.full_name || user.email?.split('@')[0] || 'there',
                  planName: product.name,
                  amount: formatAmount(price.unit_amount || 0, price.currency || 'usd'),
                  billingInterval: interval,
                  nextBillingDate: new Date(
                    getCurrentPeriodEndIso(subscription) ?? new Date().toISOString()
                  ).toLocaleDateString('en-US', {
                    month: 'long',
                    day: 'numeric',
                    year: 'numeric',
                  }),
                  dashboardUrl: `${process.env.NEXT_PUBLIC_APP_URL}/plan`,
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
        const subscriptionId = getInvoiceSubscriptionId(invoice);

        if (subscriptionId) {
          const subscription = await stripe.subscriptions.retrieve(subscriptionId);
          const workspaceId = subscription.metadata?.workspace_id;

          if (workspaceId) {
            await admin
              .from('workspaces')
              .update({
                stripe_subscription_status: 'active',
                current_period_end: getCurrentPeriodEndIso(subscription),
              })
              .eq('id', workspaceId);

            console.log(`✓ Invoice paid for workspace ${workspaceId}`);
          }
        }
        break;
      }

      case 'invoice.payment_failed': {
        const invoice = event.data.object as Stripe.Invoice;
        const subscriptionId = getInvoiceSubscriptionId(invoice);

        if (subscriptionId) {
          const subscription = await stripe.subscriptions.retrieve(subscriptionId);
          const workspaceId = subscription.metadata?.workspace_id;

          if (workspaceId) {
            await admin
              .from('workspaces')
              .update({
                stripe_subscription_status: 'past_due',
              })
              .eq('id', workspaceId);

            const { data: workspace } = await admin
              .from('workspaces')
              .select('owner_id, name')
              .eq('id', workspaceId)
              .single();

            if (workspace) {
              const { data: ownerAuth } = await admin.auth.admin.getUserById(workspace.owner_id);
              const user = ownerAuth?.user;

              if (user?.email) {
                const price = subscription.items.data[0]?.price;
                const product = price
                  ? await stripe.products.retrieve(price.product as string)
                  : null;

                const nextRetryDate = new Date();
                nextRetryDate.setDate(nextRetryDate.getDate() + 3);

                await sendEmail({
                  to: user.email,
                  subject: 'Action required: your Superwork payment failed',
                  template: PaymentFailedEmail({
                    userName: user.user_metadata?.full_name || user.email?.split('@')[0] || 'there',
                    amount: formatAmount(invoice.amount_due, invoice.currency),
                    planName: product?.name ?? 'Superwork',
                    retryDate: nextRetryDate.toLocaleDateString('en-US', {
                      month: 'long',
                      day: 'numeric',
                      year: 'numeric',
                    }),
                    updatePaymentUrl: `${process.env.NEXT_PUBLIC_APP_URL}/plan`,
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
          await admin
            .from('workspaces')
            .update({
              stripe_subscription_status: subscription.status,
              stripe_price_id: subscription.items.data[0]?.price.id,
              subscription_interval: getIntervalFromPrice(subscription.items.data[0]?.price),
              current_period_end: getCurrentPeriodEndIso(subscription),
            })
            .eq('id', workspaceId);

          const metaMonthly = subscription.metadata?.monthly_budget_eur;
          if (metaMonthly && subscription.metadata?.pricing_model !== 'enterprise_custom') {
            const m = Number(metaMonthly);
            if (Number.isFinite(m) && m > 0) {
              await admin
                .from('workspace_plan_terms')
                .update({
                  monthly_budget_eur: m,
                  monthly_hours: hoursFromBudgetEur(m),
                })
                .eq('workspace_id', workspaceId);
            }
          }

          console.log(`✓ Subscription updated for workspace ${workspaceId}`);
        }
        break;
      }

      case 'customer.subscription.deleted': {
        const subscription = event.data.object as Stripe.Subscription;
        const workspaceId = subscription.metadata?.workspace_id;

        if (workspaceId) {
          await admin
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
    return NextResponse.json({ error: 'Webhook processing failed' }, { status: 500 });
  }
}

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
