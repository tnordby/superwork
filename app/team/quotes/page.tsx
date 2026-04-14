import Link from 'next/link';
import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import { resolvePlatformRole } from '@/lib/auth/resolve-platform-role';
import { isInternalStaff, isQuoteManager } from '@/lib/auth/platform-role';
import { readSelectedWorkspaceIdFromServerCookies } from '@/lib/internal/client-context';

export const dynamic = 'force-dynamic';

type QuoteListRow = {
  id: string;
  title: string;
  status: string;
  category: string;
  service_type: string;
  final_price: number | null;
  estimated_price: number | null;
  currency: string | null;
  created_at: string | null;
  reviewed_at: string | null;
  user_id: string | null;
};

function getStatusMeta(status: string) {
  if (status === 'approved') {
    return { label: 'Accepted', classes: 'bg-green-100 text-green-700' };
  }
  if (status === 'rejected') {
    return { label: 'Rejected', classes: 'bg-red-100 text-red-700' };
  }
  return { label: 'Pending', classes: 'bg-amber-100 text-amber-700' };
}

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

  const selectedWorkspaceId = await readSelectedWorkspaceIdFromServerCookies();
  const internal = isInternalStaff(role);
  let selectedWorkspaceName: string | null = null;
  if (selectedWorkspaceId) {
    const { data: workspace } = await supabase
      .from('workspaces')
      .select('name')
      .eq('id', selectedWorkspaceId)
      .maybeSingle();
    selectedWorkspaceName = workspace?.name || null;
  }

  let quotes: QuoteListRow[] = [];
  let loadError: { message: string } | null = null;

  if (internal && !selectedWorkspaceId) {
    quotes = [];
  } else {
    let quoteProjectIds: string[] | null = null;
    if (selectedWorkspaceId) {
      const { data: workspaceProjects } = await supabase
        .from('projects')
        .select('id')
        .eq('workspace_id', selectedWorkspaceId);
      quoteProjectIds = (workspaceProjects || []).map((row: { id: string }) => row.id);
    }

    if (quoteProjectIds && quoteProjectIds.length === 0) {
      quoteProjectIds = ['00000000-0000-0000-0000-000000000000'];
    }

    let quotesQuery = supabase
      .from('quotes')
      .select(
        'id, title, status, category, service_type, final_price, estimated_price, currency, created_at, reviewed_at, user_id'
      )
      .order('created_at', { ascending: false });
    if (quoteProjectIds) {
      quotesQuery = quotesQuery.in('project_id', quoteProjectIds);
    }
    const result = await quotesQuery;
    quotes = (result.data ?? []) as QuoteListRow[];
    loadError = result.error;
  }

  if (loadError) {
    return (
      <div className="p-8">
        <p className="text-red-600">Could not load quotes: {loadError.message}</p>
      </div>
    );
  }

  return (
    <div className="p-8">
      <div className="mb-6 flex items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-semibold text-gray-900">Quotes</h1>
          <p className="mt-1 text-sm text-gray-600">Review pricing and send quotes to customers for approval.</p>
          {selectedWorkspaceName && (
            <div className="mt-2 inline-flex items-center rounded-full border border-gray-200 bg-white px-3 py-1 text-xs font-medium text-gray-700">
              Viewing: {selectedWorkspaceName}
            </div>
          )}
          {internal && !selectedWorkspaceId && (
            <div className="mt-4 max-w-xl rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-950">
              <p className="font-medium">No client selected</p>
              <p className="mt-1 text-amber-900/90">
                Choose a client in the sidebar switcher to load quotes for that workspace. In “All clients” mode the
                quotes list stays empty so pricing stays scoped to one organization.
              </p>
            </div>
          )}
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
                  <td className="px-4 py-3 font-medium text-gray-900">
                    <Link href={`/team/quotes/${q.id}`} className="hover:underline">
                      {q.title}
                    </Link>
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-2">
                      <span
                        className={`inline-flex rounded-full px-2.5 py-1 text-xs font-medium ${getStatusMeta(q.status).classes}`}
                      >
                        {getStatusMeta(q.status).label}
                      </span>
                      {q.status === 'pending_pm_review' && (
                        <span className="inline-flex rounded-full bg-blue-100 px-2.5 py-1 text-xs font-medium text-blue-700">
                          New
                        </span>
                      )}
                    </div>
                  </td>
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
