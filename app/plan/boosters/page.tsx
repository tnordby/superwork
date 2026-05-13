'use client';

import { Suspense, useCallback, useEffect, useMemo, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { ArrowLeft } from 'lucide-react';
import {
  boosterAmountFromSliderIndex,
  boosterSliderIndexCount,
} from '@/lib/billing/capacity-pricing';

type PlanContextResponse = {
  workspace: { id: string; stripe_subscription_id?: string | null; stripe_subscription_status?: string | null };
  planTerms: { monthly_budget_eur: number } | null;
  effectiveMonthlyEur: number | null;
  stripePreview: { perPeriodCents: number | null; interval: string | null };
  canManageBilling: boolean;
};

function formatEurMajor(amountEur: number): string {
  return new Intl.NumberFormat('en-IE', {
    style: 'currency',
    currency: 'EUR',
    maximumFractionDigits: 0,
  }).format(amountEur);
}

export default function PlanBoostersPage() {
  return (
    <Suspense fallback={<div className="mx-auto max-w-3xl px-4 py-16 text-center text-gray-600">Loading…</div>}>
      <PlanBoostersContent />
    </Suspense>
  );
}

function PlanBoostersContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const paid = searchParams.get('paid');

  const [ctx, setCtx] = useState<PlanContextResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [idx, setIdx] = useState(0);
  const [checkoutLoading, setCheckoutLoading] = useState(false);

  const load = useCallback(async () => {
    setError(null);
    try {
      const res = await fetch('/api/plan/workspace-context', { credentials: 'include' });
      const data = (await res.json()) as PlanContextResponse & { error?: string };
      if (!res.ok) throw new Error(typeof data.error === 'string' ? data.error : 'Failed to load');
      setCtx(data);
      const monthly =
        data.effectiveMonthlyEur ??
        (data.planTerms?.monthly_budget_eur != null ? Number(data.planTerms.monthly_budget_eur) : 0);
      if (monthly > 0) {
        setIdx(0);
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to load');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const monthlyBase = useMemo(() => {
    if (!ctx) return 0;
    const m =
      ctx.effectiveMonthlyEur ??
      (ctx.planTerms?.monthly_budget_eur != null ? Number(ctx.planTerms.monthly_budget_eur) : 0);
    if (m > 0) return m;
    if (ctx.stripePreview.perPeriodCents != null) {
      if (ctx.stripePreview.interval === 'year') {
        const annualMajor = ctx.stripePreview.perPeriodCents / 100;
        return Math.round((annualMajor / 12 / 0.92) * 100) / 100;
      }
      return ctx.stripePreview.perPeriodCents / 100;
    }
    return 0;
  }, [ctx]);

  const amount = monthlyBase > 0 ? boosterAmountFromSliderIndex(monthlyBase, idx) : 0;

  const hasActive =
    ctx?.workspace.stripe_subscription_status &&
    ['active', 'trialing'].includes(ctx.workspace.stripe_subscription_status);

  const handleBuy = async () => {
    if (!ctx?.workspace.id || !monthlyBase) return;
    setCheckoutLoading(true);
    setError(null);
    try {
      const res = await fetch('/api/stripe/create-booster-checkout', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ workspaceId: ctx.workspace.id, amountEur: amount }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Checkout failed');
      if (data.url) window.location.href = data.url;
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Checkout failed');
    } finally {
      setCheckoutLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="mx-auto max-w-3xl px-4 py-16 text-center text-gray-600">
        Loading Boosters…
      </div>
    );
  }

  if (!ctx || error) {
    return (
      <div className="mx-auto max-w-3xl px-4 py-16">
        <p className="text-red-600">{error ?? 'Unable to load workspace.'}</p>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-2xl px-4 py-10 sm:px-6">
      <button
        type="button"
        onClick={() => router.push('/plan')}
        className="mb-8 inline-flex items-center gap-2 text-sm font-medium text-gray-600 hover:text-gray-900"
      >
        <ArrowLeft className="h-4 w-4" aria-hidden />
        Back to subscription
      </button>

      {paid === '1' ? (
        <div className="mb-8 rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-900">
          Payment received. Your one-off Booster will appear on the workspace as soon as Stripe confirms the session
          (usually within a minute).
        </div>
      ) : null}

      <h1 className="mt-2 text-3xl font-semibold text-gray-900">Extra capacity on top of your current plan</h1>
      <p className="mt-3 text-sm text-gray-600">
        A Booster is one payment on top of your plan—your subscription stays the same and this charge does not renew.
      </p>

      {!hasActive ? (
        <p className="mt-8 rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-950">
          You need an active subscription before purchasing Boosters.
        </p>
      ) : monthlyBase <= 0 ? (
        <p className="mt-8 rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-950">
          We couldn&apos;t read your monthly subscription amount. Open the billing portal once, then retry — or
          contact support.
        </p>
      ) : (
        <div className="mt-10 rounded-2xl border border-gray-200 bg-white p-8 shadow-sm">
          <div>
            <p className="text-sm font-medium text-gray-600">One-time purchase amount</p>
            <p className="mt-2 text-4xl font-bold text-gray-900">{formatEurMajor(amount)}</p>
            <p className="mt-2 text-xs text-gray-500">
              Charged once at checkout. This is separate from your subscription billing and does not roll into your
              next renewal.
            </p>
          </div>

          <div className="mt-8">
            <input
              type="range"
              min={0}
              max={Math.max(0, boosterSliderIndexCount(monthlyBase) - 1)}
              value={idx}
              onChange={(e) => setIdx(Number(e.target.value))}
              className="w-full accent-gray-900"
            />
          </div>

          <button
            type="button"
            onClick={handleBuy}
            disabled={checkoutLoading || !ctx.canManageBilling || !hasActive}
            className="mt-8 w-full rounded-xl bg-gray-900 px-6 py-4 text-base font-medium text-white hover:bg-gray-800 disabled:cursor-not-allowed disabled:opacity-50"
          >
            {checkoutLoading ? 'Redirecting to Stripe…' : 'Buy one-time Booster'}
          </button>
          {!ctx.canManageBilling ? (
            <p className="mt-3 text-center text-xs text-gray-500">Only workspace owners and admins can purchase.</p>
          ) : null}
        </div>
      )}
    </div>
  );
}
