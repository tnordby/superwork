'use client';

import { useRouter } from 'next/navigation';
import { XCircle } from 'lucide-react';

export default function BillingCancelPage() {
  const router = useRouter();

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 px-4">
      <div className="max-w-md w-full">
        <div className="rounded-2xl border border-gray-200 bg-white p-8 shadow-sm text-center">
          <div className="mx-auto w-16 h-16 rounded-full bg-orange-100 flex items-center justify-center mb-6">
            <XCircle className="h-10 w-10 text-orange-600" />
          </div>

          <h1 className="text-2xl font-bold text-gray-900 mb-2">
            Checkout Cancelled
          </h1>

          <p className="text-gray-600 mb-8">
            Your checkout was cancelled. No charges have been made to your account.
          </p>

          <div className="space-y-4">
            <button
              onClick={() => router.push('/billing/plans')}
              className="w-full rounded-xl bg-[#bfe937] px-6 py-3 text-sm font-medium text-gray-900 transition-colors hover:bg-[#acd829]"
            >
              View Plans Again
            </button>

            <button
              onClick={() => router.push('/')}
              className="w-full rounded-xl bg-gray-100 px-6 py-3 text-sm font-medium text-gray-900 transition-colors hover:bg-gray-200"
            >
              Go to Dashboard
            </button>
          </div>

          <p className="text-sm text-gray-500 mt-6">
            Need help? Contact our support team for assistance.
          </p>
        </div>
      </div>
    </div>
  );
}
