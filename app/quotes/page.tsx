'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';

type QuoteListItem = {
  id: string;
  title: string;
  status: string;
  final_price: number | null;
  estimated_price: number | null;
  currency: string | null;
  created_at: string;
};

function getStatusLabel(status: string): string {
  if (status === 'approved') return 'Accepted';
  if (status === 'rejected') return 'Rejected';
  return 'Pending';
}

function getStatusClasses(status: string): string {
  if (status === 'approved') return 'bg-green-100 text-green-700';
  if (status === 'rejected') return 'bg-red-100 text-red-700';
  return 'bg-amber-100 text-amber-700';
}

export default function QuotesPage() {
  const [quotes, setQuotes] = useState<QuoteListItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState('');

  useEffect(() => {
    (async () => {
      try {
        const response = await fetch('/api/quotes', { credentials: 'include' });
        const data = (await response.json()) as { quotes?: QuoteListItem[]; error?: string };
        if (!response.ok) {
          setQuotes([]);
          setLoadError(typeof data.error === 'string' ? data.error : 'Could not load quotes.');
        } else {
          setQuotes(data.quotes || []);
        }
      } catch {
        setQuotes([]);
        setLoadError('Could not load quotes.');
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  if (loading) return <div className="p-8">Loading...</div>;

  return (
    <div className="p-8">
      <h1 className="text-3xl font-semibold text-gray-900 mb-2">My Quotes</h1>
      <p className="text-sm text-gray-600 mb-6">Review and approve your project quotes.</p>

      {loadError ? (
        <div className="mb-6 rounded-xl border border-amber-200 bg-amber-50 px-5 py-4 text-sm text-amber-950">
          <p className="font-medium">Quotes could not be loaded</p>
          <p className="mt-1 text-amber-900/90">{loadError}</p>
          {loadError.includes('Select a client context') ? (
            <p className="mt-3">
              <Link
                href="/team"
                className="font-medium text-amber-950 underline decoration-amber-700/50 underline-offset-2"
              >
                Open team workspace
              </Link>{' '}
              and pick a client, then return here.
            </p>
          ) : null}
        </div>
      ) : null}

      <div className="overflow-hidden rounded-xl border border-gray-200 bg-white">
        <table className="min-w-full divide-y divide-gray-200 text-sm">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-4 py-3 text-left font-medium text-gray-700">Title</th>
              <th className="px-4 py-3 text-left font-medium text-gray-700">Status</th>
              <th className="px-4 py-3 text-right font-medium text-gray-700">Price</th>
              <th className="px-4 py-3 text-left font-medium text-gray-700">Created</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {quotes.length === 0 ? (
              <tr>
                <td colSpan={4} className="px-4 py-8 text-center text-gray-500">
                  No quotes yet.
                </td>
              </tr>
            ) : (
              quotes.map((q) => (
                <tr key={q.id}>
                  <td className="px-4 py-3 font-medium text-gray-900">
                    <Link href={`/quotes/${q.id}`} className="hover:underline">
                      {q.title}
                    </Link>
                  </td>
                  <td className="px-4 py-3">
                    <span
                      className={`inline-flex rounded-full px-2.5 py-1 text-xs font-medium ${getStatusClasses(q.status)}`}
                    >
                      {getStatusLabel(q.status)}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-right text-gray-900">
                    {(q.final_price ?? q.estimated_price) != null
                      ? `${q.final_price ?? q.estimated_price} ${q.currency || ''}`
                      : '—'}
                  </td>
                  <td className="px-4 py-3 text-gray-500">
                    {q.created_at ? new Date(q.created_at).toLocaleDateString() : '—'}
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}

