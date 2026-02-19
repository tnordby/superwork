'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { ExternalLink, Download } from 'lucide-react';
import { formatAmount } from '@/lib/stripe/utils';
import { createClient } from '@/lib/supabase/client';

interface Workspace {
  id: string;
  name: string;
  stripe_customer_id?: string;
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

export default function InvoicesPage() {
  const [workspace, setWorkspace] = useState<Workspace | null>(null);
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [loading, setLoading] = useState(true);
  const router = useRouter();

  useEffect(() => {
    fetchInvoices();
  }, []);

  const fetchInvoices = async () => {
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

        // Fetch billing data if workspace has stripe customer
        if (workspaceData.stripe_customer_id) {
          const response = await fetch(`/api/billing/workspace?workspaceId=${workspaceData.id}`);
          if (response.ok) {
            const data = await response.json();
            setInvoices(data.invoices || []);
          }
        }
      }
    } catch (error) {
      console.error('Error fetching invoices:', error);
    } finally {
      setLoading(false);
    }
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

  return (
    <div className="p-8">
      <h1 className="text-3xl font-semibold text-gray-900 mb-2">Invoices</h1>
      <p className="text-gray-600 mb-8">Invoice history and downloads</p>

      {invoices.length > 0 ? (
        <div className="rounded-2xl border border-gray-200 bg-white p-8 shadow-sm">
          <h2 className="text-xl font-semibold text-gray-900 mb-6">Invoice History</h2>
          <div className="space-y-3">
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
      ) : (
        <div className="rounded-2xl border border-gray-200 bg-gray-50 p-12 text-center">
          <p className="text-gray-600">No invoices yet. Invoices will appear here after your first payment.</p>
        </div>
      )}
    </div>
  );
}
