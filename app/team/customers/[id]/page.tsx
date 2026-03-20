import Link from 'next/link';
import { notFound } from 'next/navigation';
import { loadCustomersOverview } from '@/lib/team/customers-overview';

function formatCurrency(value: number): string {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    maximumFractionDigits: 0,
  }).format(value);
}

export default async function CustomerWorkspacePage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const { rows } = await loadCustomersOverview();
  const customer = rows.find((c) => c.id === id);

  if (!customer) {
    notFound();
  }

  return (
    <div className="p-8 space-y-6">
      <div>
        <Link href="/team/customers" className="text-sm text-gray-600 hover:text-gray-900">
          ← Back to customers
        </Link>
        <h1 className="mt-2 text-3xl font-semibold text-gray-900">{customer.name} Workspace</h1>
        <p className="mt-1 text-sm text-gray-600">
          Internal workspace overview with billing-derived customer metrics.
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
        <div className="rounded-xl border border-gray-200 bg-white p-4">
          <p className="text-xs uppercase tracking-wide text-gray-500">Status</p>
          <p className="mt-2 text-base font-semibold text-gray-900 capitalize">{customer.status}</p>
        </div>
        <div className="rounded-xl border border-gray-200 bg-white p-4">
          <p className="text-xs uppercase tracking-wide text-gray-500">Project manager</p>
          <p className="mt-2 text-base font-semibold text-gray-900">{customer.projectManager}</p>
        </div>
        <div className="rounded-xl border border-gray-200 bg-white p-4">
          <p className="text-xs uppercase tracking-wide text-gray-500">Consultants</p>
          <p className="mt-2 text-base font-semibold text-gray-900">
            {customer.consultants.length > 0 ? customer.consultants.join(', ') : 'Unassigned'}
          </p>
        </div>
        <div className="rounded-xl border border-gray-200 bg-white p-4">
          <p className="text-xs uppercase tracking-wide text-gray-500">MRR</p>
          <p className="mt-2 text-base font-semibold text-gray-900">{formatCurrency(customer.mrr)}</p>
        </div>
        <div className="rounded-xl border border-gray-200 bg-white p-4">
          <p className="text-xs uppercase tracking-wide text-gray-500">ARR</p>
          <p className="mt-2 text-base font-semibold text-gray-900">{formatCurrency(customer.arr)}</p>
        </div>
      </div>
    </div>
  );
}

