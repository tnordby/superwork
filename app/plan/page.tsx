'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Calendar, Check, CreditCard, Zap } from 'lucide-react';
import { formatAmount, formatBillingInterval, formatSubscriptionStatus } from '@/lib/stripe/utils';
import { SubscriptionBanner } from '@/components/billing/SubscriptionBanner';
import { StripeMark } from '@/components/billing/StripeMark';
import {
  SUBSCRIPTION_ANCHOR_EUR,
  SUBSCRIPTION_MONTHLY_MAX_EUR,
  SUBSCRIPTION_MONTHLY_MIN_EUR,
  SUBSCRIPTION_STEP_EUR,
  annualAmountEur,
  annualPrepaySavingsEur,
  subscriptionMonthlyFromSliderIndex,
  subscriptionSliderIndexCount,
  subscriptionSliderIndexFromMonthly,
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

export default function PlanPage() {
  const router = useRouter();
  const [ctx, setCtx] = useState<PlanContextResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [pageError, setPageError] = useState<string | null>(null);
  const [subIdx, setSubIdx] = useState(0);
  const [annualPrepay, setAnnualPrepay] = useState(false);
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
      if (data.planTerms?.annual_prepay) setAnnualPrepay(true);
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
            annualPrepay,
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
        <h1 className="text-3xl font-semibold text-gray-900">Subscription & billing</h1>
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
                    <span className="text-gray-600">Purchased balance (anchor)</span>
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
              <div className="flex h-full min-h-0 flex-col justify-center rounded-2xl border border-gray-200 bg-white p-8 text-center shadow-sm">
                <p className="text-sm text-gray-700">Need a short-term capacity expansion?</p>
                <button
                  type="button"
                  onClick={() => router.push('/plan/boosters')}
                  className="mt-3 inline-flex items-center justify-center gap-2 text-sm font-semibold text-gray-900 underline-offset-2 hover:underline"
                >
                  <Zap className="h-4 w-4" aria-hidden />
                  Buy Boosters
                </button>
              </div>
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
              <div className="flex h-full min-h-0 flex-col justify-center rounded-2xl border border-gray-200 bg-white p-8 text-center shadow-sm">
                <p className="text-sm text-gray-700">Need a short-term capacity expansion?</p>
                <button
                  type="button"
                  onClick={() => router.push('/plan/boosters')}
                  className="mt-3 inline-flex items-center justify-center gap-2 text-sm font-semibold text-gray-900 underline-offset-2 hover:underline"
                >
                  <Zap className="h-4 w-4" aria-hidden />
                  Buy Boosters
                </button>
              </div>
            </div>

            <div className="min-h-0 min-w-0 lg:flex lg:h-full lg:flex-col">
              <div className="flex h-full min-h-0 flex-col rounded-2xl border border-gray-200 bg-white p-8 shadow-sm">
                <h2 className="text-xl font-semibold text-gray-900">Budget overview</h2>
                <div className="mt-4 min-h-0 flex-1 space-y-3 text-sm">
                  <div className="flex justify-between border-b border-gray-100 py-2">
                    <span className="text-gray-600">Purchased balance (anchor)</span>
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
        <div className="grid grid-cols-1 gap-8 lg:grid-cols-2 lg:items-stretch lg:gap-10">
          <div className="text-center lg:flex lg:max-w-xl lg:flex-col lg:justify-center lg:text-left">
            <h2 className="text-3xl font-semibold tracking-tight text-gray-900 sm:text-4xl">
              Pay for the capacity you need. Starting at €4,000/month.
            </h2>
            <p className="mx-auto mt-3 max-w-2xl text-sm text-gray-600 lg:mx-0">
              One subscription covers platform access and delivery capacity. No separate platform fee — annual
              commitment, with optional annual prepay savings.
            </p>
          </div>

          <div className="flex min-h-0 flex-col rounded-2xl border border-gray-200 bg-white p-6 shadow-sm sm:p-8 lg:h-full lg:min-h-0">
            <div className="grid min-h-0 flex-1 grid-cols-1 gap-8 xl:grid-cols-2 xl:items-stretch xl:gap-8">
              <div className="flex min-h-0 flex-1 flex-col xl:h-full">
                <div className="flex flex-wrap items-end justify-between gap-4">
                  <div>
                    <p className="text-sm font-medium text-gray-600">Monthly subscription</p>
                    <p className="text-4xl font-bold text-gray-900">{formatEurMajor(subscribeMonthly)}</p>
                    <p className="mt-1 text-sm text-gray-500">
                      €500 steps · up to {formatEurMajor(SUBSCRIPTION_MONTHLY_MAX_EUR)} in-app
                    </p>
                  </div>
                  <label className="flex cursor-pointer items-center gap-2 text-sm text-gray-800">
                    <input
                      type="checkbox"
                      checked={annualPrepay}
                      onChange={(e) => setAnnualPrepay(e.target.checked)}
                      className="h-4 w-4 rounded border-gray-300 accent-gray-900"
                    />
                    Annual prepay (8% off)
                  </label>
                </div>

                <div className="mt-8">
                  <input
                    type="range"
                    min={0}
                    max={subscriptionSliderIndexCount() - 1}
                    value={subIdx}
                    onChange={(e) => setSubIdx(Number(e.target.value))}
                    className="w-full accent-gray-900"
                  />
                  <div className="mt-3 flex flex-wrap justify-between gap-x-2 gap-y-1 text-xs text-gray-500">
                    {SUBSCRIPTION_ANCHOR_EUR.map((v) => (
                      <span key={v}>{formatEurMajor(v)}</span>
                    ))}
                  </div>
                </div>

                <div className="min-h-0 flex-1" aria-hidden />

                <div className="mt-8 grid gap-4 rounded-xl bg-gray-50 p-6 sm:grid-cols-2">
                  <div>
                    <p className="text-xs font-medium uppercase tracking-wide text-gray-500">
                      Annual commitment (gross)
                    </p>
                    <p className="text-2xl font-semibold text-gray-900">
                      {formatEurMajor(annualAmountEur(subscribeMonthly, false))}
                    </p>
                  </div>
                  {annualPrepay ? (
                    <>
                      <div>
                        <p className="text-xs font-medium uppercase tracking-wide text-gray-500">Annual prepay total</p>
                        <p className="text-2xl font-semibold text-gray-900">
                          {formatEurMajor(annualAmountEur(subscribeMonthly, true))}
                        </p>
                      </div>
                      <div>
                        <p className="text-xs font-medium uppercase tracking-wide text-gray-500">You save</p>
                        <p className="text-2xl font-semibold text-emerald-700">
                          {formatEurMajor(annualPrepaySavingsEur(subscribeMonthly))}
                        </p>
                      </div>
                    </>
                  ) : null}
                </div>
              </div>

              <div className="flex min-h-0 flex-col gap-6 border-t border-gray-100 pt-8 xl:mt-0 xl:h-full xl:border-l xl:border-t-0 xl:pl-8 xl:pt-0">
                <div className="min-h-0 flex-1">
                  <h3 className="text-sm font-semibold uppercase tracking-wide text-gray-500">What&apos;s included</h3>
                  <ul className="mt-4 space-y-3">
                    {[
                      'Client portal, monitoring, and integrations',
                      'Dedicated delivery team and Slack Connect workspace',
                      'SLA-backed response within subscription scope',
                      'Rollover of unused capacity (3-month window, capped at 1.5× your monthly subscription amount)',
                    ].map((line) => (
                      <li key={line} className="flex gap-3 text-sm text-gray-800">
                        <Check className="mt-0.5 h-5 w-5 shrink-0 text-gray-900" aria-hidden />
                        {line}
                      </li>
                    ))}
                  </ul>
                </div>

                <p className="shrink-0 text-center text-sm text-gray-600 xl:text-left">
                  Custom needs above {formatEurMajor(SUBSCRIPTION_MONTHLY_MAX_EUR)}?{' '}
                  <a href="mailto:sales@superwork.com" className="font-medium text-gray-900 underline">
                    Talk to sales
                  </a>
                </p>

                <button
                  type="button"
                  onClick={handleSubscribe}
                  disabled={checkoutLoading || !ctx.canManageBilling}
                  className="mt-auto w-full shrink-0 rounded-xl bg-gray-900 px-6 py-4 text-base font-medium text-white hover:bg-gray-800 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  {checkoutLoading ? 'Redirecting to Stripe…' : 'Continue to secure checkout'}
                </button>
                {!ctx.canManageBilling ? (
                  <p className="mt-3 shrink-0 text-center text-xs text-gray-500 xl:text-left">
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
