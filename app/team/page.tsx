import Link from 'next/link';
import { Inbox, Briefcase, ClipboardList } from 'lucide-react';
import { createClient } from '@/lib/supabase/server';
import { resolvePlatformRole } from '@/lib/auth/resolve-platform-role';
import { isInternalStaff, isQuoteManager } from '@/lib/auth/platform-role';
import { readSelectedWorkspaceIdFromServerCookies } from '@/lib/internal/client-context';

export const dynamic = 'force-dynamic';

export default async function TeamHomePage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  const role = user
    ? await resolvePlatformRole(supabase, user.id, user.user_metadata?.role)
    : null;
  const selectedWorkspaceId = await readSelectedWorkspaceIdFromServerCookies();
  let selectedWorkspaceName: string | null = null;
  if (selectedWorkspaceId) {
    const { data: workspace } = await supabase
      .from('workspaces')
      .select('name')
      .eq('id', selectedWorkspaceId)
      .maybeSingle();
    selectedWorkspaceName = workspace?.name || null;
  }

  return (
    <div className="p-8">
      <h1 className="text-3xl font-semibold text-gray-900">Team workspace</h1>
      <p className="mt-2 max-w-xl text-gray-600">
        Internal hub for consultants and project managers. Customer billing and subscription views stay under Account
        in the sidebar when you need them.
      </p>
      {selectedWorkspaceName && (
        <div className="mt-4 inline-flex items-center rounded-full border border-gray-200 bg-white px-3 py-1 text-xs font-medium text-gray-700">
          Viewing: {selectedWorkspaceName}
        </div>
      )}

      {role && isInternalStaff(role) && !selectedWorkspaceId && (
        <div className="mt-4 max-w-xl rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-950">
          <p className="font-medium">No client selected</p>
          <p className="mt-1 text-amber-900/90">
            Use the client switcher in the sidebar to scope quotes, projects, and customer data to one
            organization. “All clients” is fine for browsing; pick a client when you need a single-workspace
            context.
          </p>
        </div>
      )}

      <ul className="mt-8 grid max-w-lg gap-3">
        <li>
          <Link
            href="/inbox"
            className="flex items-center gap-3 rounded-xl border border-gray-200 bg-white px-4 py-3 text-sm font-medium text-gray-900 transition-colors hover:border-gray-300"
          >
            <Inbox className="h-5 w-5 text-gray-600" />
            Inbox
          </Link>
        </li>
        <li>
          <Link
            href="/projects/active"
            className="flex items-center gap-3 rounded-xl border border-gray-200 bg-white px-4 py-3 text-sm font-medium text-gray-900 transition-colors hover:border-gray-300"
          >
            <Briefcase className="h-5 w-5 text-gray-600" />
            My projects
          </Link>
        </li>
        {role && isQuoteManager(role) && (
          <li>
            <Link
              href="/team/quotes"
              className="flex items-center gap-3 rounded-xl border border-gray-200 bg-white px-4 py-3 text-sm font-medium text-gray-900 transition-colors hover:border-gray-300"
            >
              <ClipboardList className="h-5 w-5 text-gray-600" />
              Quotes
            </Link>
          </li>
        )}
      </ul>
    </div>
  );
}
