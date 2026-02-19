# Customer Payment Guide

## How Customers Subscribe to Plans

Your customers can now subscribe to plans directly through the Superwork portal. Here's how it works:

## User Flow

### 1. Customer Navigates to Plan Page
- Go to **Account** → **Plan** in the sidebar
- Or visit `/account/plan` directly

### 2. View Available Plans
If the customer doesn't have an active subscription, they will see:
- A message: "No Active Subscription"
- All available plans from Stripe with:
  - Plan name
  - Price and billing interval (monthly, quarterly, bi-annual, annual)
  - Features (if configured in Stripe metadata)
  - "Subscribe" button

### 3. Subscribe to a Plan
- Customer clicks "Subscribe" on their chosen plan
- Redirected to Stripe Checkout (secure hosted payment page)
- Enters payment details
- Completes checkout

### 4. Subscription Activated
- Customer redirected to success page
- Subscription details saved to database via webhook
- Workspace updated with:
  - Stripe customer ID
  - Subscription ID
  - Subscription status (`active`)
  - Billing interval
  - Next billing date

### 5. Manage Subscription
Once subscribed, customers can:
- View current plan details
- See next billing date
- View invoice history
- Click "Manage Billing" to:
  - Update payment method
  - Cancel subscription
  - View all invoices
  - Change billing interval (if enabled)

## Technical Flow

```
Customer clicks Subscribe
       ↓
API creates Checkout Session
       ↓
Redirect to Stripe Checkout
       ↓
Customer enters payment
       ↓
Stripe processes payment
       ↓
Redirect to /billing/success
       ↓
Webhook updates database
       ↓
Customer has active subscription
```

## What Gets Created

### On First Subscription
1. **Stripe Customer** - Created for the workspace
2. **Stripe Subscription** - Active recurring subscription
3. **Database Record** - Workspace updated with Stripe data

### On Each Billing Cycle
1. **Invoice** - Automatically created by Stripe
2. **Payment** - Attempted via saved payment method
3. **Webhook Event** - Updates database with new billing period

## Managing Plans in Stripe Dashboard

### Creating a Plan

1. Go to Stripe Dashboard → **Products**
2. Click **Add Product**
3. Fill in:
   - **Name**: e.g., "Superwork Pro"
   - **Description**: Brief description
   - **Pricing**:
     - Choose recurring
     - Set amount (e.g., $99.00)
     - Set billing interval:
       - Monthly: `month` / `1`
       - Quarterly: `month` / `3`
       - Bi-Annual: `month` / `6`
       - Annual: `year` / `1`

4. (Optional) Add **Metadata**:
   - `features`: Comma-separated list, e.g., "Unlimited projects, Priority support, Advanced analytics"
   - `popular`: Set to `true` to highlight the plan

### Example Plan Setup

**Product Name**: Superwork Pro
**Monthly Price**: $99/month
- Interval: `month`
- Interval count: `1`
- Metadata:
  - `features`: "Unlimited projects, 5 team members, Priority support"

**Annual Price**: $990/year (17% savings)
- Interval: `year`
- Interval count: `1`
- Metadata:
  - `features`: "Unlimited projects, 5 team members, Priority support, 2 months free"
  - `popular`: "true"

## Testing

### Test with Stripe Test Cards

Use these test cards in Stripe Checkout:

**Successful Payment**:
```
Card: 4242 4242 4242 4242
Expiry: Any future date
CVC: Any 3 digits
ZIP: Any valid ZIP
```

**Payment Declined**:
```
Card: 4000 0000 0000 0002
```

**Requires 3D Secure**:
```
Card: 4000 0025 0000 3155
```

### Test Webhooks Locally

```bash
# Forward webhooks to localhost
stripe listen --forward-to localhost:3000/api/stripe/webhook

# In another terminal, trigger test events
stripe trigger checkout.session.completed
stripe trigger invoice.paid
stripe trigger invoice.payment_failed
```

## Customer Support Scenarios

### Customer Can't Subscribe
1. Check Stripe Dashboard for error logs
2. Verify webhook endpoint is receiving events
3. Check database for workspace record
4. Ensure Stripe products are active

### Payment Fails on Renewal
1. Stripe automatically retries (smart retry logic)
2. Customer gets email from Stripe
3. Subscription status changes to `past_due`
4. Banner appears in portal prompting payment update
5. Customer clicks "Update Payment Method" → Stripe Customer Portal

### Customer Wants to Cancel
1. Customer goes to `/account/plan`
2. Clicks "Manage Billing"
3. Opens Stripe Customer Portal
4. Clicks "Cancel Subscription"
5. Webhook updates database
6. Subscription status changes to `canceled`

### Customer Wants to Change Plan
Currently, customers need to:
1. Cancel current subscription
2. Subscribe to new plan

Or you can enable plan switching in Stripe Customer Portal:
- Dashboard → Settings → Billing → Customer Portal
- Enable "Customers can switch plans"

## Security Notes

- All payment data handled by Stripe (PCI compliant)
- No credit card numbers stored in your database
- Webhooks verified with signing secret
- Customer portal sessions expire after 1 hour
- Checkout sessions expire after 24 hours

## Monitoring

### Check Subscription Status

```sql
-- In Supabase SQL Editor
SELECT
  id,
  name,
  stripe_subscription_status,
  subscription_interval,
  current_period_end
FROM workspaces
WHERE stripe_subscription_id IS NOT NULL;
```

### View Recent Subscriptions

In Stripe Dashboard:
- **Customers** → See all customers and their subscriptions
- **Subscriptions** → See all active/cancelled subscriptions
- **Payments** → See all successful/failed payments

## Going Live

Before accepting real payments:

1. **Switch to live keys** in `.env.local`:
   - Replace `sk_test_` with `sk_live_`
   - Replace `pk_test_` with `pk_live_`

2. **Update webhook endpoint**:
   - Production URL: `https://your-domain.com/api/stripe/webhook`
   - Get new signing secret
   - Update `STRIPE_WEBHOOK_SECRET`

3. **Enable Customer Portal** (Production):
   - Stripe Dashboard → Settings → Billing → Customer Portal
   - Customize branding, links, and features

4. **Test full flow** with real card:
   - Subscribe to smallest plan
   - Verify webhook events
   - Test Customer Portal
   - Cancel subscription

5. **Enable Stripe Tax** (Optional):
   - Dashboard → Settings → Tax
   - Automatic tax calculation for compliance

## Support

For issues:
- Check `STRIPE_INTEGRATION.md` for detailed technical docs
- Review Stripe Dashboard → Developers → Logs
- Check webhook delivery in Stripe Dashboard
- Review server logs for API errors
