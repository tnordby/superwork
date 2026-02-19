'use client';

import { AlertCircle, CreditCard } from 'lucide-react';
import { useRouter } from 'next/navigation';

interface SubscriptionBannerProps {
  status: string;
  currentPeriodEnd?: string;
}

export function SubscriptionBanner({
  status,
  currentPeriodEnd,
}: SubscriptionBannerProps) {
  const router = useRouter();

  if (status === 'past_due') {
    return (
      <div className="bg-orange-50 border-l-4 border-orange-500 p-4">
        <div className="flex items-start">
          <AlertCircle className="h-5 w-5 text-orange-600 mt-0.5 mr-3 flex-shrink-0" />
          <div className="flex-1">
            <h3 className="text-sm font-medium text-orange-800">
              Payment Required
            </h3>
            <p className="mt-1 text-sm text-orange-700">
              Your payment is past due. Please update your payment method to
              continue using all features.
            </p>
            <button
              onClick={() => router.push('/billing')}
              className="mt-3 inline-flex items-center gap-2 rounded-lg bg-orange-600 px-4 py-2 text-sm font-medium text-white hover:bg-orange-700 transition-colors"
            >
              <CreditCard className="h-4 w-4" />
              Update Payment Method
            </button>
          </div>
        </div>
      </div>
    );
  }

  if (status === 'canceled') {
    return (
      <div className="bg-red-50 border-l-4 border-red-500 p-4">
        <div className="flex items-start">
          <AlertCircle className="h-5 w-5 text-red-600 mt-0.5 mr-3 flex-shrink-0" />
          <div className="flex-1">
            <h3 className="text-sm font-medium text-red-800">
              Subscription Cancelled
            </h3>
            <p className="mt-1 text-sm text-red-700">
              Your subscription has been cancelled. Resubscribe to regain access
              to all features.
            </p>
            <button
              onClick={() => router.push('/billing/plans')}
              className="mt-3 inline-flex items-center rounded-lg bg-red-600 px-4 py-2 text-sm font-medium text-white hover:bg-red-700 transition-colors"
            >
              View Plans
            </button>
          </div>
        </div>
      </div>
    );
  }

  if (status === 'trialing' && currentPeriodEnd) {
    const daysLeft = Math.ceil(
      (new Date(currentPeriodEnd).getTime() - Date.now()) / (1000 * 60 * 60 * 24)
    );

    if (daysLeft <= 7) {
      return (
        <div className="bg-blue-50 border-l-4 border-blue-500 p-4">
          <div className="flex items-start">
            <AlertCircle className="h-5 w-5 text-blue-600 mt-0.5 mr-3 flex-shrink-0" />
            <div className="flex-1">
              <h3 className="text-sm font-medium text-blue-800">
                Trial Ending Soon
              </h3>
              <p className="mt-1 text-sm text-blue-700">
                Your trial ends in {daysLeft} {daysLeft === 1 ? 'day' : 'days'}.
                Add a payment method to continue.
              </p>
              <button
                onClick={() => router.push('/billing')}
                className="mt-3 inline-flex items-center gap-2 rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 transition-colors"
              >
                <CreditCard className="h-4 w-4" />
                Add Payment Method
              </button>
            </div>
          </div>
        </div>
      );
    }
  }

  return null;
}
