# Stripe Payments Integration

This document provides a comprehensive guide to the Stripe payments integration in Superwork.

## Overview

The Stripe integration enables:
- Subscription-based billing with multiple intervals (monthly, quarterly, bi-annual, annual)
- Secure checkout via Stripe Checkout
- Self-service billing management via Stripe Customer Portal
- Automated subscription lifecycle management via webhooks
- Access control based on subscription status

## Architecture

```
┌─────────────────┐
│   Client App    │
│  (React/Next)   │
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│  API Routes     │
│  - Checkout     │
│  - Portal       │
│  - Webhooks     │
└────────┬────────┘
         │
         ▼
┌─────────────────┐       ┌──────────────┐
│   Stripe API    │◄──────┤   Webhooks   │
└────────┬────────┘       └──────────────┘
         │
         ▼
┌─────────────────┐
│  Supabase DB    │
│  (Workspaces)   │
└─────────────────┘
```

## Setup Instructions

### 1. Install Dependencies

```bash
npm install stripe
```

### 2. Configure Environment Variables

Add the following to your `.env.local` file:

```bash
# Stripe Keys (get these from Stripe Dashboard)
STRIPE_SECRET_KEY=sk_test_...
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=pk_test_...
STRIPE_WEBHOOK_SECRET=whsec_...
NEXT_PUBLIC_APP_URL=http://localhost:3000
```

**Where to find these:**
- Dashboard → Developers → API Keys → Secret key & Publishable key
- Dashboard → Developers → Webhooks → Add endpoint → Signing secret

### 3. Run Database Migration

Apply the Stripe billing migration to add necessary fields to the workspaces table:

```bash
# Using Supabase CLI
supabase db push

# Or run directly in Supabase Dashboard SQL Editor
# File: supabase/migrations/003_stripe_billing.sql
```

This adds the following columns to `workspaces`:
- `stripe_customer_id`
- `stripe_subscription_id`
- `stripe_subscription_status`
- `stripe_price_id`
- `subscription_interval`
- `current_period_end`

### 4. Create Stripe Products & Prices

In your Stripe Dashboard:

1. Go to **Products** → **Add Product**
2. Create a product (e.g., "Superwork Pro")
3. Add prices with different billing intervals:
   - Monthly: `interval: month`, `interval_count: 1`
   - Quarterly: `interval: month`, `interval_count: 3`
   - Bi-Annual: `interval: month`, `interval_count: 6`
   - Annual: `interval: year`, `interval_count: 1`

4. (Optional) Add metadata to products/prices:
   - `popular: true` - Highlights the plan
   - `features: Feature 1, Feature 2, Feature 3` - Displays features

### 5. Configure Stripe Webhooks

1. Go to **Developers** → **Webhooks** → **Add endpoint**
2. Set endpoint URL: `https://your-domain.com/api/stripe/webhook`
3. Select events to listen to:
   - `checkout.session.completed`
   - `invoice.paid`
   - `invoice.payment_failed`
   - `customer.subscription.updated`
   - `customer.subscription.deleted`
   - `payment_method.attached`

4. Copy the **Signing secret** to `STRIPE_WEBHOOK_SECRET`

### 6. Enable Stripe Customer Portal

1. Go to **Settings** → **Billing** → **Customer Portal**
2. Enable the portal
3. Configure:
   - Allow customers to update payment methods
   - Allow customers to cancel subscriptions
   - Allow customers to view invoice history

## File Structure

```
lib/stripe/
├── config.ts                 # Stripe client initialization
├── helpers.ts                # Helper functions for Stripe operations
└── access-control.ts         # Subscription-based access control

app/api/stripe/
├── create-checkout-session/  # Creates Stripe Checkout sessions
├── create-portal-session/    # Creates Customer Portal sessions
├── webhook/                  # Handles Stripe webhook events
└── plans/                    # Fetches available subscription plans

app/api/billing/
└── workspace/                # Fetches workspace billing data

app/billing/
├── plans/                    # Plan selection page
├── page.tsx                  # Billing dashboard
├── success/                  # Checkout success page
└── cancel/                   # Checkout cancel page

components/billing/
└── SubscriptionBanner.tsx    # Displays subscription status banners

supabase/migrations/
└── 003_stripe_billing.sql    # Database schema for billing
```

## Usage

### Subscribing to a Plan

1. User navigates to `/billing/plans`
2. Selects a plan and clicks "Subscribe"
3. Redirected to Stripe Checkout
4. Completes payment
5. Redirected back to `/billing/success`
6. Webhook updates workspace subscription status in database

### Managing Billing

1. User navigates to `/billing`
2. Views current subscription details and invoice history
3. Clicks "Manage Billing"
4. Redirected to Stripe Customer Portal
5. Can update payment method, cancel subscription, or view invoices

### Checking Subscription Status

