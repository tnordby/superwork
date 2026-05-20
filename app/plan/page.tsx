'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Calendar, Check, CreditCard, Lock, Sparkles, Zap } from 'lucide-react';
import { formatAmount, formatBillingInterval, formatSubscriptionStatus } from '@/lib/stripe/utils';
import { SubscriptionBanner } from '@/components/billing/SubscriptionBanner';
import { StripeMark } from '@/components/billing/StripeMark';
import {
  SUBSCRIPTION_ANCHOR_EUR,
  SUBSCRIPTION_MONTHLY_MAX_EUR,
  SUBSCRIPTION_MONTHLY_MIN_EUR,
  SUBSCRIPTION_STEP_EUR,
  commitmentDiscountForPeriod,
  commitmentGrossEur,
  commitmentPeriodChargeEur,
  commitmentSavingsVsGrossEur,
  parseCapacityBillingPeriod,
  subscriptionMonthlyFromSliderIndex,
  subscriptionSliderIndexCount,
  subscriptionSliderIndexFromMonthly,
  type CapacityBillingPeriod,
} from '@/lib/billing/capacity-pricing';

type WorkspaceRow = {
  id: string;
  name: string;
  stripe_customer_id?: string | null;
  stripe_subscription_id?: string | null;
  stripe_subscription_status?: string | null;
  subscription_interval?: string | null;
  current_period_end?: string | null;
};

type PlanTerms = {
  monthly_budget_eur: number;
  monthly_hours?: number;
  annual_prepay: boolean;
  capacity_billing_period?: string | null;
  pricing_model: string;
  legacy_tier?: string | null;
  committed_monthly_floor_eur?: number | null;
  sales_escalation_note?: string | null;
} | null;

type PlanContextResponse = {
  workspace: WorkspaceRow;
  planTerms: PlanTerms;
  stripePreview: {
    perPeriodCents: number | null;
    billingAnchorCents: number | null;
    currency: string;
    interval: string | null;
    intervalCount?: number | null;
  };
  effectiveMonthlyEur: number | null;
  canManageBilling: boolean;
  projectCosts: { usedBalance: number; committedBalance: number };
};

function formatEurMajor(amountEur: number): string {
  return new Intl.NumberFormat('en-IE', {
    style: 'currency',
    currency: 'EUR',
    maximumFractionDigits: 0,
  }).format(amountEur);
}

const SUBSCRIBE_BILLING_OPTIONS: {
  id: CapacityBillingPeriod;
  label: string;
  description: string;
}[] = [
  { id: 'monthly', label: 'Monthly', description: 'Billed every month — full flexibility' },
  { id: 'quarterly', label: 'Quarterly', description: 'Billed every 3 months — 2% off vs. paying monthly' },
  { id: 'biannual', label: 'Bi-annual', description: 'Billed every 6 months — 5% off' },
  { id: 'annual', label: 'Annual', description: 'Billed once per year — 8% off' },
];

function billingPeriodSavingsLabel(period: CapacityBillingPeriod): string | null {
  const discount = commitmentDiscountForPeriod(period);
  if (discount <= 0) return null;
  return `${Math.round(discount * 100)}% off`;
}

function clampSubscriptionIndexFromMonthly(monthly: number): number {
  const snapped =
    SUBSCRIPTION_MONTHLY_MIN_EUR +
    Math.round((monthly - SUBSCRIPTION_MONTHLY_MIN_EUR) / SUBSCRIPTION_STEP_EUR) * SUBSCRIPTION_STEP_EUR;
  const clamped = Math.min(SUBSCRIPTION_MONTHLY_MAX_EUR, Math.max(SUBSCRIPTION_MONTHLY_MIN_EUR, snapped));
  try {
    return subscriptionSliderIndexFromMonthly(clamped);
  } catch {
    return 0;
  }
}

function BoosterUpsellCard({ onBuyBoosters }: { onBuyBoosters: () => void }) {
  return (
    <div className="flex h-full min-h-0 flex-col rounded-2xl border border-gray-200 bg-white p-8 shadow-sm">
      <h2 className="text-xl font-semibold text-gray-900">Capacity boosters</h2>
      <div className="mt-3 min-h-0 flex-1 space-y-3 text-sm leading-relaxed text-gray-600">
        <p>
          A booster is a one-off payment that adds extra delivery capacity on top of your current plan. Your
          subscription amount stays the same, and boosters do not auto-renew.
        </p>
        <p>
          Use them for a short-term bump—such as a launch or migration—when you need more capacity without scheduling a
          higher monthly amount.
        </p>
      </div>
      <div className="mt-8 shrink-0">
        <button
          type="button"
          onClick={onBuyBoosters}
          className="flex w-full items-center justify-center gap-2 rounded-xl bg-gray-900 px-6 py-3.5 text-sm font-semibold text-white shadow-sm hover:bg-gray-800 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-gray-900"
        >
          <Zap className="h-5 w-5 shrink-0" aria-hidden />
          Buy boosters
        </button>
      </div>
    </div>
  );
}

