'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useParams } from 'next/navigation';

type Quote = {
  id: string;
  title: string;
  description: string | null;
  status: string;
  currency: string | null;
  final_price: number | null;
  client_first_name: string | null;
  client_last_name: string | null;
  client_email: string | null;
  client_company_name: string | null;
  milestones?: {
    title: string;
    description: string | null;
  }[];
};

function getStatusLabel(status: string): string {
  if (status === 'approved') return 'Accepted';
  if (status === 'rejected') return 'Rejected';
  return 'Pending';
}

export default function QuoteDetailPage() {
  const params = useParams<{ id: string }>();
  const quoteId = params.id;

  const [quote, setQuote] = useState<Quote | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  async function loadQuote() {
    const response = await fetch(`/api/quotes/${quoteId}`, { credentials: 'include' });
    const data = await response.json();
    if (response.ok) setQuote(data.quote);
    setLoading(false);
  }

  useEffect(() => {
    loadQuote();
  }, [quoteId]);

  async function handleApprove() {
    setSaving(true);
    const response = await fetch(`/api/quotes/${quoteId}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include',
      body: JSON.stringify({ status: 'approved' }),
    });
    const data = await response.json();
    if (!response.ok) {
      alert(data.error || 'Could not approve quote');
      setSaving(false);
      return;
    }
    await loadQuote();
    setSaving(false);
    alert('Quote approved. Your budget has been deducted and the project is now created.');
  }

  async function handleReject() {
    const reason = window.prompt('Reason for rejection (optional)') || '';
    setSaving(true);
    const response = await fetch(`/api/quotes/${quoteId}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include',
      body: JSON.stringify({ status: 'rejected', rejection_reason: reason }),
    });
    const data = await response.json();
    if (!response.ok) {
      alert(data.error || 'Could not reject quote');
      setSaving(false);
      return;
    }
    await loadQuote();
    setSaving(false);
  }

  if (loading) return <div className="p-8">Loading...</div>;
  if (!quote) return <div className="p-8 text-red-600">Quote not found.</div>;

  return (
    <div className="p-8 space-y-6">
      <div>
        <Link href="/quotes" className="text-sm text-gray-600 hover:text-gray-900">
          ← Back to quotes
        </Link>
        <h1 className="mt-2 text-3xl font-semibold text-gray-900">{quote.title}</h1>
        <p className="text-sm text-gray-600">Status: {getStatusLabel(quote.status)}</p>
      </div>

      {quote.description && (
        <div className="rounded-xl border border-gray-200 bg-white p-5 text-sm text-gray-700 whitespace-pre-wrap">
          {quote.description}
        </div>
      )}

      <div className="rounded-xl border border-gray-200 bg-white p-5">
        <p className="text-xs uppercase tracking-wide text-gray-500">Quote for</p>
        <p className="mt-1 text-base font-medium text-gray-900">
          {[quote.client_first_name, quote.client_last_name].filter(Boolean).join(' ') || '—'}
        </p>
        <p className="text-sm text-gray-600">{quote.client_email || '—'}</p>
        <p className="text-sm text-gray-600">{quote.client_company_name || '—'}</p>
      </div>

      <div className="rounded-xl border border-gray-200 bg-white p-5">
        <p className="text-xs uppercase tracking-wide text-gray-500">Final Price</p>
        <p className="mt-1 text-3xl font-semibold text-gray-900">
          {quote.final_price != null ? `${quote.final_price} ${quote.currency || ''}` : 'Pending'}
        </p>
      </div>

      <div className="rounded-xl border border-gray-200 bg-white p-5">
        <p className="text-xs uppercase tracking-wide text-gray-500">Milestones</p>
        {quote.milestones && quote.milestones.length > 0 ? (
          <div className="mt-3 space-y-3">
            {quote.milestones.map((m, idx) => (
              <div key={`${m.title}-${idx}`} className="rounded-lg border border-gray-100 p-3">
                <p className="text-sm font-medium text-gray-900">{m.title}</p>
                {m.description ? <p className="mt-1 text-sm text-gray-600">{m.description}</p> : null}
              </div>
            ))}
          </div>
        ) : (
          <p className="mt-2 text-sm text-gray-500">No milestones added yet.</p>
        )}
      </div>

      {quote.status === 'pending_customer_approval' && (
        <div className="flex items-center gap-3">
          <button
            onClick={handleApprove}
            disabled={saving}
            className="rounded-lg bg-[#bfe937] px-4 py-2 text-sm font-medium text-gray-900 disabled:opacity-50"
          >
            Accept Quote
          </button>
          <button
            onClick={handleReject}
            disabled={saving}
            className="rounded-lg border border-red-200 bg-red-50 px-4 py-2 text-sm font-medium text-red-700 disabled:opacity-50"
          >
            Reject quote
          </button>
        </div>
      )}
    </div>
  );
}