```typescript
import { hasActiveSubscription } from '@/lib/stripe/access-control';

// In your component or API route
const isActive = hasActiveSubscription(workspace.stripe_subscription_status);

if (!isActive) {
  // Redirect to plans or show upgrade prompt
}
```

### Displaying Subscription Banner

```typescript
import { SubscriptionBanner } from '@/components/billing/SubscriptionBanner';

<SubscriptionBanner
  status={workspace.stripe_subscription_status}
  currentPeriodEnd={workspace.current_period_end}
/>
```

## Subscription Status Flow

| Status | Description | Access Level | User Action |
|--------|-------------|--------------|-------------|
| `active` | Subscription is paid and active | Full | None |
| `trialing` | In trial period | Full | Add payment before trial ends |
| `past_due` | Payment failed, retrying | Limited | Update payment method |
| `canceled` | Subscription cancelled | None | Resubscribe |
| `incomplete` | Initial payment pending | None | Complete checkout |
| `incomplete_expired` | Payment failed permanently | None | Start new subscription |

## Webhook Events

### `checkout.session.completed`
Triggered when checkout is completed. Updates workspace with:
- Stripe customer ID
- Subscription ID
- Subscription status
- Price ID
- Billing interval
- Current period end

### `invoice.paid`
Triggered when invoice is paid successfully. Sets status to `active`.

### `invoice.payment_failed`
Triggered when payment fails. Sets status to `past_due`. Stripe will automatically retry.

### `customer.subscription.updated`
Triggered when subscription is modified (plan change, interval change). Syncs all subscription fields.

### `customer.subscription.deleted`
Triggered when subscription is cancelled. Sets status to `canceled` and clears subscription ID.

## Testing

### Test Mode

Use Stripe test mode during development:
- Use test API keys (starting with `sk_test_` and `pk_test_`)
- Use [Stripe test cards](https://stripe.com/docs/testing)

Common test cards:
- **Success**: `4242 4242 4242 4242`
- **Decline**: `4000 0000 0000 0002`
- **Requires 3D Secure**: `4000 0025 0000 3155`

### Testing Webhooks Locally

1. Install Stripe CLI:
```bash
brew install stripe/stripe-cli/stripe
```

2. Login to Stripe:
```bash
stripe login
```

3. Forward webhooks to local server:
```bash
stripe listen --forward-to localhost:3000/api/stripe/webhook
```

4. Use the webhook signing secret provided by the CLI in your `.env.local`

5. Trigger test events:
```bash
stripe trigger checkout.session.completed
stripe trigger invoice.paid
stripe trigger invoice.payment_failed
```

## Security Considerations

1. **PCI Compliance**: Card data never touches your servers - all handled by Stripe
2. **Webhook Verification**: All webhooks are verified using `stripe.webhooks.constructEvent()`
3. **API Key Security**: Secret keys are server-side only, never exposed to client
4. **HTTPS Required**: All Stripe API calls require HTTPS in production

## Troubleshooting

### Webhook not receiving events

1. Check webhook endpoint is publicly accessible
2. Verify webhook signing secret matches
3. Check Stripe Dashboard → Developers → Webhooks for delivery logs
4. Ensure webhook endpoint returns `200 OK`

### Subscription not updating after payment

1. Check webhook logs in Stripe Dashboard
2. Verify webhook handler logic
3. Check database permissions
4. Review server logs for errors

### Customer portal not working

1. Ensure Customer Portal is enabled in Stripe Dashboard
2. Verify workspace has `stripe_customer_id`
3. Check API key has portal permissions

## Going Live

Before launching to production:

1. **Switch to live keys**:
   - Replace test keys with live keys in `.env.local`
   - Update webhook endpoint URL to production domain

2. **Update webhook endpoint**:
   - Add production webhook endpoint in Stripe Dashboard
   - Update `STRIPE_WEBHOOK_SECRET` with new signing secret

3. **Test production checkout**:
   - Create a real subscription (you can cancel immediately)
   - Verify webhook events are received
   - Test Customer Portal

4. **Enable Stripe Tax** (optional):
   - Dashboard → Settings → Tax
   - Automatic tax calculation for compliance

5. **Configure invoice emails**:
   - Dashboard → Settings → Emails
   - Customize invoice and receipt emails

## Additional Resources

- [Stripe Documentation](https://stripe.com/docs)
- [Stripe Checkout](https://stripe.com/docs/payments/checkout)
- [Stripe Customer Portal](https://stripe.com/docs/billing/subscriptions/integrating-customer-portal)
- [Webhooks Guide](https://stripe.com/docs/webhooks)
- [Testing Guide](https://stripe.com/docs/testing)

## Support

For issues related to:
- **Stripe Integration**: Review this document and Stripe docs
- **Database Schema**: Check migration file
- **API Routes**: Review route handlers in `app/api/stripe/`
- **UI Components**: Check `app/billing/` pages

For Stripe-specific questions, consult the [Stripe Support](https://support.stripe.com/).
