/**
 * Stripe customer ID on the workspace must exist in the same API mode as STRIPE_SECRET_KEY.
 */

export type StripeSecretKeyMode = 'live' | 'test' | 'unknown';

export function stripeSecretKeyMode(): StripeSecretKeyMode {
  const k = process.env.STRIPE_SECRET_KEY ?? '';
  if (k.startsWith('sk_live_')) return 'live';
  if (k.startsWith('sk_test_')) return 'test';
  return 'unknown';
}

/**
 * User-facing error for billing portal when `cus_…` is missing or in the wrong Stripe mode.
 */
export function portalCustomerModeMismatchResponse(stripeMessage: string): {
  error: string;
  code: 'STRIPE_CUSTOMER_MODE_MISMATCH';
  serverStripeMode: StripeSecretKeyMode;
} {
  const mode = stripeSecretKeyMode();
  const lower = stripeMessage.toLowerCase();

  let detail: string;
  if (lower.includes('similar object exists in test mode')) {
    detail =
      'Stripe says this customer exists in Test mode, but this server is using Live API keys. ' +
      'The workspace was likely subscribed while the app used test keys, so the database still holds a test customer ID. ' +
      'Fix: complete subscription (or checkout) again in Live mode so the workspace gets a live `cus_…`, or update `workspaces.stripe_customer_id` to the correct Live customer from your Stripe Dashboard.';
  } else if (lower.includes('similar object exists in live mode')) {
    detail =
      'Stripe says this customer exists in Live mode, but this server is using Test API keys. ' +
      'Use a workspace that was created via test-mode checkout, or point production at Live keys only when serving real billing.';
  } else {
    detail =
      mode === 'live'
        ? 'The ID may be from Test mode, deleted in Stripe, or not on this Stripe account. Confirm the customer in Stripe Dashboard (Live mode) matches `workspaces.stripe_customer_id`.'
        : mode === 'test'
          ? 'The ID may be from Live mode, deleted in Stripe, or not on this Stripe account. Confirm the customer in Stripe Dashboard (Test mode) matches `workspaces.stripe_customer_id`.'
          : 'Confirm STRIPE_SECRET_KEY is set and the customer exists in that Stripe mode.';
  }

  return {
    code: 'STRIPE_CUSTOMER_MODE_MISMATCH',
    serverStripeMode: mode,
    error:
      'This workspace’s Stripe customer ID is not valid for the Stripe mode your server is using. ' + detail,
  };
}
