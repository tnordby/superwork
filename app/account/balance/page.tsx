'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { ChevronRight, PlusCircle } from 'lucide-react';
import { sumCommittedBalanceCents, sumUsedBalanceCents } from '@/lib/billing/project-balances';
import { formatAmount } from '@/lib/stripe/utils';
import { createClient } from '@/lib/supabase/client';

interface Workspace {
  id: string;
  name: string;
  stripe_customer_id?: string;
  stripe_subscription_id?: string;
  stripe_subscription_status?: string;
  stripe_price_id?: string;
}

interface SubscriptionData {
  amount: number;
  currency: string;
  interval: string;
}

interface ProjectCosts {
  usedBalance: number;
  committedBalance: number;
}

export default function BalancePage() {
  // Get current month and year
  const currentDate = new Date();
  const currentMonth = currentDate.toLocaleDateString('en-US', { month: 'short', year: 'numeric' });

  const [selectedMonth] = useState(currentMonth);
  const [workspace, setWorkspace] = useState<Workspace | null>(null);
  const [subscriptionData, setSubscriptionData] = useState<SubscriptionData | null>(null);
  const [projectCosts, setProjectCosts] = useState<ProjectCosts>({ usedBalance: 0, committedBalance: 0 });
  const [loading, setLoading] = useState(true);
  const router = useRouter();

  useEffect(() => {
    fetchBalance();
  }, []);

  const fetchBalance = async () => {
    try {
      const supabase = createClient();
      const { data: { user } } = await supabase.auth.getUser();

      if (!user) {
        router.push('/login');
        return;
      }

      // Prefer owned workspace, then fallback to membership workspace.
      let { data: workspaceData } = await supabase
        .from('workspaces')
        .select('*')
        .eq('owner_id', user.id)
        .maybeSingle();

      if (!workspaceData) {
        const { data: membership } = await supabase
          .from('workspace_members')
          .select('workspace_id, workspaces!inner(*)')
          .eq('user_id', user.id)
          .limit(1)
          .maybeSingle();
        workspaceData = (membership?.workspaces as Workspace | Workspace[] | null) || null;
        if (Array.isArray(workspaceData)) workspaceData = workspaceData[0] || null;
      }

      if (workspaceData) {
        setWorkspace(workspaceData);

        // Fetch subscription details from Stripe if they have an active subscription
        if (workspaceData.stripe_subscription_id) {
          const response = await fetch(`/api/stripe/subscription?subscriptionId=${workspaceData.stripe_subscription_id}`);

          if (response.ok) {
            const data = await response.json();
            setSubscriptionData(data);
          } else {
            const error = await response.json();
            console.error('Subscription API error:', error);
          }
        } else if (workspaceData.stripe_customer_id) {
          // Auto-sync if they have a customer ID but no subscription ID
          console.log('No subscription ID found, auto-syncing from Stripe...');
          await syncSubscription();
        }

        // Fetch projects: used (completed) vs committed (not completed)
        const { data: projectsData, error: projectsError } = await supabase
          .from('projects')
          .select('cost, status')
          .eq('workspace_id', workspaceData.id);

        if (!projectsError && projectsData) {
          const usedBalance = sumUsedBalanceCents(projectsData);
          const committedBalance = sumCommittedBalanceCents(projectsData);
          setProjectCosts({ usedBalance, committedBalance });
        }
      }
    } catch (error) {
      console.error('Error fetching balance:', error);
    } finally {
      setLoading(false);
    }
  };

  const startingBalance = subscriptionData?.amount || 0;
  const currency = subscriptionData?.currency || 'eur';
  const availableBalance = startingBalance - projectCosts.usedBalance - projectCosts.committedBalance;

  const syncSubscription = async () => {
    try {
      const response = await fetch('/api/stripe/sync-subscription', {
        method: 'POST',
      });

      if (response.ok) {
        // Reload the page to fetch updated data
        window.location.reload();
      } else {
        const error = await response.json();
        console.error('Sync error:', error);
        throw new Error(error.error);
      }
    } catch (error) {
      console.error('Error syncing subscription:', error);
      throw error;
    }
  };

  if (loading) {
    return (
      <div className="p-8">
        <div className="text-center py-12">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-gray-900 mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading balance...</p>
        </div>
      </div>
    );
  }

  const hasActiveSubscription = Boolean(workspace?.stripe_subscription_id && startingBalance > 0);

  return (
    <div className="p-8">
      {/* Header with available balance and funding action */}
      <div className="mb-8">
        <h1 className="text-3xl font-semibold text-gray-900 mb-6">Balance</h1>

        <div className="flex items-center justify-between rounded-2xl border border-gray-200 bg-white p-6">
          <div className="flex items-center gap-4">
            <span className="text-base font-medium text-gray-900">Balance</span>
            <select className="rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm font-medium text-gray-900 focus:border-gray-400 focus:outline-none focus:ring-2 focus:ring-gray-200">
              <option>{selectedMonth}</option>
            </select>
          </div>
          <div className="flex items-center gap-6">
            <div className="text-right">
              <div className="text-2xl font-semibold text-gray-900">{formatAmount(availableBalance, currency)}</div>
              <div className="text-sm text-gray-500">Available balance</div>
            </div>
            <button
              onClick={() => router.push('/account/plan')}
              className="flex items-center gap-2 rounded-xl bg-[#bfe937] px-5 py-3 text-sm font-semibold text-gray-900 shadow-sm transition-colors hover:bg-[#acd829]"
            >
              <PlusCircle className="h-4 w-4" />
              Add funds
            </button>
          </div>
        </div>
      </div>

      {!hasActiveSubscription && (
        <div className="mb-6 rounded-xl border border-gray-200 bg-gray-50 p-4 text-sm text-gray-700">
          No active billing plan. Add a plan to fund project work.
          <button
            onClick={() => router.push('/account/plan')}
            className="ml-2 font-semibold text-gray-900 underline"
          >
            Go to billing
          </button>
        </div>
      )}

      {/* Main content grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left sidebar */}
        <div className="space-y-4">
          {/* Starting balance */}
          <button className="w-full rounded-xl border border-gray-200 bg-gray-50 p-6 text-left transition-colors hover:bg-gray-100">
            <div className="flex items-center justify-between mb-2">
              <h3 className="text-base font-semibold text-gray-900">Starting balance</h3>
              <ChevronRight className="h-5 w-5 text-gray-400" />
            </div>
            <p className="text-2xl font-semibold text-gray-900">{formatAmount(startingBalance, currency)}</p>
          </button>

          {/* Add funds */}
          <button
            onClick={() => router.push('/account/plan')}
            className="w-full rounded-xl border border-[#bfe937] bg-[#f7fce8] p-6 text-left transition-colors hover:bg-[#eff8d1]"
          >
            <div className="flex items-center justify-between mb-2">
              <h3 className="text-base font-semibold text-gray-900">Add funds</h3>
              <ChevronRight className="h-5 w-5 text-gray-400" />
            </div>
            <p className="text-sm text-gray-700">Top up your workspace budget via billing plan.</p>
          </button>

          {/* Used balance */}
          <button className="w-full rounded-xl border border-gray-200 bg-white p-6 text-left transition-colors hover:bg-gray-50">
            <div className="flex items-center justify-between mb-2">
              <h3 className="text-base font-semibold text-gray-900">Used balance</h3>
              <ChevronRight className="h-5 w-5 text-gray-400" />
            </div>
            <p className="text-2xl font-semibold text-red-600">-{formatAmount(projectCosts.usedBalance, currency)}</p>
          </button>

          {/* Committed balance */}
          <button className="w-full rounded-xl border border-gray-200 bg-white p-6 text-left transition-colors hover:bg-gray-50">
            <div className="flex items-center justify-between mb-2">
              <h3 className="text-base font-semibold text-gray-900">Committed balance</h3>
              <ChevronRight className="h-5 w-5 text-gray-400" />
            </div>
            <p className="text-2xl font-semibold text-orange-600">-{formatAmount(projectCosts.committedBalance, currency)}</p>
          </button>

          {/* Expiring balance */}
          <div className="rounded-xl border border-gray-200 bg-white p-6">
            <h3 className="text-base font-semibold text-gray-900 mb-2">Expiring balance</h3>
            <p className="text-2xl font-semibold text-gray-900">{formatAmount(0, currency)}</p>
          </div>

          {/* Available balance */}
          <div className="rounded-xl border border-gray-200 bg-white p-6">
            <h3 className="text-base font-semibold text-gray-900 mb-2">Available balance</h3>
            <p className="text-2xl font-semibold text-green-600">{formatAmount(availableBalance, currency)}</p>
          </div>
        </div>

        {/* Right content area */}
        <div className="lg:col-span-2">
          <div className="rounded-2xl border border-gray-200 bg-white p-8">
            <div className="flex items-start justify-between mb-6">
              <div>
                <h2 className="text-2xl font-semibold text-gray-900 mb-2">Balance Breakdown</h2>
                <p className="text-sm text-gray-600">See how your budget is being used across all projects.</p>
              </div>
              <div className="text-3xl font-semibold text-green-600">{formatAmount(availableBalance, currency)}</div>
            </div>

            {/* Balance breakdown */}
            <div className="space-y-4">
              <div className="flex items-center justify-between py-4 border-b border-gray-100">
                <div className="flex items-center gap-3">
                  <div className="h-2 w-2 rounded-full bg-blue-600"></div>
                  <span className="text-sm text-gray-900">Purchased balance</span>
                </div>
                <span className="text-sm font-medium text-gray-900">{formatAmount(startingBalance, currency)}</span>
              </div>

              <div className="flex items-center justify-between py-4 border-b border-gray-100">
                <div className="flex items-center gap-3">
                  <div className="h-2 w-2 rounded-full bg-red-600"></div>
                  <span className="text-sm text-gray-900">Used on completed projects</span>
                </div>
                <span className="text-sm font-medium text-red-600">-{formatAmount(projectCosts.usedBalance, currency)}</span>
              </div>

              <div className="flex items-center justify-between py-4 border-b border-gray-100">
                <div className="flex items-center gap-3">
                  <div className="h-2 w-2 rounded-full bg-orange-600"></div>
                  <span className="text-sm text-gray-900">Committed to active projects</span>
                </div>
                <span className="text-sm font-medium text-orange-600">-{formatAmount(projectCosts.committedBalance, currency)}</span>
              </div>

              <div className="flex items-center justify-between py-4 border-t-2 border-gray-200 pt-4">
                <div className="flex items-center gap-3">
                  <div className="h-2 w-2 rounded-full bg-green-600"></div>
                  <span className="text-sm font-semibold text-gray-900">Available Balance</span>
                </div>
                <span className="text-sm font-semibold text-green-600">{formatAmount(availableBalance, currency)}</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
