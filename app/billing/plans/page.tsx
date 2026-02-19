'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Check } from 'lucide-react';
import { formatAmount, formatBillingInterval } from '@/lib/stripe/utils';

interface Plan {
  id: string;
  productId: string;
  productName: string;
  description: string | null;
  amount: number | null;
  currency: string;
  interval?: string;
  intervalCount?: number;
  metadata: Record<string, string>;
}

export default function PlansPage() {
  const [plans, setPlans] = useState<Plan[]>([]);
  const [loading, setLoading] = useState(true);
  const [processingPlan, setProcessingPlan] = useState<string | null>(null);
  const router = useRouter();

  useEffect(() => {
    fetchPlans();
  }, []);

  const fetchPlans = async () => {
    try {
      const response = await fetch('/api/stripe/plans');
      if (response.ok) {
        const data = await response.json();
        setPlans(data.plans || []);
      }
    } catch (error) {
      console.error('Error fetching plans:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSubscribe = async (priceId: string) => {
    setProcessingPlan(priceId);

    try {
      // Get current workspace ID from localStorage or context
      const workspaceId = localStorage.getItem('currentWorkspaceId');

      if (!workspaceId) {
        alert('Please select a workspace first');
        return;
      }

      const response = await fetch('/api/stripe/create-checkout-session', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          priceId,
          workspaceId,
        }),
      });

      if (!response.ok) {
        throw new Error('Failed to create checkout session');
      }

      const { url } = await response.json();

      if (url) {
        window.location.href = url;
      }
    } catch (error) {
      console.error('Error creating checkout session:', error);
      alert('Failed to start checkout. Please try again.');
    } finally {
      setProcessingPlan(null);
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

  const getPlanFeatures = (metadata: Record<string, string>) => {
    // Parse features from metadata
    const featuresString = metadata.features || '';
    return featuresString.split(',').map(f => f.trim()).filter(Boolean);
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-gray-900 mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading plans...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 py-12 px-4">
      <div className="max-w-7xl mx-auto">
        <div className="text-center mb-12">
          <h1 className="text-4xl font-bold text-gray-900 mb-4">
            Choose Your Plan
          </h1>
          <p className="text-lg text-gray-600">
            Select the billing interval that works best for your needs
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
          {plans.map((plan) => {
            const features = getPlanFeatures(plan.metadata);
            const isPopular = plan.metadata.popular === 'true';

            return (
              <div
                key={plan.id}
                className={`relative rounded-2xl border bg-white p-8 shadow-sm transition-all hover:shadow-lg ${
                  isPopular ? 'border-[#bfe937] ring-2 ring-[#bfe937]' : 'border-gray-200'
                }`}
              >
                {isPopular && (
                  <div className="absolute -top-4 left-1/2 -translate-x-1/2">
                    <span className="inline-block rounded-full bg-[#bfe937] px-4 py-1 text-sm font-medium text-gray-900">
                      Most Popular
                    </span>
                  </div>
                )}

                <div className="text-center mb-6">
                  <h3 className="text-2xl font-bold text-gray-900 mb-2">
                    {plan.productName}
                  </h3>
                  <p className="text-sm text-gray-600 mb-4">
                    {getIntervalLabel(plan)}
                  </p>
                  <div className="flex items-baseline justify-center gap-2">
                    <span className="text-5xl font-bold text-gray-900">
                      {formatAmount(plan.amount, plan.currency)}
                    </span>
                    <span className="text-gray-600">
                      /{plan.interval === 'year' ? 'year' : `${plan.intervalCount || 1} month${(plan.intervalCount || 1) > 1 ? 's' : ''}`}
                    </span>
                  </div>
                </div>

                {plan.description && (
                  <p className="text-center text-gray-600 mb-6">
                    {plan.description}
                  </p>
                )}

                {features.length > 0 && (
                  <ul className="space-y-3 mb-8">
                    {features.map((feature, index) => (
                      <li key={index} className="flex items-start gap-3">
                        <Check className="h-5 w-5 text-[#bfe937] flex-shrink-0 mt-0.5" />
                        <span className="text-gray-700">{feature}</span>
                      </li>
                    ))}
                  </ul>
                )}

                <button
                  onClick={() => handleSubscribe(plan.id)}
                  disabled={processingPlan === plan.id}
                  className={`w-full rounded-xl px-6 py-3 text-sm font-medium transition-colors ${
                    isPopular
                      ? 'bg-[#bfe937] text-gray-900 hover:bg-[#acd829]'
                      : 'bg-gray-900 text-white hover:bg-gray-800'
                  } disabled:opacity-50 disabled:cursor-not-allowed`}
                >
                  {processingPlan === plan.id ? 'Processing...' : 'Subscribe'}
                </button>
              </div>
            );
          })}
        </div>

        {plans.length === 0 && (
          <div className="text-center py-12">
            <p className="text-gray-600">
              No plans available at the moment. Please check back later.
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
