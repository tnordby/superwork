'use client';

import { useEffect, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { CheckCircle } from 'lucide-react';

export default function BillingSuccessPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const sessionId = searchParams.get('session_id');
  const [countdown, setCountdown] = useState(5);

  useEffect(() => {
    if (!sessionId) {
      router.push('/billing');
      return;
    }

    // Countdown timer
    const timer = setInterval(() => {
      setCountdown((prev) => {
        if (prev <= 1) {
          clearInterval(timer);
          router.push('/billing');
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(timer);
  }, [sessionId, router]);

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 px-4">
      <div className="max-w-md w-full">
        <div className="rounded-2xl border border-gray-200 bg-white p-8 shadow-sm text-center">
          <div className="mx-auto w-16 h-16 rounded-full bg-green-100 flex items-center justify-center mb-6">
            <CheckCircle className="h-10 w-10 text-green-600" />
          </div>

          <h1 className="text-2xl font-bold text-gray-900 mb-2">
            Subscription Activated!
          </h1>

          <p className="text-gray-600 mb-8">
            Your subscription has been successfully activated. You now have full access to all features.
          </p>

          <div className="space-y-4">
            <button
              onClick={() => router.push('/billing')}
              className="w-full rounded-xl bg-[#bfe937] px-6 py-3 text-sm font-medium text-gray-900 transition-colors hover:bg-[#acd829]"
            >
              View Billing Dashboard
            </button>

            <button
              onClick={() => router.push('/')}
              className="w-full rounded-xl bg-gray-100 px-6 py-3 text-sm font-medium text-gray-900 transition-colors hover:bg-gray-200"
            >
              Go to Dashboard
            </button>
          </div>

          <p className="text-sm text-gray-500 mt-6">
            Redirecting to billing dashboard in {countdown} seconds...
          </p>
        </div>
      </div>
    </div>
  );
}
