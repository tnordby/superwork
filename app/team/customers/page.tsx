import { BadgeCheck, CircleOff, Users } from 'lucide-react';

const placeholderCustomers = [
  {
    id: 'cust_1',
    name: 'Acme Labs',
    status: 'active',
    projectManager: 'Emma Johnson',
    consultants: ['Liam Carter', 'Noah Patel'],
  },
  {
    id: 'cust_2',
    name: 'Northstar Health',
    status: 'active',
    projectManager: 'Sofia Andersson',
    consultants: ['Olivia Chen'],
  },
  {
    id: 'cust_3',
    name: 'BrightPath SaaS',
    status: 'inactive',
    projectManager: 'Emma Johnson',
    consultants: ['Mason Reed'],
  },
  {
    id: 'cust_4',
    name: 'Summit Retail Group',
    status: 'active',
    projectManager: 'Lucas Berg',
    consultants: ['Ava Kim', 'Ethan Brooks'],
  },
  {
    id: 'cust_5',
    name: 'Evergreen Logistics',
    status: 'inactive',
    projectManager: 'Sofia Andersson',
    consultants: ['Mia Torres'],
  },
];

export default function TeamCustomersPage() {
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
          <p className="mt-2 text-2xl font-semibold text-gray-900">{placeholderCustomers.length}</p>
        </div>
        <div className="rounded-xl border border-gray-200 bg-white p-4">
          <p className="text-xs uppercase tracking-wide text-gray-500">Active</p>
          <p className="mt-2 text-2xl font-semibold text-green-700">
            {placeholderCustomers.filter((c) => c.status === 'active').length}
          </p>
        </div>
        <div className="rounded-xl border border-gray-200 bg-white p-4">
          <p className="text-xs uppercase tracking-wide text-gray-500">Inactive</p>
          <p className="mt-2 text-2xl font-semibold text-gray-600">
            {placeholderCustomers.filter((c) => c.status === 'inactive').length}
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
            </tr>
          </thead>
          <tbody>
            {placeholderCustomers.map((customer) => (
              <tr key={customer.id} className="border-t border-gray-100">
                <td className="px-4 py-3">
                  <div className="flex items-center gap-2">
                    <Users className="h-4 w-4 text-gray-500" />
                    <span className="font-medium text-gray-900">{customer.name}</span>
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
                <td className="px-4 py-3 text-gray-700">{customer.consultants.join(', ')}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

