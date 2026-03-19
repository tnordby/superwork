'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { sumCommittedBalanceCents, sumUsedBalanceCents } from '@/lib/billing/project-balances';
import { formatAmount } from '@/lib/stripe/utils';
import { createClient } from '@/lib/supabase/client';

interface Workspace {
  id: string;
  name: string;
  stripe_customer_id?: string;
  stripe_subscription_id?: string;
}

interface SubscriptionData {
  amount: number;
  currency: string;
  interval: string;
}

interface Project {
  id: string;
  name: string;
  description: string | null;
  category: string;
  service_type: string;
  status: string;
  cost: number;
  created_at: string;
  completed_at: string | null;
}

interface UsageSummary {
  startingBalance: number;
  usedBalance: number;
  committedBalance: number;
  availableBalance: number;
  currency: string;
}

export default function UsagePage() {
  const [workspace, setWorkspace] = useState<Workspace | null>(null);
  const [subscriptionData, setSubscriptionData] = useState<SubscriptionData | null>(null);
  const [projects, setProjects] = useState<Project[]>([]);
  const [usage, setUsage] = useState<UsageSummary | null>(null);
  const [loading, setLoading] = useState(true);
  const router = useRouter();

  useEffect(() => {
    fetchUsageData();
  }, []);

  const fetchUsageData = async () => {
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

      if (!workspaceData) {
        setLoading(false);
        return;
      }

      setWorkspace(workspaceData);

      // Fetch subscription details
      let subscriptionBalance = 0;
      let currency = 'eur';

      if (workspaceData.stripe_subscription_id) {
        const response = await fetch(`/api/stripe/subscription?subscriptionId=${workspaceData.stripe_subscription_id}`);
        if (response.ok) {
          const data = await response.json();
          setSubscriptionData(data);
          subscriptionBalance = data.amount || 0;
          currency = data.currency || 'eur';
        }
      }

      // Fetch projects
      const { data: projectsData, error: projectsError } = await supabase
        .from('projects')
        .select('*')
        .eq('workspace_id', workspaceData.id)
        .order('created_at', { ascending: false });

      if (projectsError) {
        console.error('Error fetching projects:', projectsError);
      } else {
        setProjects(projectsData || []);

        const rows = projectsData ?? [];
        const usedBalance = sumUsedBalanceCents(rows);
        const committedBalance = sumCommittedBalanceCents(rows);
        const availableBalance = subscriptionBalance - usedBalance - committedBalance;

        setUsage({
          startingBalance: subscriptionBalance,
          usedBalance,
          committedBalance,
          availableBalance,
          currency,
        });
      }
    } catch (error) {
      console.error('Error fetching usage data:', error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="p-8">
        <div className="text-center py-12">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-gray-900 mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading usage data...</p>
        </div>
      </div>
    );
  }

  if (!workspace) {
    return (
      <div className="p-8">
        <h1 className="text-3xl font-semibold text-gray-900 mb-2">Usage</h1>
        <p className="text-gray-600 mb-8">No workspace found</p>
      </div>
    );
  }

  return (
    <div className="p-8">
      <h1 className="text-3xl font-semibold text-gray-900 mb-2">Usage</h1>
      <p className="text-gray-600 mb-8">Understand where your budget was spent</p>

      {/* Usage Summary Cards */}
      {usage && (
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8">
          <div className="rounded-xl border border-gray-200 bg-white p-6">
            <h3 className="text-sm font-medium text-gray-600 mb-2">Purchased balance</h3>
            <p className="text-2xl font-semibold text-gray-900">
              {formatAmount(usage.startingBalance, usage.currency)}
            </p>
          </div>

          <div className="rounded-xl border border-gray-200 bg-white p-6">
            <h3 className="text-sm font-medium text-gray-600 mb-2">Used Balance</h3>
            <p className="text-2xl font-semibold text-red-600">
              -{formatAmount(usage.usedBalance, usage.currency)}
            </p>
          </div>

          <div className="rounded-xl border border-gray-200 bg-white p-6">
            <h3 className="text-sm font-medium text-gray-600 mb-2">Committed</h3>
            <p className="text-2xl font-semibold text-orange-600">
              -{formatAmount(usage.committedBalance, usage.currency)}
            </p>
          </div>

          <div className="rounded-xl border border-gray-200 bg-white p-6">
            <h3 className="text-sm font-medium text-gray-600 mb-2">Available Balance</h3>
            <p className="text-2xl font-semibold text-green-600">
              {formatAmount(usage.availableBalance, usage.currency)}
            </p>
          </div>
        </div>
      )}

      {/* Projects List */}
      <div className="rounded-2xl border border-gray-200 bg-white p-8">
        <h2 className="text-xl font-semibold text-gray-900 mb-6">Project Usage</h2>

        {projects.length > 0 ? (
          <div className="space-y-3">
            {projects.map((project) => (
              <div
                key={project.id}
                className="flex items-center justify-between p-4 rounded-xl border border-gray-200 hover:bg-gray-50 transition-colors"
              >
                <div className="flex-1">
                  <div className="flex items-center gap-3 mb-1">
                    <h3 className="font-medium text-gray-900">{project.name}</h3>
                    <span className={`text-xs px-2 py-1 rounded ${
                      project.status === 'completed' ? 'bg-green-100 text-green-800' :
                      project.status === 'in_progress' ? 'bg-blue-100 text-blue-800' :
                      project.status === 'in_review' ? 'bg-purple-100 text-purple-800' :
                      project.status === 'on_hold' ? 'bg-yellow-100 text-yellow-800' :
                      'bg-gray-100 text-gray-800'
                    }`}>
                      {project.status.replace('_', ' ')}
                    </span>
                  </div>
                  <p className="text-sm text-gray-600">
                    {project.category} • {project.service_type}
                  </p>
                  <p className="text-xs text-gray-500 mt-1">
                    Created {new Date(project.created_at).toLocaleDateString('en-US', {
                      month: 'short',
                      day: 'numeric',
                      year: 'numeric',
                    })}
                    {project.completed_at && (
                      <> • Completed {new Date(project.completed_at).toLocaleDateString('en-US', {
                        month: 'short',
                        day: 'numeric',
                        year: 'numeric',
                      })}</>
                    )}
                  </p>
                </div>
                <div className="text-right">
                  <p className="text-lg font-semibold text-gray-900">
                    {formatAmount(project.cost || 0, usage?.currency || 'eur')}
                  </p>
                  <p className="text-xs text-gray-500">
                    {project.status === 'completed'
                      ? 'Deducted'
                      : (project.cost || 0) > 0
                        ? 'Committed'
                        : 'Planned'}
                  </p>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="text-center py-12 text-gray-500">
            <p>No projects yet. Create a project to track your usage.</p>
          </div>
        )}
      </div>
    </div>
  );
}
