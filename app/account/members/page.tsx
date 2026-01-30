'use client';

import { useState } from 'react';
import { Search, Info, MoreHorizontal, ChevronDown } from 'lucide-react';

export default function MembersPage() {
  const [emailInput, setEmailInput] = useState('');

  const members = [
    {
      id: 1,
      name: 'Thorstein Nordby',
      email: 'thorstein@nettly.no',
      role: 'Admin',
      initials: 'TN',
      isYou: true,
    },
  ];

  return (
    <div className="p-8">
      {/* Header with role filter and search */}
      <div className="mb-6 flex items-center justify-between">
        <h1 className="text-3xl font-semibold text-gray-900">All members ({members.length})</h1>
        <div className="flex items-center gap-3">
          <button className="flex items-center gap-2 rounded-xl border border-gray-200 bg-white px-4 py-2 text-sm font-medium text-gray-700 transition-colors hover:bg-gray-50">
            Role
            <ChevronDown className="h-4 w-4" />
          </button>
          <button className="flex h-10 w-10 items-center justify-center rounded-xl border border-gray-200 bg-white text-gray-600 transition-colors hover:bg-gray-50">
            <Search className="h-5 w-5" />
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
        {/* Main content */}
        <div className="lg:col-span-3 space-y-6">
          {/* Role statistics */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {/* Admins */}
            <div className="rounded-2xl border border-gray-200 bg-gray-50 p-6 relative">
              <div className="absolute top-4 right-4 flex h-8 w-8 items-center justify-center rounded-full bg-[#bfe937]">
                <span className="text-sm font-semibold text-gray-900">TN</span>
              </div>
              <div className="text-4xl font-semibold text-gray-900 mb-2">1</div>
              <div className="flex items-center gap-2 text-sm text-gray-600">
                <span>Admins</span>
                <Info className="h-4 w-4" />
              </div>
            </div>

            {/* Users */}
            <div className="rounded-2xl border border-gray-200 bg-white p-6">
              <div className="text-4xl font-semibold text-gray-900 mb-2">0</div>
              <div className="flex items-center gap-2 text-sm text-gray-600">
                <span>Users</span>
                <Info className="h-4 w-4" />
              </div>
            </div>

            {/* Light Users */}
            <div className="rounded-2xl border border-gray-200 bg-white p-6">
              <div className="text-4xl font-semibold text-gray-900 mb-2">0</div>
              <div className="flex items-center gap-2 text-sm text-gray-600">
                <span>Light Users</span>
                <Info className="h-4 w-4" />
              </div>
            </div>
          </div>

          {/* Members list */}
          <div className="rounded-2xl border border-gray-200 bg-white">
            {members.map((member) => (
              <div
                key={member.id}
                className="flex items-center justify-between p-6 border-b border-gray-100 last:border-b-0"
              >
                <div className="flex items-center gap-4">
                  <div className="flex h-12 w-12 items-center justify-center rounded-full bg-[#bfe937]">
                    <span className="text-sm font-semibold text-gray-900">{member.initials}</span>
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <h3 className="text-base font-semibold text-gray-900">{member.name}</h3>
                      {member.isYou && (
                        <span className="text-sm text-gray-500">• You</span>
                      )}
                    </div>
                    <p className="text-sm text-gray-600">{member.email}</p>
                  </div>
                </div>

                <div className="flex items-center gap-4">
                  <button className="flex items-center gap-2 rounded-xl border border-gray-200 bg-white px-4 py-2 text-sm font-medium text-gray-700 transition-colors hover:bg-gray-50">
                    {member.role}
                    <ChevronDown className="h-4 w-4" />
                  </button>
                  <button className="flex h-10 w-10 items-center justify-center rounded-xl text-gray-600 transition-colors hover:bg-gray-50">
                    <MoreHorizontal className="h-5 w-5" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Right sidebar - Invite panel */}
        <div className="lg:col-span-1">
          <div className="rounded-2xl border border-gray-200 bg-white p-6 sticky top-6">
            <h2 className="text-lg font-semibold text-gray-900 mb-6">Invite new members</h2>

            <div className="space-y-4">
              {/* Email input */}
              <div>
                <textarea
                  placeholder="Emails, separated by enter"
                  value={emailInput}
                  onChange={(e) => setEmailInput(e.target.value)}
                  rows={4}
                  className="w-full rounded-xl border border-gray-200 bg-white px-4 py-3 text-sm placeholder:text-gray-400 focus:border-gray-400 focus:outline-none focus:ring-2 focus:ring-gray-200 resize-none"
                />
              </div>

              {/* Task selection */}
              <div>
                <label className="block text-sm text-gray-600 mb-2">Invite for task</label>
                <select className="w-full rounded-xl border border-gray-200 bg-white px-4 py-3 text-sm text-gray-400 focus:border-gray-400 focus:outline-none focus:ring-2 focus:ring-gray-200">
                  <option>Select at least one</option>
                </select>
              </div>

              {/* Invite button */}
              <button className="w-full rounded-xl bg-teal-600 px-6 py-3 text-sm font-medium text-white transition-colors hover:bg-teal-700">
                Invite
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
