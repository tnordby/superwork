import Link from 'next/link';
import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import { resolvePlatformRole } from '@/lib/auth/resolve-platform-role';
import { isQuoteManager } from '@/lib/auth/platform-role';

export const dynamic = 'force-dynamic';

export default async function TeamQuotesPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect('/login');
  }

  const role = await resolvePlatformRole(supabase, user.id, user.user_metadata?.role);
  if (!isQuoteManager(role)) {
    redirect('/team');
  }

  const { data: quotes, error } = await supabase
    .from('quotes')
    .select('id, title, status, category, service_type, final_price, estimated_price, currency, created_at, user_id')
    .order('created_at', { ascending: false });

  if (error) {
    return (
      <div className="p-8">
        <p className="text-red-600">Could not load quotes: {error.message}</p>
      </div>
    );
  }

  return (
    <div className="p-8">
      <div className="mb-6 flex items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-semibold text-gray-900">Quotes</h1>
          <p className="mt-1 text-sm text-gray-600">Review pricing and send quotes to customers for approval.</p>
        </div>
        <Link href="/team" className="text-sm font-medium text-gray-600 hover:text-gray-900">
          ← Team home
        </Link>
      </div>

      <div className="overflow-hidden rounded-xl border border-gray-200 bg-white">
        <table className="min-w-full divide-y divide-gray-200 text-sm">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-4 py-3 text-left font-medium text-gray-700">Title</th>
              <th className="px-4 py-3 text-left font-medium text-gray-700">Status</th>
              <th className="px-4 py-3 text-left font-medium text-gray-700">Service</th>
              <th className="px-4 py-3 text-right font-medium text-gray-700">Price</th>
              <th className="px-4 py-3 text-left font-medium text-gray-700">Created</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {(quotes ?? []).length === 0 ? (
              <tr>
                <td colSpan={5} className="px-4 py-8 text-center text-gray-500">
                  No quotes yet.
                </td>
              </tr>
            ) : (
              (quotes ?? []).map((q) => (
                <tr key={q.id} className="hover:bg-gray-50/80">
                  <td className="px-4 py-3 font-medium text-gray-900">{q.title}</td>
                  <td className="px-4 py-3 text-gray-600">{q.status?.replace(/_/g, ' ')}</td>
                  <td className="px-4 py-3 text-gray-600">
                    {q.category} · {q.service_type}
                  </td>
                  <td className="px-4 py-3 text-right text-gray-900">
                    {q.final_price != null
                      ? `${q.final_price} ${q.currency ?? ''}`
                      : q.estimated_price != null
                        ? `${q.estimated_price} ${q.currency ?? ''} (est.)`
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
