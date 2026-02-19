'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { ChevronRight, ArrowLeftRight } from 'lucide-react';
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
  inProgressBalance: number;
}

export default function BalancePage() {
  // Get current month and year
  const currentDate = new Date();
  const currentMonth = currentDate.toLocaleDateString('en-US', { month: 'short', year: 'numeric' });

  const [selectedMonth] = useState(currentMonth);
  const [workspace, setWorkspace] = useState<Workspace | null>(null);
  const [subscriptionData, setSubscriptionData] = useState<SubscriptionData | null>(null);
  const [projectCosts, setProjectCosts] = useState<ProjectCosts>({ usedBalance: 0, inProgressBalance: 0 });
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

      // Get user's workspace
      const { data: workspaceData } = await supabase
        .from('workspaces')
        .select('*')
        .eq('owner_id', user.id)
        .maybeSingle();

      if (workspaceData) {
        setWorkspace(workspaceData);
        console.log('Workspace data:', workspaceData);

        // Fetch subscription details from Stripe if they have an active subscription
        if (workspaceData.stripe_subscription_id) {
          console.log('Fetching subscription:', workspaceData.stripe_subscription_id);
          const response = await fetch(`/api/stripe/subscription?subscriptionId=${workspaceData.stripe_subscription_id}`);
          console.log('Subscription API response status:', response.status);

          if (response.ok) {
            const data = await response.json();
            console.log('Subscription data:', data);
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

        // Fetch projects to calculate used and in-progress balances
        const { data: projectsData, error: projectsError } = await supabase
          .from('projects')
          .select('cost, status')
          .eq('workspace_id', workspaceData.id);

        if (!projectsError && projectsData) {
          const usedBalance = projectsData
            .filter(p => p.status === 'completed')
            .reduce((sum, p) => sum + (p.cost || 0), 0);

          const inProgressBalance = projectsData
            .filter(p => p.status === 'in_progress')
            .reduce((sum, p) => sum + (p.cost || 0), 0);

          setProjectCosts({ usedBalance, inProgressBalance });
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
  const availableBalance = startingBalance - projectCosts.usedBalance - projectCosts.inProgressBalance;

  const syncSubscription = async () => {
    try {
      const response = await fetch('/api/stripe/sync-subscription', {
        method: 'POST',
      });

      if (response.ok) {
        const data = await response.json();
        console.log('Subscription synced:', data);
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

  return (
    <div className="p-8">
      {/* Header with balance and transfer button */}
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
            <button className="flex items-center gap-2 rounded-xl border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 transition-colors hover:bg-gray-50">
              <ArrowLeftRight className="h-4 w-4" />
              Balance transfer
            </button>
          </div>
        </div>
      </div>

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

          {/* Transfers */}
          <button className="w-full rounded-xl border border-gray-200 bg-white p-6 text-left transition-colors hover:bg-gray-50">
            <div className="flex items-center justify-between mb-2">
              <h3 className="text-base font-semibold text-gray-900">Transfers</h3>
              <ChevronRight className="h-5 w-5 text-gray-400" />
            </div>
            <p className="text-sm text-gray-500">No transfers</p>
          </button>

          {/* Used balance */}
          <button className="w-full rounded-xl border border-gray-200 bg-white p-6 text-left transition-colors hover:bg-gray-50">
            <div className="flex items-center justify-between mb-2">
              <h3 className="text-base font-semibold text-gray-900">Used balance</h3>
              <ChevronRight className="h-5 w-5 text-gray-400" />
            </div>
            <p className="text-2xl font-semibold text-red-600">-{formatAmount(projectCosts.usedBalance, currency)}</p>
          </button>

          {/* In progress balance */}
          <button className="w-full rounded-xl border border-gray-200 bg-white p-6 text-left transition-colors hover:bg-gray-50">
            <div className="flex items-center justify-between mb-2">
              <h3 className="text-base font-semibold text-gray-900">In progress balance</h3>
              <ChevronRight className="h-5 w-5 text-gray-400" />
            </div>
            <p className="text-2xl font-semibold text-orange-600">-{formatAmount(projectCosts.inProgressBalance, currency)}</p>
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
                  <span className="text-sm text-gray-900">Starting monthly budget</span>
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
                  <span className="text-sm text-gray-900">Reserved for in-progress projects</span>
                </div>
                <span className="text-sm font-medium text-orange-600">-{formatAmount(projectCosts.inProgressBalance, currency)}</span>
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