export default function PlanPage() {
  const router = useRouter();
  const [ctx, setCtx] = useState<PlanContextResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [pageError, setPageError] = useState<string | null>(null);
  const [subIdx, setSubIdx] = useState(0);
  const [billingPeriod, setBillingPeriod] = useState<CapacityBillingPeriod>('monthly');
  const [changeIdx, setChangeIdx] = useState(0);
  const [managingBilling, setManagingBilling] = useState(false);
  const [checkoutLoading, setCheckoutLoading] = useState(false);
  const [changeLoading, setChangeLoading] = useState(false);
  const [changeMessage, setChangeMessage] = useState<string | null>(null);

  const load = useCallback(async () => {
    setPageError(null);
    try {
      const res = await fetch('/api/plan/workspace-context', { credentials: 'include' });
      const data = (await res.json()) as PlanContextResponse & { error?: string };
      if (!res.ok) {
        throw new Error(typeof data.error === 'string' ? data.error : 'Failed to load plan');
      }
      setCtx(data);
      const base = data.effectiveMonthlyEur ?? SUBSCRIPTION_MONTHLY_MIN_EUR;
      setSubIdx(clampSubscriptionIndexFromMonthly(base));
      setChangeIdx(clampSubscriptionIndexFromMonthly(base));
      const fromTerms = parseCapacityBillingPeriod(data.planTerms?.capacity_billing_period);
      if (fromTerms) {
        setBillingPeriod(fromTerms);
      } else if (data.planTerms?.annual_prepay) {
        setBillingPeriod('annual');
      } else {
        setBillingPeriod('monthly');
      }
    } catch (e) {
      setPageError(e instanceof Error ? e.message : 'Failed to load plan');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const subscribeMonthly = useMemo(() => subscriptionMonthlyFromSliderIndex(subIdx), [subIdx]);
  const changeMonthly = useMemo(() => subscriptionMonthlyFromSliderIndex(changeIdx), [changeIdx]);

  const hasActiveSubscription = Boolean(
    ctx?.workspace.stripe_subscription_status &&
      ['active', 'trialing'].includes(ctx.workspace.stripe_subscription_status)
  );

  const billingViaStripe = Boolean(
    ctx?.workspace.stripe_subscription_id || ctx?.workspace.stripe_customer_id
  );

  const startingBalance = ctx?.stripePreview.billingAnchorCents ?? 0;
  const currency = ctx?.stripePreview.currency ?? 'eur';
  const availableBalance =
    startingBalance - (ctx?.projectCosts.usedBalance ?? 0) - (ctx?.projectCosts.committedBalance ?? 0);

  const handleManageBilling = async () => {
    if (!ctx?.workspace.id) return;
    setManagingBilling(true);
    setPageError(null);
    try {
      const response = await fetch('/api/stripe/create-portal-session', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ workspaceId: ctx.workspace.id }),
      });
      if (!response.ok) {
        const data = await response.json().catch(() => null);
        throw new Error(typeof data?.error === 'string' ? data.error : 'Failed to create portal session');
      }
      const { url } = await response.json();
      if (url) window.location.href = url;
    } catch (error) {
      setPageError(
        error instanceof Error ? error.message : 'We couldn’t open the billing portal. Please try again.'
      );
    } finally {
      setManagingBilling(false);
    }
  };

  const handleSubscribe = async () => {
    if (!ctx?.workspace.id || !ctx.canManageBilling) return;
    setCheckoutLoading(true);
    setPageError(null);
    try {
      const response = await fetch('/api/stripe/create-checkout-session', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          workspaceId: ctx.workspace.id,
          capacityCheckout: {
            monthlyBudgetEur: subscribeMonthly,
            billingPeriod,
          },
        }),
      });
      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.error || 'Failed to create checkout session');
      }
      if (data.url) window.location.href = data.url;
      else throw new Error('No checkout URL returned');
    } catch (error) {
      setPageError(error instanceof Error ? error.message : 'Checkout failed');
    } finally {
      setCheckoutLoading(false);
    }
  };

  const handleScheduleChange = async () => {
    if (!ctx?.workspace.id || !ctx.canManageBilling) return;
    setChangeLoading(true);
    setChangeMessage(null);
    setPageError(null);
    try {
      const response = await fetch('/api/stripe/subscription-change', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          workspaceId: ctx.workspace.id,
          newMonthlyBudgetEur: changeMonthly,
        }),
      });
      const data = await response.json();
      if (response.ok && data.salesFlagged) {
        setChangeMessage(data.message ?? 'Our team will follow up about this change.');
        return;
      }
      if (!response.ok) {
        throw new Error(data.error || 'Could not schedule change');
      }
      setChangeMessage(
        `Your new capacity is scheduled from the next billing cycle (${new Date(data.effectiveDate).toLocaleDateString('en-IE', { day: 'numeric', month: 'long', year: 'numeric' })}).`
      );
      await load();
    } catch (error) {
      setPageError(error instanceof Error ? error.message : 'Change request failed');
    } finally {
      setChangeLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="p-8">
        <div className="mx-auto max-w-3xl py-16 text-center text-gray-600">Loading plan…</div>
      </div>
    );
  }

  if (!ctx) {
    return (
      <div className="p-8">
        <p className="text-red-600">{pageError ?? 'Unable to load workspace.'}</p>
      </div>
    );
  }

  const status = formatSubscriptionStatus(ctx.workspace.stripe_subscription_status ?? undefined);
  const enterprise = ctx.planTerms?.pricing_model === 'enterprise_custom';

  const baselineChangeMonthly =
    ctx.effectiveMonthlyEur != null
      ? subscriptionMonthlyFromSliderIndex(clampSubscriptionIndexFromMonthly(ctx.effectiveMonthlyEur))
      : null;

  return (
    <div className="mx-auto max-w-6xl px-4 py-10 sm:px-6">
      <div className="mb-8">
        <h1 className="text-3xl font-semibold tracking-tight text-gray-900">Subscription & billing</h1>
        {billingViaStripe && hasActiveSubscription ? (
          <p className="mt-2 text-sm leading-relaxed text-gray-600">
            Payments are processed securely through{' '}
            <span className="inline-flex items-center gap-1.5 font-medium text-gray-900">
              <StripeMark className="h-[1.05em] w-[1.05em] shrink-0 text-[#635BFF]" aria-hidden />
              Stripe
            </span>
            . Invoices and payment methods live in your Stripe billing portal.
          </p>
        ) : null}
      </div>

      {pageError && (
        <div className="mb-6 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          {pageError}
        </div>
      )}

      {changeMessage && (
        <div className="mb-6 rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-900">
          {changeMessage}
        </div>
      )}

      {ctx.workspace.stripe_subscription_status && (
        <div className="mb-6">
          <SubscriptionBanner
            status={ctx.workspace.stripe_subscription_status}
            currentPeriodEnd={ctx.workspace.current_period_end ?? undefined}
          />
        </div>
      )}

      {ctx.planTerms?.pricing_model === 'legacy_tier' && ctx.planTerms.legacy_tier ? (
        <div className="mb-6 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-950">
          Legacy plan label (reporting): <span className="font-medium">{ctx.planTerms.legacy_tier}</span>. Your
          invoice still follows the Stripe subscription you started on until renewal.
        </div>
      ) : null}

      {enterprise ? (
        <div className="rounded-2xl border border-gray-200 bg-white p-8 shadow-sm">
          <h2 className="text-xl font-semibold text-gray-900">Custom agreement</h2>
          <p className="mt-2 text-gray-600">
            This workspace is on an enterprise arrangement. Capacity changes are coordinated with your account team
            rather than self-serve sliders.
          </p>
          <button
            type="button"
            onClick={handleManageBilling}
            disabled={managingBilling || !ctx.canManageBilling}
            className="mt-6 rounded-xl bg-gray-900 px-6 py-3 text-sm font-medium text-white hover:bg-gray-800 disabled:opacity-50"
          >
            {managingBilling ? 'Opening…' : 'Open billing portal'}
          </button>
        </div>
      ) : null}

      {!enterprise && hasActiveSubscription ? (
        ctx.canManageBilling ? (
          <div className="flex flex-col gap-8 lg:grid lg:min-h-0 lg:grid-cols-2 lg:gap-8 lg:[grid-template-rows:repeat(2,minmax(0,1fr))]">
            <div className="min-h-0 min-w-0 lg:flex lg:h-full lg:flex-col">
              <div className="flex h-full min-h-0 flex-col rounded-2xl border border-gray-200 bg-white p-8 shadow-sm">
                <div className="flex flex-wrap items-start justify-between gap-4">
                  <div>
                    <h2 className="text-xl font-semibold text-gray-900">Current monthly subscription</h2>
                    <p className="mt-1 text-sm text-gray-600">
                      {formatBillingInterval(ctx.workspace.subscription_interval ?? undefined)} billing ·{' '}
                      {ctx.effectiveMonthlyEur != null
                        ? formatEurMajor(ctx.effectiveMonthlyEur)
                        : 'See Stripe portal'}{' '}
                      equivalent monthly capacity
                    </p>
                  </div>
                  <span
                    className={`inline-block rounded-full px-4 py-2 text-sm font-medium ${
                      status.color === 'green'
                        ? 'bg-green-100 text-green-800'
                        : status.color === 'blue'
                          ? 'bg-blue-100 text-blue-800'
                          : status.color === 'orange'
                            ? 'bg-orange-100 text-orange-800'
                            : status.color === 'red'
                              ? 'bg-red-100 text-red-800'
                              : 'bg-gray-100 text-gray-800'
                    }`}
                  >
                    {status.label}
                  </span>
                </div>

                <div className="mt-6 grid gap-6 sm:grid-cols-2">
                  <div className="flex gap-4">
                    <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-gray-100">
                      <Calendar className="h-6 w-6 text-gray-700" aria-hidden />
                    </div>
                    <div>
                      <p className="text-sm text-gray-600">Next billing date</p>
                      <p className="text-lg font-semibold text-gray-900">
                        {ctx.workspace.current_period_end
                          ? new Date(ctx.workspace.current_period_end).toLocaleDateString('en-IE', {
                              day: 'numeric',
                              month: 'long',
                              year: 'numeric',
                            })
                          : '—'}
                      </p>
                    </div>
                  </div>
                  <div className="flex gap-4">
                    <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-gray-100">
                      <CreditCard className="h-6 w-6 text-gray-700" aria-hidden />
                    </div>
                    <div>
                      <p className="text-sm text-gray-600">Payment method</p>
                      <p className="text-lg font-semibold text-gray-900">On file in Stripe</p>
                    </div>
                  </div>
                </div>

                <div className="mt-auto shrink-0 pt-8">
                  <button
                    type="button"
                    onClick={handleManageBilling}
                    disabled={managingBilling || !ctx.canManageBilling}
                    className="flex w-full items-center justify-center gap-2 rounded-xl bg-gray-900 px-6 py-3 text-sm font-medium text-white hover:bg-gray-800 disabled:cursor-not-allowed disabled:opacity-50"
                  >
                    <StripeMark className="h-[1.125rem] w-[1.125rem] text-white" aria-hidden />
                    {managingBilling ? 'Opening…' : 'Manage billing (Stripe)'}
                  </button>
                </div>
              </div>
            </div>

            <div className="min-h-0 min-w-0 lg:flex lg:h-full lg:flex-col">
              <div className="flex h-full min-h-0 flex-col rounded-2xl border border-gray-200 bg-white p-8 shadow-sm">
                <h2 className="text-xl font-semibold text-gray-900">Change capacity (next billing cycle)</h2>
                <p className="mt-2 text-sm text-gray-600">
                  Drag to your new monthly amount. Changes below €4,000 are not available here. Downgrades below your
                  original commitment are blocked and routed to sales.
                </p>
                <div className="mt-8 min-h-0 flex-1">
                  <label className="block text-sm font-medium text-gray-700">
                    New monthly amount:{' '}
                    <span className="text-lg font-semibold text-gray-900">{formatEurMajor(changeMonthly)}</span>
                  </label>
                  <input
                    type="range"
                    min={0}
                    max={subscriptionSliderIndexCount() - 1}
                    value={changeIdx}
                    onChange={(e) => setChangeIdx(Number(e.target.value))}
                    className="mt-4 w-full accent-gray-900"
                  />
                  <div className="mt-2 flex justify-between text-xs text-gray-500">
                    <span>{formatEurMajor(SUBSCRIPTION_MONTHLY_MIN_EUR)}</span>
                    <span>{formatEurMajor(SUBSCRIPTION_MONTHLY_MAX_EUR)}</span>
                  </div>
                </div>
                <div className="mt-6 shrink-0">
                  <button
                    type="button"
                    onClick={handleScheduleChange}
                    disabled={
                      changeLoading ||
                      (baselineChangeMonthly != null && changeMonthly === baselineChangeMonthly)
                    }
                    className="w-full rounded-xl bg-[#bfe937] px-6 py-3 text-sm font-semibold text-gray-900 hover:bg-[#acd829] disabled:cursor-not-allowed disabled:opacity-50"
                  >
                    {changeLoading ? 'Scheduling…' : 'Schedule change from next cycle'}
                  </button>
                </div>
              </div>
            </div>

            <div className="min-h-0 min-w-0 lg:flex lg:h-full lg:flex-col">
              <div className="flex h-full min-h-0 flex-col rounded-2xl border border-gray-200 bg-white p-8 shadow-sm">
                <h2 className="text-xl font-semibold text-gray-900">Budget overview</h2>
                <div className="mt-4 min-h-0 flex-1 space-y-3 text-sm">
                  <div className="flex justify-between border-b border-gray-100 py-2">
                    <span className="text-gray-600">Purchased balance</span>
                    <span className="font-medium text-gray-900">{formatAmount(startingBalance, currency)}</span>
                  </div>
                  <div className="flex justify-between border-b border-gray-100 py-2">
                    <span className="text-gray-600">Used</span>
                    <span className="font-medium text-red-600">
                      −{formatAmount(ctx.projectCosts.usedBalance, currency)}
                    </span>
                  </div>
                  <div className="flex justify-between border-b border-gray-100 py-2">
                    <span className="text-gray-600">Committed</span>
                    <span className="font-medium text-orange-600">
                      −{formatAmount(ctx.projectCosts.committedBalance, currency)}
                    </span>
                  </div>
                  <div className="flex justify-between py-2">
                    <span className="font-semibold text-gray-900">Available</span>
                    <span className="font-semibold text-green-600">{formatAmount(availableBalance, currency)}</span>
                  </div>
                </div>
                <div className="mt-auto shrink-0 pt-4">
                  <button
                    type="button"
                    onClick={() => router.push('/account/usage')}
                    className="w-full bg-transparent p-0 text-left text-sm text-gray-600 underline-offset-2 hover:text-gray-900 hover:underline"
                  >
                    View detailed usage
                  </button>
                </div>
              </div>
            </div>

            <div className="min-h-0 min-w-0 lg:flex lg:h-full lg:flex-col">
              <BoosterUpsellCard onBuyBoosters={() => router.push('/plan/boosters')} />
            </div>
          </div>
        ) : (
          <div className="flex flex-col gap-8 lg:grid lg:min-h-0 lg:grid-cols-2 lg:gap-8 lg:[grid-template-rows:repeat(2,minmax(0,1fr))]">
            <div className="min-h-0 min-w-0 lg:flex lg:h-full lg:flex-col">
              <div className="flex h-full min-h-0 flex-col rounded-2xl border border-gray-200 bg-white p-8 shadow-sm">
                <div className="flex flex-wrap items-start justify-between gap-4">
                  <div>
                    <h2 className="text-xl font-semibold text-gray-900">Current monthly subscription</h2>
                    <p className="mt-1 text-sm text-gray-600">
                      {formatBillingInterval(ctx.workspace.subscription_interval ?? undefined)} billing ·{' '}
                      {ctx.effectiveMonthlyEur != null
                        ? formatEurMajor(ctx.effectiveMonthlyEur)
                        : 'See Stripe portal'}{' '}
                      equivalent monthly capacity
                    </p>
                  </div>
                  <span
                    className={`inline-block rounded-full px-4 py-2 text-sm font-medium ${
                      status.color === 'green'
                        ? 'bg-green-100 text-green-800'
                        : status.color === 'blue'
                          ? 'bg-blue-100 text-blue-800'
                          : status.color === 'orange'
                            ? 'bg-orange-100 text-orange-800'
                            : status.color === 'red'
                              ? 'bg-red-100 text-red-800'
                              : 'bg-gray-100 text-gray-800'
                    }`}
                  >
                    {status.label}
                  </span>
                </div>

                <div className="mt-6 grid gap-6 sm:grid-cols-2">
                  <div className="flex gap-4">
                    <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-gray-100">
                      <Calendar className="h-6 w-6 text-gray-700" aria-hidden />
                    </div>
                    <div>
                      <p className="text-sm text-gray-600">Next billing date</p>
                      <p className="text-lg font-semibold text-gray-900">
                        {ctx.workspace.current_period_end
                          ? new Date(ctx.workspace.current_period_end).toLocaleDateString('en-IE', {
                              day: 'numeric',
                              month: 'long',
                              year: 'numeric',
                            })
                          : '—'}
                      </p>
                    </div>
                  </div>
                  <div className="flex gap-4">
                    <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-gray-100">
                      <CreditCard className="h-6 w-6 text-gray-700" aria-hidden />
                    </div>
                    <div>
                      <p className="text-sm text-gray-600">Payment method</p>
                      <p className="text-lg font-semibold text-gray-900">On file in Stripe</p>
                    </div>
                  </div>
                </div>

                <div className="mt-auto shrink-0 pt-8">
                  <button
                    type="button"
                    onClick={handleManageBilling}
                    disabled={managingBilling || !ctx.canManageBilling}
                    className="flex w-full items-center justify-center gap-2 rounded-xl bg-gray-900 px-6 py-3 text-sm font-medium text-white hover:bg-gray-800 disabled:cursor-not-allowed disabled:opacity-50"
                  >
                    <StripeMark className="h-[1.125rem] w-[1.125rem] text-white" aria-hidden />
                    {managingBilling ? 'Opening…' : 'Manage billing (Stripe)'}
                  </button>
                </div>
              </div>
            </div>

            <div className="min-h-0 min-w-0 lg:col-start-2 lg:row-span-2 lg:flex lg:h-full lg:flex-col">
              <BoosterUpsellCard onBuyBoosters={() => router.push('/plan/boosters')} />
            </div>

            <div className="min-h-0 min-w-0 lg:flex lg:h-full lg:flex-col">
              <div className="flex h-full min-h-0 flex-col rounded-2xl border border-gray-200 bg-white p-8 shadow-sm">
                <h2 className="text-xl font-semibold text-gray-900">Budget overview</h2>
                <div className="mt-4 min-h-0 flex-1 space-y-3 text-sm">
                  <div className="flex justify-between border-b border-gray-100 py-2">
                    <span className="text-gray-600">Purchased balance</span>
                    <span className="font-medium text-gray-900">{formatAmount(startingBalance, currency)}</span>
                  </div>
                  <div className="flex justify-between border-b border-gray-100 py-2">
                    <span className="text-gray-600">Used</span>
                    <span className="font-medium text-red-600">
                      −{formatAmount(ctx.projectCosts.usedBalance, currency)}
                    </span>
                  </div>
                  <div className="flex justify-between border-b border-gray-100 py-2">
                    <span className="text-gray-600">Committed</span>
                    <span className="font-medium text-orange-600">
                      −{formatAmount(ctx.projectCosts.committedBalance, currency)}
                    </span>
                  </div>
                  <div className="flex justify-between py-2">
                    <span className="font-semibold text-gray-900">Available</span>
                    <span className="font-semibold text-green-600">{formatAmount(availableBalance, currency)}</span>
                  </div>
                </div>
                <div className="mt-auto shrink-0 pt-4">
                  <button
                    type="button"
                    onClick={() => router.push('/account/usage')}
                    className="w-full bg-transparent p-0 text-left text-sm text-gray-600 underline-offset-2 hover:text-gray-900 hover:underline"
                  >
                    View detailed usage
                  </button>
                </div>
              </div>
            </div>
          </div>
        )
      ) : null}

      {!enterprise && !hasActiveSubscription ? (
        <div className="space-y-6">
          <div className="relative overflow-hidden rounded-3xl border border-gray-200/80 bg-gradient-to-br from-white via-gray-50/80 to-[#f4fce0]/60 px-6 py-8 sm:px-10 sm:py-10">
            <div
              className="pointer-events-none absolute -right-16 -top-16 h-56 w-56 rounded-full bg-[#bfe937]/20 blur-3xl"
              aria-hidden
            />
            <div className="relative max-w-3xl">
              <div className="inline-flex items-center gap-2 rounded-full border border-gray-200/80 bg-white/80 px-3 py-1 text-xs font-medium text-gray-700 shadow-sm backdrop-blur-sm">
                <Sparkles className="h-3.5 w-3.5 text-gray-700" aria-hidden />
                Flexible capacity subscription
              </div>
              <h2 className="mt-4 text-3xl font-semibold tracking-tight text-gray-900 sm:text-4xl">
                Pay for the capacity you need
              </h2>
              <p className="mt-3 max-w-2xl text-base leading-relaxed text-gray-600">
                One subscription covers your client portal and delivery capacity. Start at{' '}
                {formatEurMajor(SUBSCRIPTION_MONTHLY_MIN_EUR)}/month, then choose a billing cycle with prepay savings.
              </p>
            </div>
          </div>

          <div className="overflow-hidden rounded-3xl border border-gray-200/80 bg-white shadow-[0_8px_30px_rgb(0,0,0,0.04)] ring-1 ring-gray-100">
            <div className="grid lg:grid-cols-[1.15fr_0.85fr]">
              <div className="border-b border-gray-100 p-6 sm:p-8 lg:border-b-0 lg:border-r">
                <div className="rounded-2xl border border-gray-100 bg-gradient-to-b from-gray-50/80 to-white p-5 sm:p-6">
                  <p className="text-sm font-medium text-gray-600">Monthly capacity</p>
                  <p className="mt-1 tabular-nums text-5xl font-bold tracking-tight text-gray-900 sm:text-6xl">
                    {formatEurMajor(subscribeMonthly)}
                  </p>
                  <p className="mt-2 text-sm text-gray-500">
                    Adjust in {formatEurMajor(SUBSCRIPTION_STEP_EUR)} steps · up to{' '}
                    {formatEurMajor(SUBSCRIPTION_MONTHLY_MAX_EUR)}
                  </p>
                </div>

                <fieldset className="mt-8">
                  <legend className="text-sm font-semibold text-gray-900">Billing cycle</legend>
                  <div className="mt-3 grid gap-3 sm:grid-cols-2">
                    {SUBSCRIBE_BILLING_OPTIONS.map((opt) => {
                      const selected = billingPeriod === opt.id;
                      const savingsLabel = billingPeriodSavingsLabel(opt.id);
                      return (
                        <label
                          key={opt.id}
                          className={`relative flex cursor-pointer flex-col rounded-xl border p-4 text-left transition-all ${
                            selected
                              ? 'border-gray-900 bg-gray-900/[0.03] shadow-sm ring-2 ring-gray-900 ring-offset-2 ring-offset-white'
                              : 'border-gray-200 bg-white hover:border-gray-300 hover:shadow-sm'
                          }`}
                        >
                          <span className="sr-only">
                            <input
                              type="radio"
                              name="billing-period"
                              value={opt.id}
                              checked={selected}
                              onChange={() => setBillingPeriod(opt.id)}
                            />
                          </span>
                          <span className="flex items-start justify-between gap-2">
                            <span className="font-semibold text-gray-900">{opt.label}</span>
                            {savingsLabel ? (
                              <span className="shrink-0 rounded-full bg-emerald-100 px-2 py-0.5 text-[11px] font-semibold uppercase tracking-wide text-emerald-800">
                                {savingsLabel}
                              </span>
                            ) : (
                              <span className="shrink-0 rounded-full bg-gray-100 px-2 py-0.5 text-[11px] font-medium text-gray-600">
                                Flexible
                              </span>
                            )}
                          </span>
                          <span className="mt-2 text-xs leading-relaxed text-gray-600">{opt.description}</span>
                        </label>
                      );
                    })}
                  </div>
                </fieldset>

                <div className="mt-8">
                  <div className="mb-2 flex items-center justify-between text-xs font-medium text-gray-500">
                    <span>Capacity</span>
                    <span className="tabular-nums text-gray-900">{formatEurMajor(subscribeMonthly)}</span>
                  </div>
                  <input
                    type="range"
                    min={0}
                    max={subscriptionSliderIndexCount() - 1}
                    value={subIdx}
                    onChange={(e) => setSubIdx(Number(e.target.value))}
                    className="h-2 w-full cursor-pointer appearance-none rounded-full bg-gray-200 accent-gray-900 [&::-webkit-slider-thumb]:h-5 [&::-webkit-slider-thumb]:w-5 [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:border-2 [&::-webkit-slider-thumb]:border-white [&::-webkit-slider-thumb]:bg-gray-900 [&::-webkit-slider-thumb]:shadow-md"
                  />
                  <div className="mt-4 grid grid-cols-4 gap-1 text-[11px] text-gray-500 sm:grid-cols-8">
                    {SUBSCRIPTION_ANCHOR_EUR.map((v) => (
                      <span key={v} className="tabular-nums text-center sm:text-left">
                        {formatEurMajor(v)}
                      </span>
                    ))}
                  </div>
                </div>

                <div className="mt-8 grid gap-4 rounded-2xl border border-gray-100 bg-gray-50/80 p-5 sm:grid-cols-2 sm:p-6">
                  <div className="rounded-xl bg-white p-4 shadow-sm ring-1 ring-gray-100">
                    <p className="text-[11px] font-semibold uppercase tracking-wider text-gray-500">
                      {billingPeriod === 'monthly' ? 'Each invoice' : 'Gross before discount'}
                    </p>
                    <p className="mt-1 tabular-nums text-2xl font-semibold text-gray-900">
                      {formatEurMajor(commitmentGrossEur(subscribeMonthly, billingPeriod))}
                    </p>
                  </div>
                  <div className="rounded-xl bg-white p-4 shadow-sm ring-1 ring-gray-100">
                    <p className="text-[11px] font-semibold uppercase tracking-wider text-gray-500">You pay per cycle</p>
                    <p className="mt-1 tabular-nums text-2xl font-semibold text-gray-900">
                      {formatEurMajor(commitmentPeriodChargeEur(subscribeMonthly, billingPeriod))}
                    </p>
                  </div>
                  {commitmentSavingsVsGrossEur(subscribeMonthly, billingPeriod) > 0 ? (
                    <div className="rounded-xl border border-emerald-100 bg-emerald-50/80 p-4 sm:col-span-2">
                      <p className="text-[11px] font-semibold uppercase tracking-wider text-emerald-800/80">
                        You save vs. undiscounted
                      </p>
                      <p className="mt-1 tabular-nums text-2xl font-semibold text-emerald-800">
                        {formatEurMajor(commitmentSavingsVsGrossEur(subscribeMonthly, billingPeriod))}
                      </p>
                    </div>
                  ) : null}
                </div>
              </div>

              <div className="flex flex-col bg-gray-50/50 p-6 sm:p-8">
                <h3 className="text-sm font-semibold uppercase tracking-wider text-gray-500">What&apos;s included</h3>
                <ul className="mt-5 flex-1 space-y-4">
                  {[
                    'Client portal, monitoring, and integrations',
                    'Dedicated delivery team and Slack Connect workspace',
                    'SLA-backed response within subscription scope',
                    'Rollover of unused capacity (3-month window, capped at 1.5× monthly)',
                  ].map((line) => (
                    <li key={line} className="flex gap-3 text-sm leading-relaxed text-gray-800">
                      <span className="mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-[#bfe937]/30">
                        <Check className="h-3.5 w-3.5 text-gray-900" aria-hidden />
                      </span>
                      {line}
                    </li>
                  ))}
                </ul>

                <p className="mt-6 text-sm text-gray-600">
                  Need more than {formatEurMajor(SUBSCRIPTION_MONTHLY_MAX_EUR)}?{' '}
                  <a
                    href="mailto:sales@superwork.com"
                    className="font-semibold text-gray-900 underline decoration-gray-400 underline-offset-2 hover:decoration-gray-900"
                  >
                    Talk to sales
                  </a>
                </p>

                <button
                  type="button"
                  onClick={handleSubscribe}
                  disabled={checkoutLoading || !ctx.canManageBilling}
                  className="mt-6 flex w-full items-center justify-center gap-2 rounded-xl bg-[#bfe937] px-6 py-4 text-base font-semibold text-gray-900 shadow-sm transition-colors hover:bg-[#acd829] disabled:cursor-not-allowed disabled:opacity-50"
                >
                  {checkoutLoading ? (
                    'Redirecting to Stripe…'
                  ) : (
                    <>
                      <Lock className="h-4 w-4 shrink-0 opacity-90" aria-hidden />
                      Continue to secure checkout
                    </>
                  )}
                </button>
                <p className="mt-3 flex items-center justify-center gap-1.5 text-xs text-gray-500">
                  <StripeMark className="h-3.5 w-3.5 shrink-0 text-[#635BFF]" aria-hidden />
                  Payments secured by Stripe
                </p>
                {!ctx.canManageBilling ? (
                  <p className="mt-2 text-center text-xs text-gray-500">
                    Only workspace owners and admins can subscribe.
                  </p>
                ) : null}
              </div>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}
