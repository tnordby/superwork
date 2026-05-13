import type { SupabaseClient } from '@supabase/supabase-js';
import type Stripe from 'stripe';
import {
  hoursFromBudgetEur,
  type PricingModel,
} from '@/lib/billing/capacity-pricing';

function monthlyBudgetFromSubscription(
  subscription: Stripe.Subscription,
  price?: Stripe.Price
): number {
  const meta = subscription.metadata?.monthly_budget_eur;
  if (meta) {
    const n = Number(meta);
    if (Number.isFinite(n) && n > 0) return n;
  }
  if (price?.unit_amount != null && price.recurring?.interval === 'month') {
    return price.unit_amount / 100;
  }
  if (price?.unit_amount != null && price.recurring?.interval === 'year') {
    const annualMajor = price.unit_amount / 100;
    return Math.round((annualMajor / 12 / 0.92) * 100) / 100;
  }
  return 0;
}

export async function upsertWorkspacePlanTermsFromSubscriptionCheckout(params: {
  admin: SupabaseClient;
  workspaceId: string;
  subscription: Stripe.Subscription;
  sessionMetadata: Stripe.Metadata | null | undefined;
  stripe: Stripe;
}): Promise<void> {
  const { admin, workspaceId, subscription, sessionMetadata, stripe } = params;
  const price = subscription.items.data[0]?.price;
  if (!price) return;

  const product = await stripe.products.retrieve(price.product as string);
  const checkoutKind = sessionMetadata?.checkout_kind;
  const metaMonthly = sessionMetadata?.monthly_budget_eur
    ? Number(sessionMetadata.monthly_budget_eur)
    : null;

  const monthlyFromSub = monthlyBudgetFromSubscription(subscription, price);
  const monthlyBudget =
    metaMonthly && Number.isFinite(metaMonthly) && metaMonthly > 0
      ? metaMonthly
      : monthlyFromSub > 0
        ? monthlyFromSub
        : (price.unit_amount ?? 0) / 100;

  const annualPrepay =
    sessionMetadata?.annual_prepay === 'true' ||
    subscription.metadata?.annual_prepay === 'true' ||
    price.recurring?.interval === 'year';

  let pricingModel: PricingModel = 'legacy_tier';
  if (checkoutKind === 'capacity_subscription' || subscription.metadata?.checkout_kind === 'capacity_subscription') {
    pricingModel = 'slider_v1';
  }
  if (subscription.metadata?.pricing_model === 'enterprise_custom') {
    pricingModel = 'enterprise_custom';
  }

  const legacyTier = pricingModel === 'legacy_tier' ? product.name : null;

  const { data: existing } = await admin
    .from('workspace_plan_terms')
    .select('committed_monthly_floor_eur')
    .eq('workspace_id', workspaceId)
    .maybeSingle();

  const committedFromMeta = sessionMetadata?.committed_monthly_floor_eur
    ? Number(sessionMetadata.committed_monthly_floor_eur)
    : null;
  const committedFloor =
    existing?.committed_monthly_floor_eur != null &&
    typeof existing.committed_monthly_floor_eur === 'number'
      ? Number(existing.committed_monthly_floor_eur)
      : committedFromMeta && Number.isFinite(committedFromMeta)
        ? committedFromMeta
        : monthlyBudget;

  await admin.from('workspace_plan_terms').upsert(
    {
      workspace_id: workspaceId,
      monthly_budget_eur: monthlyBudget,
      monthly_hours: hoursFromBudgetEur(monthlyBudget),
      annual_prepay: Boolean(annualPrepay),
      pricing_model: pricingModel,
      legacy_tier: legacyTier,
      committed_monthly_floor_eur: committedFloor,
      service_fee_eur: 0,
    },
    { onConflict: 'workspace_id' }
  );
}

export async function insertBoosterIfPaid(params: {
  admin: SupabaseClient;
  workspaceId: string;
  session: Stripe.Checkout.Session;
}): Promise<void> {
  const { admin, workspaceId, session } = params;
  const md = session.metadata ?? {};
  if (md.checkout_kind !== 'booster') return;

  const { data: existing } = await admin
    .from('workspace_boosters')
    .select('id')
    .eq('stripe_checkout_session_id', session.id)
    .maybeSingle();

  if (existing) return;

  const amountEur = md.amount_eur ? Number(md.amount_eur) : (session.amount_total ?? 0) / 100;
  const hoursGranted = md.hours_granted ? Number(md.hours_granted) : 0;
  const validFrom = typeof md.valid_from === 'string' ? md.valid_from : null;
  const validUntil = typeof md.valid_until === 'string' ? md.valid_until : null;

  if (!validFrom || !validUntil || !Number.isFinite(amountEur) || amountEur <= 0) {
    console.error('[webhook] booster metadata incomplete', session.id);
    return;
  }

  await admin.from('workspace_boosters').insert({
    workspace_id: workspaceId,
    amount_eur: amountEur,
    hours_granted: Number.isFinite(hoursGranted) && hoursGranted > 0 ? hoursGranted : hoursFromBudgetEur(amountEur),
    valid_from: validFrom,
    valid_until: validUntil,
    status: 'paid',
    stripe_checkout_session_id: session.id,
    package_type: null,
  });
}
