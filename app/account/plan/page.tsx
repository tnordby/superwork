'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { CreditCard, Calendar, Check, Zap } from 'lucide-react';
import { formatAmount, formatBillingInterval, formatSubscriptionStatus } from '@/lib/stripe/utils';
import { createClient } from '@/lib/supabase/client';
import { SubscriptionBanner } from '@/components/billing/SubscriptionBanner';

interface Workspace {
  id: string;
  name: string;
  stripe_customer_id?: string;
  stripe_subscription_id?: string;
  stripe_subscription_status?: string;
  subscription_interval?: string;
  current_period_end?: string;
}

interface Plan {
  id: string;
  productId: string;
  productName: string;
  amount: number | null;
  currency: string;
  interval?: string;
  intervalCount?: number;
  metadata: Record<string, string>;
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

export default function PlanPage() {
  const [workspace, setWorkspace] = useState<Workspace | null>(null);
  const [plans, setPlans] = useState<Plan[]>([]);
  const [subscriptionData, setSubscriptionData] = useState<SubscriptionData | null>(null);
  const [projectCosts, setProjectCosts] = useState<ProjectCosts>({ usedBalance: 0, inProgressBalance: 0 });
  const [loading, setLoading] = useState(true);
  const [managingBilling, setManagingBilling] = useState(false);
  const [subscribingToPlan, setSubscribingToPlan] = useState<string | null>(null);
  const router = useRouter();

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
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

        // Fetch subscription details if they have an active subscription
        if (workspaceData.stripe_subscription_id) {
          const response = await fetch(`/api/stripe/subscription?subscriptionId=${workspaceData.stripe_subscription_id}`);
          if (response.ok) {
            const data = await response.json();
            setSubscriptionData(data);
          }
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
      } else {
        // Create a workspace for the user
        const { data: newWorkspace } = await supabase
          .from('workspaces')
          .insert({
            name: `${user.email}'s Workspace`,
            owner_id: user.id,
            type: 'client',
          })
          .select()
          .single();

        if (newWorkspace) {
          setWorkspace(newWorkspace);
        }
      }

      // Fetch available plans
      const plansResponse = await fetch('/api/stripe/plans');
      if (plansResponse.ok) {
        const plansData = await plansResponse.json();

        // Filter and sort plans to only show our three products in specific order
        const allowedProductIds = ['prod_U0dAmSIUbknk2Z', 'prod_U0dGQxqToTsiyt', 'prod_U0dGPL6dlQ39Ny'];
        const productOrder = {
          'prod_U0dAmSIUbknk2Z': 1, // Essentials
          'prod_U0dGQxqToTsiyt': 2, // Advanced
          'prod_U0dGPL6dlQ39Ny': 3  // Premier
        };

        const filteredPlans = (plansData.plans || [])
          .filter((plan: Plan) => allowedProductIds.includes(plan.productId))
          .sort((a: Plan, b: Plan) => {
            const orderA = productOrder[a.productId as keyof typeof productOrder] || 999;
            const orderB = productOrder[b.productId as keyof typeof productOrder] || 999;
            return orderA - orderB;
          });

        setPlans(filteredPlans);
      }
    } catch (error) {
      console.error('Error fetching data:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleManageBilling = async () => {
    if (!workspace?.id) return;

    setManagingBilling(true);

    try {
      const response = await fetch('/api/stripe/create-portal-session', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          workspaceId: workspace.id,
        }),
      });

      if (!response.ok) {
        throw new Error('Failed to create portal session');
      }

      const { url } = await response.json();

