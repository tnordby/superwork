'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { CreditCard, Calendar, ExternalLink, Download } from 'lucide-react';
import { formatAmount, formatBillingInterval, formatSubscriptionStatus } from '@/lib/stripe/utils';

interface Workspace {
  id: string;
  name: string;
  stripe_customer_id?: string;
  stripe_subscription_id?: string;
  stripe_subscription_status?: string;
  subscription_interval?: string;
  current_period_end?: string;
}

interface Invoice {
  id: string;
  number: string | null;
  amount: number;
  currency: string;
  status: string | null;
  created: string;
  pdfUrl: string | null;
  hostedUrl: string | null;
}

export default function BillingPage() {
  const [workspace, setWorkspace] = useState<Workspace | null>(null);
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [loading, setLoading] = useState(true);
  const [managingBilling, setManagingBilling] = useState(false);
  const router = useRouter();

  useEffect(() => {
    fetchBillingData();
  }, []);

  const fetchBillingData = async () => {
    try {
      const workspaceId = localStorage.getItem('currentWorkspaceId');

      if (!workspaceId) {
        router.push('/');
        return;
      }

      const response = await fetch(`/api/billing/workspace?workspaceId=${workspaceId}`);

      if (response.ok) {
        const data = await response.json();
        setWorkspace(data.workspace);
        setInvoices(data.invoices || []);
      }
    } catch (error) {
      console.error('Error fetching billing data:', error);
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

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-gray-900 mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading billing information...</p>
        </div>
      </div>
    );
  }

  const status = formatSubscriptionStatus(workspace?.stripe_subscription_status);
  const hasActiveSubscription = workspace?.stripe_subscription_status &&
    ['active', 'trialing'].includes(workspace.stripe_subscription_status);

  return (
    <div className="min-h-screen bg-gray-50 py-12 px-4">
      <div className="max-w-4xl mx-auto">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">Billing</h1>
          <p className="text-gray-600">Manage your subscription and billing information</p>
        </div>

        {/* Subscription Status Card */}
        <div className="rounded-2xl border border-gray-200 bg-white p-8 shadow-sm mb-6">
          {hasActiveSubscription ? (
            <>
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
            </>
          ) : (
            <>
              <div className="text-center py-8">
                <h2 className="text-xl font-semibold text-gray-900 mb-2">No Active Subscription</h2>
                <p className="text-gray-600 mb-6">
                  Subscribe to a plan to access all features
                </p>
                <button
                  onClick={() => router.push('/billing/plans')}
                  className="rounded-xl bg-[#bfe937] px-6 py-3 text-sm font-medium text-gray-900 transition-colors hover:bg-[#acd829]"
                >
                  View Plans
                </button>
              </div>
            </>
          )}
        </div>

        {/* Invoice History */}
        {invoices.length > 0 && (
          <div className="rounded-2xl border border-gray-200 bg-white p-8 shadow-sm">
            <h2 className="text-xl font-semibold text-gray-900 mb-6">Invoice History</h2>
            <div className="space-y-4">
              {invoices.map((invoice) => (
                <div
                  key={invoice.id}
                  className="flex items-center justify-between p-4 rounded-xl border border-gray-200 hover:bg-gray-50 transition-colors"
                >
                  <div className="flex-1">
                    <div className="flex items-center gap-3 mb-1">
                      <p className="font-medium text-gray-900">
                        {invoice.number || 'Invoice'}
                      </p>
                      <span className={`text-xs px-2 py-1 rounded ${
                        invoice.status === 'paid' ? 'bg-green-100 text-green-800' :
                        invoice.status === 'open' ? 'bg-blue-100 text-blue-800' :
                        'bg-gray-100 text-gray-800'
                      }`}>
                        {invoice.status || 'Unknown'}
                      </span>
                    </div>
                    <p className="text-sm text-gray-600">
                      {new Date(invoice.created).toLocaleDateString('en-US', {
                        month: 'long',
                        day: 'numeric',
                        year: 'numeric',
                      })}
                    </p>
                  </div>
                  <div className="flex items-center gap-4">
                    <p className="text-lg font-semibold text-gray-900">
                      {formatAmount(invoice.amount, invoice.currency)}
                    </p>
                    <div className="flex items-center gap-2">
                      {invoice.hostedUrl && (
                        <a
                          href={invoice.hostedUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="p-2 rounded-lg text-gray-600 hover:bg-gray-100 transition-colors"
                          title="View invoice"
                        >
                          <ExternalLink className="h-5 w-5" />
                        </a>
                      )}
                      {invoice.pdfUrl && (
                        <a
                          href={invoice.pdfUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="p-2 rounded-lg text-gray-600 hover:bg-gray-100 transition-colors"
                          title="Download PDF"
                        >
                          <Download className="h-5 w-5" />
                        </a>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
