import Link from 'next/link';
import { DollarSign } from 'lucide-react';

export default function Home() {
  // Mock data for active projects
  const activeProjects = [
    { id: 1, name: 'Website Redesign', status: 'In Progress', progress: 65 },
    { id: 2, name: 'Marketing Campaign', status: 'Planning', progress: 20 },
    { id: 3, name: 'Brand Guidelines', status: 'In Progress', progress: 80 },
  ];

  return (
    <div className="p-8">
      <h1 className="text-3xl font-semibold text-gray-900 mb-8">Dashboard</h1>

      {/* Grid Layout - 2 columns */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Active Projects Card */}
        <section className="rounded-2xl border border-gray-200 bg-white p-6">
          <h2 className="text-xl font-semibold text-gray-900 mb-4">Active Projects</h2>
          <div className="space-y-4">
            {activeProjects.map((project) => (
              <div key={project.id} className="pb-4 border-b border-gray-100 last:border-0 last:pb-0">
                <div className="flex items-start justify-between mb-2">
                  <div>
                    <h3 className="font-medium text-gray-900">{project.name}</h3>
                    <p className="text-sm text-gray-500">{project.status}</p>
                  </div>
                  <span className="text-sm font-medium text-gray-700">{project.progress}%</span>
                </div>
                <div className="w-full bg-gray-100 rounded-full h-2">
                  <div
                    className="bg-[#bfe937] h-2 rounded-full transition-all"
                    style={{ width: `${project.progress}%` }}
                  />
                </div>
              </div>
            ))}
          </div>
          <Link
            href="/projects"
            className="inline-block mt-6 text-sm font-medium text-gray-600 hover:text-gray-900 transition-colors"
          >
            View all projects →
          </Link>
        </section>

        {/* Subscription/Usage Card */}
        <section className="rounded-2xl border border-gray-200 bg-gray-50 p-6">
          <div className="flex items-center gap-3 mb-6">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-[#0e141d]">
              <DollarSign className="h-5 w-5 text-white" />
            </div>
            <h2 className="text-xl font-semibold text-gray-900">Subscription</h2>
          </div>

          <div className="space-y-4 mb-6">
            <div className="flex items-center justify-between">
              <span className="text-gray-600">Total balance</span>
              <span className="text-lg font-semibold text-gray-900">0.00</span>
            </div>

            <div className="flex items-center justify-between">
              <span className="text-gray-600">Used</span>
              <span className="text-lg font-semibold text-gray-900">0.00</span>
            </div>

            <div className="flex items-center justify-between">
              <span className="text-gray-600">In progress</span>
              <span className="text-lg font-semibold text-gray-900">0.00 → 0.00</span>
            </div>

            <div className="flex items-center justify-between">
              <span className="text-gray-600">Available</span>
              <span className="text-lg font-semibold text-gray-900">0.00 → 0.00</span>
            </div>
          </div>

          <Link
            href="/account/usage"
            className="inline-block text-sm font-medium text-gray-600 hover:text-gray-900 transition-colors"
          >
            view report
          </Link>
        </section>

        {/* Recent Activity Card */}
        <section className="rounded-2xl border border-gray-200 bg-white p-6">
          <h2 className="text-xl font-semibold text-gray-900 mb-4">Recent Activity</h2>
          <div className="space-y-3">
            <div className="flex items-start gap-3 pb-3 border-b border-gray-100">
              <div className="flex h-8 w-8 items-center justify-center rounded-full bg-blue-100 text-blue-600 text-xs font-medium">
                WR
              </div>
              <div className="flex-1">
                <p className="text-sm text-gray-900">Website Redesign project updated</p>
                <p className="text-xs text-gray-500">2 hours ago</p>
              </div>
            </div>
            <div className="flex items-start gap-3 pb-3 border-b border-gray-100">
              <div className="flex h-8 w-8 items-center justify-center rounded-full bg-green-100 text-green-600 text-xs font-medium">
                MC
              </div>
              <div className="flex-1">
                <p className="text-sm text-gray-900">Marketing Campaign started</p>
                <p className="text-xs text-gray-500">1 day ago</p>
              </div>
            </div>
            <div className="flex items-start gap-3 pb-3">
              <div className="flex h-8 w-8 items-center justify-center rounded-full bg-purple-100 text-purple-600 text-xs font-medium">
                BG
              </div>
              <div className="flex-1">
                <p className="text-sm text-gray-900">Brand Guidelines in review</p>
                <p className="text-xs text-gray-500">3 days ago</p>
              </div>
            </div>
          </div>
        </section>

        {/* Quick Actions Card */}
        <section className="rounded-2xl border border-gray-200 bg-white p-6">
          <h2 className="text-xl font-semibold text-gray-900 mb-4">Quick Actions</h2>
          <div className="space-y-3">
            <Link
              href="/projects"
              className="block w-full px-4 py-3 text-left text-sm font-medium text-gray-700 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors"
            >
              View all projects
            </Link>
            <Link
              href="/account/balance"
              className="block w-full px-4 py-3 text-left text-sm font-medium text-gray-700 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors"
            >
              Check account balance
            </Link>
            <Link
              href="/assets"
              className="block w-full px-4 py-3 text-left text-sm font-medium text-gray-700 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors"
            >
              Browse assets
            </Link>
            <Link
              href="/feedback"
              className="block w-full px-4 py-3 text-left text-sm font-medium text-gray-700 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors"
            >
              Submit feedback
            </Link>
          </div>
        </section>
      </div>
    </div>
  );
}
