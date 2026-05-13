'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';

type Row = {
  id: string;
  name: string;
  stripe_subscription_id: string | null;
  stripe_subscription_status: string | null;
  planTerms: {
    pricing_model: string;
    legacy_tier?: string | null;
    monthly_budget_eur: number;
    committed_monthly_floor_eur?: number | null;
    sales_escalation_at?: string | null;
  } | null;
};

function formatEur(n: number | null | undefined): string {
  if (n == null || !Number.isFinite(Number(n))) return '—';
  return new Intl.NumberFormat('en-IE', { style: 'currency', currency: 'EUR', maximumFractionDigits: 0 }).format(
    Number(n)
  );
}

export default function AdminBillingPage() {
  const [rows, setRows] = useState<Row[]>([]);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    const load = async () => {
      try {
        const res = await fetch('/api/admin/workspace-pricing');
        const data = await res.json();
        if (!res.ok) throw new Error(data.error || 'Failed to load');
        if (!cancelled) setRows(data.rows ?? []);
      } catch (e) {
        if (!cancelled) setError(e instanceof Error ? e.message : 'Failed to load');
      }
    };
    void load();
    return () => {
      cancelled = true;
    };
  }, []);

  return (
    <div>
      <div className="mb-8">
        <h1 className="text-2xl font-semibold text-gray-900">Workspace pricing</h1>
        <p className="mt-2 text-sm text-gray-600">
          Distinguish slider-based plans from legacy Stripe tiers. Sales flags appear when a client requests a
          downgrade below their committed floor.
        </p>
      </div>

      {error && (
        <div className="mb-6 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">{error}</div>
      )}

      <div className="overflow-x-auto rounded-lg border border-gray-200 bg-white shadow-sm">
        <table className="min-w-full divide-y divide-gray-200 text-left text-sm">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-4 py-3 font-medium text-gray-700">Workspace</th>
              <th className="px-4 py-3 font-medium text-gray-700">Pricing model</th>
              <th className="px-4 py-3 font-medium text-gray-700">Legacy label</th>
              <th className="px-4 py-3 font-medium text-gray-700">Monthly budget</th>
              <th className="px-4 py-3 font-medium text-gray-700">Committed floor</th>
              <th className="px-4 py-3 font-medium text-gray-700">Stripe status</th>
              <th className="px-4 py-3 font-medium text-gray-700">Sales flag</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {rows.map((r) => (
              <tr key={r.id}>
                <td className="px-4 py-3 font-medium text-gray-900">{r.name}</td>
                <td className="px-4 py-3 text-gray-700">{r.planTerms?.pricing_model ?? '—'}</td>
                <td className="px-4 py-3 text-gray-700">{r.planTerms?.legacy_tier ?? '—'}</td>
                <td className="px-4 py-3 text-gray-700">{formatEur(r.planTerms?.monthly_budget_eur)}</td>
                <td className="px-4 py-3 text-gray-700">{formatEur(r.planTerms?.committed_monthly_floor_eur)}</td>
                <td className="px-4 py-3 text-gray-700">{r.stripe_subscription_status ?? '—'}</td>
                <td className="px-4 py-3 text-gray-700">
                  {r.planTerms?.sales_escalation_at
                    ? new Date(r.planTerms.sales_escalation_at).toLocaleString('en-IE')
                    : '—'}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <p className="mt-6 text-sm text-gray-500">
        <Link href="/admin" className="text-blue-600 hover:underline">
          ← Back to admin
        </Link>
      </p>
    </div>
  );
}
