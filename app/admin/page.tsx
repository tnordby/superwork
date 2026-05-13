import Link from 'next/link'

export default function AdminPage() {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
      <Link
        href="/admin/services"
        className="block p-6 bg-white rounded-lg shadow-sm border border-gray-200 hover:border-blue-500 hover:shadow-md transition-all"
      >
        <div className="flex items-center gap-4">
          <div className="p-3 bg-blue-100 rounded-lg">
            <svg
              className="w-6 h-6 text-blue-600"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2"
              />
            </svg>
          </div>
          <div>
            <h2 className="text-lg font-semibold text-gray-900">Services</h2>
            <p className="text-sm text-gray-600">Manage service templates</p>
          </div>
        </div>
      </Link>

      <Link
        href="/admin/billing"
        className="block p-6 bg-white rounded-lg shadow-sm border border-gray-200 hover:border-emerald-400 hover:shadow-md transition-all"
      >
        <div className="flex items-center gap-4">
          <div className="p-3 bg-emerald-100 rounded-lg">
            <svg
              className="w-6 h-6 text-emerald-800"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
              />
            </svg>
          </div>
          <div>
            <h2 className="text-lg font-semibold text-gray-900">Workspace pricing</h2>
            <p className="text-sm text-gray-600">Slider vs legacy tiers and sales flags</p>
          </div>
        </div>
      </Link>

      <Link
        href="/admin/users"
        className="block p-6 bg-white rounded-lg shadow-sm border border-gray-200 hover:border-amber-400 hover:shadow-md transition-all"
      >
        <div className="flex items-center gap-4">
          <div className="p-3 bg-amber-100 rounded-lg">
            <svg
              className="w-6 h-6 text-amber-800"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z"
              />
            </svg>
          </div>
          <div>
            <h2 className="text-lg font-semibold text-gray-900">Users & roles</h2>
            <p className="text-sm text-gray-600">Assign customer, consultant, PM, or admin</p>
          </div>
        </div>
      </Link>

      <div className="block p-6 bg-white rounded-lg shadow-sm border border-gray-200 opacity-50 cursor-not-allowed">
        <div className="flex items-center gap-4">
          <div className="p-3 bg-gray-100 rounded-lg">
            <svg
              className="w-6 h-6 text-gray-600"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z"
              />
            </svg>
          </div>
          <div>
            <h2 className="text-lg font-semibold text-gray-900">Analytics</h2>
            <p className="text-sm text-gray-600">Coming soon</p>
          </div>
        </div>
      </div>
    </div>
  )
}
