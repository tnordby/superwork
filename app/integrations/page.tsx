'use client'

import { Info } from 'lucide-react'

const integrations = [
  {
    name: 'Slack',
    description: 'Get project notifications, quick actions and chat messages directly in Slack',
    icon: '💬',
    color: 'bg-purple-100',
  },
  {
    name: 'Basecamp',
    description: 'Sync projects and tasks between Superwork and Basecamp seamlessly',
    icon: '⛺',
    color: 'bg-green-100',
  },
  {
    name: 'Asana',
    description: 'Get project notifications, quick actions and task updates directly in Asana',
    icon: '🔴',
    color: 'bg-red-100',
  },
  {
    name: 'Monday.com',
    description: 'Get project notifications, quick actions and chat messages directly in Monday',
    icon: '📊',
    color: 'bg-orange-100',
  },
  {
    name: 'Teamwork',
    description: 'Sync projects, tasks, and milestones with Teamwork for seamless collaboration',
    icon: '👥',
    color: 'bg-blue-100',
  },
  {
    name: 'Google Drive',
    description: 'Sync files seamlessly from Superwork to Google Drive with secure, real-time synchronization',
    icon: '📁',
    color: 'bg-yellow-100',
  },
]

export default function IntegrationsPage() {
  return (
    <div className="p-8">
      <div className="max-w-5xl mx-auto">
        <div className="mb-8">
          <h1 className="text-3xl font-semibold text-gray-900 mb-2">Integrations</h1>
          <p className="text-gray-600">
            Connect Superwork with your favorite tools to streamline your workflow
          </p>
        </div>

        <div className="space-y-4">
          {integrations.map((integration) => (
            <div
              key={integration.name}
              className="flex items-center justify-between bg-white rounded-xl border border-gray-200 p-6 hover:border-gray-300 transition-colors"
            >
              <div className="flex items-center gap-4">
                <div
                  className={`flex items-center justify-center w-12 h-12 rounded-lg ${integration.color} text-2xl`}
                >
                  {integration.icon}
                </div>
                <div>
                  <h3 className="text-lg font-semibold text-gray-900 mb-1">
                    {integration.name}
                  </h3>
                  <p className="text-sm text-gray-600">{integration.description}</p>
                </div>
              </div>

              <div className="flex items-center gap-3">
                <div className="flex items-center gap-2 px-4 py-2 bg-blue-50 text-blue-700 rounded-lg text-sm">
                  <Info className="h-4 w-4" />
                  <span className="font-medium">Coming soon</span>
                </div>
              </div>
            </div>
          ))}
        </div>

        <div className="mt-8 p-6 bg-gray-50 rounded-xl border border-gray-200">
          <h3 className="text-sm font-semibold text-gray-900 mb-2">
            Need a specific integration?
          </h3>
          <p className="text-sm text-gray-600 mb-4">
            Let us know which tools you'd like to connect with Superwork. We're always adding new integrations based on customer feedback.
          </p>
          <a
            href="/feedback"
            className="inline-flex items-center gap-2 px-4 py-2 bg-gray-900 text-white rounded-lg text-sm font-medium hover:bg-gray-800 transition-colors"
          >
            Request an integration
          </a>
        </div>
      </div>
    </div>
  )
}
