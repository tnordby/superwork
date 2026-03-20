import Link from 'next/link';
import { BadgeCheck, CircleOff, Users } from 'lucide-react';
import { loadCustomersOverview } from '@/lib/team/customers-overview';

export const dynamic = 'force-dynamic';

function formatCurrency(value: number): string {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    maximumFractionDigits: 0,
  }).format(value);
}

export default async function TeamCustomersPage() {
  const { rows } = await loadCustomersOverview();

  return (
    <div className="p-8 space-y-6">
      <div>
        <h1 className="text-3xl font-semibold text-gray-900">Customers</h1>
        <p className="mt-1 text-sm text-gray-600">
          Internal overview of active and inactive customers with assigned PM and consultants.
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="rounded-xl border border-gray-200 bg-white p-4">
          <p className="text-xs uppercase tracking-wide text-gray-500">Total customers</p>
          <p className="mt-2 text-2xl font-semibold text-gray-900">{rows.length}</p>
        </div>
        <div className="rounded-xl border border-gray-200 bg-white p-4">
          <p className="text-xs uppercase tracking-wide text-gray-500">Active</p>
          <p className="mt-2 text-2xl font-semibold text-green-700">
            {rows.filter((c) => c.status === 'active').length}
          </p>
        </div>
        <div className="rounded-xl border border-gray-200 bg-white p-4">
          <p className="text-xs uppercase tracking-wide text-gray-500">Inactive</p>
          <p className="mt-2 text-2xl font-semibold text-gray-600">
            {rows.filter((c) => c.status === 'inactive').length}
          </p>
        </div>
      </div>

      <div className="overflow-hidden rounded-xl border border-gray-200 bg-white">
        <table className="w-full text-sm">
          <thead className="bg-gray-50 text-gray-600">
            <tr>
              <th className="px-4 py-3 text-left font-medium">Customer</th>
              <th className="px-4 py-3 text-left font-medium">Status</th>
              <th className="px-4 py-3 text-left font-medium">Project manager</th>
              <th className="px-4 py-3 text-left font-medium">Consultants</th>
              <th className="px-4 py-3 text-right font-medium">MRR</th>
              <th className="px-4 py-3 text-right font-medium">ARR</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((customer) => (
              <tr key={customer.id} className="border-t border-gray-100">
                <td className="px-4 py-3">
                  <div className="flex items-center gap-2">
                    <Users className="h-4 w-4 text-gray-500" />
                    <Link
                      href={`/team/customers/${customer.id}`}
                      className="font-medium text-gray-900 underline-offset-2 hover:underline"
                    >
                      {customer.name}
                    </Link>
                  </div>
                </td>
                <td className="px-4 py-3">
                  {customer.status === 'active' ? (
                    <span className="inline-flex items-center gap-1 rounded-full bg-green-100 px-2.5 py-1 text-xs font-medium text-green-700">
                      <BadgeCheck className="h-3.5 w-3.5" />
                      Active
                    </span>
                  ) : (
                    <span className="inline-flex items-center gap-1 rounded-full bg-gray-100 px-2.5 py-1 text-xs font-medium text-gray-700">
                      <CircleOff className="h-3.5 w-3.5" />
                      Inactive
                    </span>
                  )}
                </td>
                <td className="px-4 py-3 text-gray-700">{customer.projectManager}</td>
                <td className="px-4 py-3 text-gray-700">
                  {customer.consultants.length > 0 ? customer.consultants.join(', ') : 'Unassigned'}
                </td>
                <td className="px-4 py-3 text-right font-medium text-gray-900">
                  {formatCurrency(customer.mrr)}
                </td>
                <td className="px-4 py-3 text-right font-medium text-gray-900">
                  {formatCurrency(customer.arr)}
                </td>
              </tr>
            ))}
            {rows.length === 0 && (
              <tr>
                <td colSpan={6} className="px-4 py-8 text-center text-sm text-gray-500">
                  No customers found.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}

