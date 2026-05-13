/**
 * Env helpers for capacity checkout and subscription changes (fixed Product ID).
 * The product must exist in the same Stripe mode (test vs live) as STRIPE_SECRET_KEY.
 */

export function stripeCapacityProductIdOrNull(): string | null {
  const raw = process.env.STRIPE_SUPERWORK_CAPACITY_PRODUCT_ID;
  if (typeof raw !== 'string') return null;
  const trimmed = raw.trim();
  return trimmed === '' ? null : trimmed;
}

export function missingCapacityProductIdMessage(): string {
  return (
    'Server is not configured for capacity billing: STRIPE_SUPERWORK_CAPACITY_PRODUCT_ID is missing. ' +
    'Add it to your hosting environment (e.g. Vercel → Project → Settings → Environment Variables) or `.env.local` locally. ' +
    'In Stripe Dashboard → Products, create or copy the capacity product while the Dashboard matches your API key mode (Test vs Live), ' +
    'then paste the Product ID (`prod_…`). That `prod_…` must be from the same mode as STRIPE_SECRET_KEY (`sk_test_` with test products, `sk_live_` with live products); mixing modes will fail at checkout or in Stripe.'
  );
}