      if (url) {
        window.location.href = url;
      }
    } catch (error) {
      console.error('Error creating portal session:', error);
      alert('Failed to open billing portal. Please try again.');
    } finally {
      setManagingBilling(false);
    }
  };

  const handleSubscribe = async (priceId: string) => {
    if (!workspace?.id) {
      alert('Workspace not found. Please refresh the page.');
      return;
    }

    setSubscribingToPlan(priceId);

    try {
      const response = await fetch('/api/stripe/create-checkout-session', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          priceId,
          workspaceId: workspace.id,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to create checkout session');
      }

      if (data.url) {
        window.location.href = data.url;
      } else {
        throw new Error('No checkout URL returned');
      }
    } catch (error) {
      console.error('Error creating checkout session:', error);
      alert(`Failed to start checkout: ${error instanceof Error ? error.message : 'Unknown error'}`);
    } finally {
      setSubscribingToPlan(null);
    }
  };

  const getIntervalLabel = (plan: Plan) => {
    if (!plan.interval) return '';

    if (plan.interval === 'month') {
      if (plan.intervalCount === 3) return 'Quarterly';
      if (plan.intervalCount === 6) return 'Bi-Annual';
      return 'Monthly';
    }

    if (plan.interval === 'year') return 'Annual';

    return plan.interval;
  };

  const getPlanDetails = (productId: string) => {
    const planDetailsMap: Record<string, {
      name: string;
      description: string;
      features: string[];
      isPopular?: boolean;
    }> = {
      'prod_U0dAmSIUbknk2Z': {
        name: 'Essentials',
        description: 'Perfect for getting started with professional creative services.',
        features: [
          'Unlimited design requests',
          'Unlimited revisions',
          '2-3 day average delivery',
          'Pause or cancel anytime',
          'Design board for requests',
          'Support via email'
        ]
      },
      'prod_U0dGQxqToTsiyt': {
        name: 'Advanced',
        description: 'Enhanced creative services with faster delivery and priority support.',
        features: [
          'Everything in Essentials',
          'Priority queue placement',
          '1-2 day average delivery',
          'Dedicated account manager',
          'Advanced design requests',
          'Video & motion graphics',
          'Priority support',
          'Custom brand guidelines'
        ],
        isPopular: true
      },
      'prod_U0dGPL6dlQ39Ny': {
        name: 'Premier',
        description: 'Comprehensive creative services with dedicated support and priority delivery.',
        features: [
          'Everything in Advanced',
          'Same-day delivery available',
          'Dedicated design team',
          'Development & coding',
          'White-label presentations',
          'Strategic consulting sessions',
          '24/7 premium support',
          'Custom integrations'
        ]
      }
    };

    return planDetailsMap[productId] || {
      name: 'Custom Plan',
      description: 'Flexible creative services tailored to your needs.',
      features: []
    };
  };

  const getPlanFeatures = (metadata: Record<string, string>) => {
    const featuresString = metadata.features || '';
    return featuresString.split(',').map(f => f.trim()).filter(Boolean);
  };

  if (loading) {
    return (
      <div className="p-8">
        <div className="text-center py-12">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-gray-900 mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading...</p>
        </div>
      </div>
    );
  }

  const status = formatSubscriptionStatus(workspace?.stripe_subscription_status);
  const hasActiveSubscription = workspace?.stripe_subscription_status &&
    ['active', 'trialing'].includes(workspace.stripe_subscription_status);

  // Calculate balances
  const startingBalance = subscriptionData?.amount || 0;
  const currency = subscriptionData?.currency || 'eur';
  const availableBalance = startingBalance - projectCosts.usedBalance - projectCosts.inProgressBalance;

  return (
    <div className="p-8">
      <h1 className="text-3xl font-semibold text-gray-900 mb-8">Plan & Billing</h1>

      {/* Subscription Banner */}
      {workspace?.stripe_subscription_status && (
        <div className="mb-6">
          <SubscriptionBanner
            status={workspace.stripe_subscription_status}
            currentPeriodEnd={workspace.current_period_end}
          />
        </div>
      )}

      {/* Current Subscription */}
      {hasActiveSubscription ? (
        <div className="space-y-6 mb-8">
          {/* Subscription Overview */}
          <div className="rounded-2xl border border-gray-200 bg-white p-8 shadow-sm">
            <div className="flex items-center justify-between mb-6">
              <div>
                <h2 className="text-xl font-semibold text-gray-900 mb-2">Current Plan</h2>
                <p className="text-gray-600">
                  {formatBillingInterval(workspace?.subscription_interval)} billing
                </p>
              </div>
              <span className={`inline-block rounded-full px-4 py-2 text-sm font-medium ${
                status.color === 'green' ? 'bg-green-100 text-green-800' :
                status.color === 'blue' ? 'bg-blue-100 text-blue-800' :
                status.color === 'orange' ? 'bg-orange-100 text-orange-800' :
                status.color === 'red' ? 'bg-red-100 text-red-800' :
                'bg-gray-100 text-gray-800'
              }`}>
                {status.label}
              </span>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
              <div className="flex items-start gap-4">
                <div className="rounded-xl bg-gray-100 p-3">
                  <Calendar className="h-6 w-6 text-gray-700" />
                </div>
                <div>
                  <p className="text-sm text-gray-600 mb-1">Next billing date</p>
                  <p className="text-lg font-semibold text-gray-900">
                    {workspace?.current_period_end
                      ? new Date(workspace.current_period_end).toLocaleDateString('en-US', {
                          month: 'long',
                          day: 'numeric',
                          year: 'numeric',
                        })
                      : 'N/A'}
                  </p>
                </div>
              </div>

              <div className="flex items-start gap-4">
                <div className="rounded-xl bg-gray-100 p-3">
                  <CreditCard className="h-6 w-6 text-gray-700" />
                </div>
                <div>
                  <p className="text-sm text-gray-600 mb-1">Payment method</p>
                  <p className="text-lg font-semibold text-gray-900">On file</p>
                </div>
              </div>
            </div>

            <button
              onClick={handleManageBilling}
              disabled={managingBilling}
              className="w-full rounded-xl bg-gray-900 px-6 py-3 text-sm font-medium text-white transition-colors hover:bg-gray-800 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {managingBilling ? 'Opening...' : 'Manage Billing'}
            </button>
          </div>

          {/* Balance & Usage */}
          <div className="rounded-2xl border border-gray-200 bg-white p-8 shadow-sm">
            <div className="flex items-center gap-3 mb-6">
              <div className="rounded-xl bg-gray-900 p-2">
                <span className="text-white text-lg font-bold">$</span>
              </div>
              <h2 className="text-xl font-semibold text-gray-900">Budget Overview</h2>
            </div>

            <div className="space-y-4">
              <div className="flex items-center justify-between py-3 border-b border-gray-100">
                <span className="text-sm text-gray-600">Starting balance</span>
                <span className="text-sm font-medium text-gray-900">{formatAmount(startingBalance, currency)}</span>
              </div>

              <div className="flex items-center justify-between py-3 border-b border-gray-100">
                <span className="text-sm text-gray-600">Used</span>
                <span className="text-sm font-medium text-red-600">-{formatAmount(projectCosts.usedBalance, currency)}</span>
              </div>

              <div className="flex items-center justify-between py-3 border-b border-gray-100">
                <span className="text-sm text-gray-600">In progress</span>
                <span className="text-sm font-medium text-orange-600">-{formatAmount(projectCosts.inProgressBalance, currency)}</span>
              </div>

              <div className="flex items-center justify-between py-3">
                <span className="text-sm font-semibold text-gray-900">Available</span>
                <span className="text-sm font-semibold text-green-600">{formatAmount(availableBalance, currency)}</span>
              </div>
            </div>

            <button
              onClick={() => router.push('/account/usage')}
              className="mt-4 text-sm text-gray-600 hover:text-gray-900 transition-colors"
            >
              view detailed usage →
            </button>
          </div>

          {/* Balance Breakdown */}
          <div className="rounded-2xl border border-gray-200 bg-white p-8 shadow-sm">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-xl font-semibold text-gray-900">Balance Breakdown</h2>
              <div className="text-right">
                <p className="text-2xl font-bold text-green-600">{formatAmount(availableBalance, currency)}</p>
                <p className="text-xs text-gray-500">Available balance</p>
              </div>
            </div>

            <div className="space-y-4">
              {/* Starting Balance */}
              <div className="flex items-center justify-between py-3 border-b border-gray-100">
                <div className="flex items-center gap-3">
                  <div className="h-2 w-2 rounded-full bg-blue-600"></div>
                  <span className="text-sm text-gray-900">Starting monthly budget</span>
                </div>
                <span className="text-sm font-medium text-gray-900">{formatAmount(startingBalance, currency)}</span>
              </div>

              {/* Used Balance */}
              <div className="flex items-center justify-between py-3 border-b border-gray-100">
                <div className="flex items-center gap-3">
                  <div className="h-2 w-2 rounded-full bg-red-600"></div>
                  <span className="text-sm text-gray-900">Used on completed projects</span>
                </div>
                <span className="text-sm font-medium text-red-600">-{formatAmount(projectCosts.usedBalance, currency)}</span>
              </div>

              {/* In Progress */}
              <div className="flex items-center justify-between py-3 border-b border-gray-100">
                <div className="flex items-center gap-3">
                  <div className="h-2 w-2 rounded-full bg-orange-600"></div>
                  <span className="text-sm text-gray-900">Reserved for in-progress projects</span>
                </div>
                <span className="text-sm font-medium text-orange-600">-{formatAmount(projectCosts.inProgressBalance, currency)}</span>
              </div>

              {/* Available Balance */}
              <div className="flex items-center justify-between py-3 border-t-2 border-gray-200 pt-4">
                <div className="flex items-center gap-3">
                  <div className="h-2 w-2 rounded-full bg-green-600"></div>
                  <span className="text-sm font-semibold text-gray-900">Available Balance</span>
                </div>
                <span className="text-sm font-semibold text-green-600">{formatAmount(availableBalance, currency)}</span>
              </div>
            </div>
          </div>
        </div>
      ) : (
        /* No Active Subscription - Show Plans */
        <div className="mb-8">
          <div className="rounded-2xl border border-gray-200 bg-gray-50 p-8 text-center mb-8">
            <div className="mx-auto w-16 h-16 rounded-full bg-gray-200 flex items-center justify-center mb-4">
              <Zap className="h-8 w-8 text-gray-600" />
            </div>
            <h2 className="text-2xl font-semibold text-gray-900 mb-2">No Active Subscription</h2>
            <p className="text-gray-600 max-w-2xl mx-auto">
              Subscribe to a plan to unlock all features and get full access to your workspace.
            </p>
          </div>

          {/* Available Plans */}
          {plans.length > 0 && (
            <div>
              <div className="text-center mb-12">
                <h2 className="text-4xl font-bold text-gray-900 mb-4">
                  A subscription built to <span className="italic">fuel your growth</span>
                </h2>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 justify-items-center max-w-7xl mx-auto">
                {plans.map((plan) => {
                  const planDetails = getPlanDetails(plan.productId);
                  const isPopular = planDetails.isPopular;

                  return (
                    <div
                      key={plan.id}
                      className={`rounded-2xl p-8 relative flex flex-col w-full max-w-sm ${
                        isPopular
                          ? 'border-2 border-[#bfe937] bg-[#bfe937] shadow-lg'
                          : 'border border-gray-200 bg-white/50 backdrop-blur-sm'
                      }`}
                    >
                      {isPopular && (
                        <div className="absolute -top-4 left-1/2 -translate-x-1/2">
                          <span className="inline-block rounded-full bg-gray-900 px-4 py-1.5 text-sm font-medium text-white">
                            Most Popular
                          </span>
                        </div>
                      )}

                      <div className="mb-8">
                        <h3 className="text-2xl font-bold text-gray-900 mb-4">
                          {planDetails.name}
                        </h3>
                        <p className={`leading-relaxed ${isPopular ? 'text-gray-900/80' : 'text-gray-600'}`}>
                          {planDetails.description}
                        </p>
                      </div>

                      <div className="mb-8">
                        <div className="flex items-baseline gap-2 mb-2">
                          <span className="text-5xl font-bold text-gray-900">
                            {formatAmount(plan.amount, plan.currency)}
                          </span>
                          <span className={`text-lg ${isPopular ? 'text-gray-900/80' : 'text-gray-600'}`}>
                            /month
                          </span>
                        </div>
                      </div>

                      {planDetails.features.length > 0 && (
                        <ul className="space-y-3 mb-8 flex-grow">
                          {planDetails.features.map((feature, index) => (
                            <li key={index} className="flex items-start gap-3">
                              <Check className="h-5 w-5 text-gray-900 flex-shrink-0 mt-0.5" />
                              <span className={isPopular ? 'text-gray-900' : 'text-gray-700'}>{feature}</span>
                            </li>
                          ))}
                        </ul>
                      )}

                      <button
                        onClick={() => handleSubscribe(plan.id)}
                        disabled={subscribingToPlan === plan.id}
                        className="w-full rounded-xl bg-gray-900 px-6 py-4 text-base font-medium text-white transition-colors hover:bg-gray-800 disabled:opacity-50 disabled:cursor-not-allowed mt-auto"
                      >
                        {subscribingToPlan === plan.id ? 'Processing...' : 'Get Started'}
                      </button>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </div>
      )}

    </div>
  );
}
