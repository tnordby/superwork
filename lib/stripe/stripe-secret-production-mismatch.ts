/**
 * Detect test Stripe API keys on production-like deploys (Customer Portal / Checkout follow secret key mode).
 */

export function stripeSecretKeyIsTest(secretKey: string | undefined = process.env.STRIPE_SECRET_KEY): boolean {
  return (secretKey ?? '').startsWith('sk_test_');
}

/**
 * True when this process is clearly a production deploy: Vercel Production, or non-Vercel Node production.
 * Preview/staging on Vercel keeps VERCEL_ENV as `preview` — not flagged here.
 */
export function hostingEnvIsProductionStripeContext(): boolean {
  if (process.env.VERCEL_ENV === 'production') return true;
  if (process.env.NODE_ENV === 'production' && !process.env.VERCEL) return true;
  return false;
}

export function stripeTestSecretKeyInProductionDeploy(): boolean {
  return stripeSecretKeyIsTest() && hostingEnvIsProductionStripeContext();
}

export function stripeTestSecretInProductionPortalErrorBody(): {
  error: string;
  code: 'STRIPE_TEST_SECRET_KEY_IN_PRODUCTION';
} {
  return {
    code: 'STRIPE_TEST_SECRET_KEY_IN_PRODUCTION',
    error:
      'This server is using a Stripe test secret key (sk_test_…) on a production deployment, so “Manage billing” opens the test Customer Portal. ' +
      'Checkout and the portal always follow STRIPE_SECRET_KEY mode. For real customers, set STRIPE_SECRET_KEY to sk_live_… on production, ' +
      'and use matching live credentials: NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY (pk_live_…), STRIPE_WEBHOOK_SECRET from a live-mode webhook endpoint, ' +
      'and STRIPE_SUPERWORK_CAPACITY_PRODUCT_ID from live-mode Products. Do not mix test and live keys or product IDs.',
  };
}
