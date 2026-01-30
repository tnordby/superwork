'use client';

import { useState } from 'react';
import { ChevronRight, ArrowLeftRight } from 'lucide-react';

export default function BalancePage() {
  const [selectedMonth] = useState('Jan 2026');

  return (
    <div className="p-8">
      {/* Header with balance and transfer button */}
      <div className="mb-8">
        <h1 className="text-3xl font-semibold text-gray-900 mb-6">Balance</h1>

        <div className="flex items-center justify-between rounded-2xl border border-gray-200 bg-white p-6">
          <div className="flex items-center gap-4">
            <span className="text-base font-medium text-gray-900">Balance</span>
            <select className="rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm font-medium text-gray-900 focus:border-gray-400 focus:outline-none focus:ring-2 focus:ring-gray-200">
              <option>{selectedMonth}</option>
            </select>
          </div>
          <div className="flex items-center gap-6">
            <div className="text-right">
              <div className="text-2xl font-semibold text-gray-900">0.00</div>
              <div className="text-sm text-gray-500">Available balance</div>
            </div>
            <button className="flex items-center gap-2 rounded-xl border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 transition-colors hover:bg-gray-50">
              <ArrowLeftRight className="h-4 w-4" />
              Balance transfer
            </button>
          </div>
        </div>
      </div>

      {/* Main content grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left sidebar */}
        <div className="space-y-4">
          {/* Starting balance */}
          <button className="w-full rounded-xl border border-gray-200 bg-gray-50 p-6 text-left transition-colors hover:bg-gray-100">
            <div className="flex items-center justify-between mb-2">
              <h3 className="text-base font-semibold text-gray-900">Starting balance</h3>
              <ChevronRight className="h-5 w-5 text-gray-400" />
            </div>
            <p className="text-2xl font-semibold text-gray-900">0.00</p>
          </button>

          {/* Transfers */}
          <button className="w-full rounded-xl border border-gray-200 bg-white p-6 text-left transition-colors hover:bg-gray-50">
            <div className="flex items-center justify-between mb-2">
              <h3 className="text-base font-semibold text-gray-900">Transfers</h3>
              <ChevronRight className="h-5 w-5 text-gray-400" />
            </div>
            <p className="text-sm text-gray-500">No transfers</p>
          </button>

          {/* Used balance */}
          <button className="w-full rounded-xl border border-gray-200 bg-white p-6 text-left transition-colors hover:bg-gray-50">
            <div className="flex items-center justify-between mb-2">
              <h3 className="text-base font-semibold text-gray-900">Used balance</h3>
              <ChevronRight className="h-5 w-5 text-gray-400" />
            </div>
            <p className="text-sm text-gray-500">No projects</p>
          </button>

          {/* In progress balance */}
          <button className="w-full rounded-xl border border-gray-200 bg-white p-6 text-left transition-colors hover:bg-gray-50">
            <div className="flex items-center justify-between mb-2">
              <h3 className="text-base font-semibold text-gray-900">In progress balance</h3>
              <ChevronRight className="h-5 w-5 text-gray-400" />
            </div>
            <p className="text-sm text-gray-500">No projects</p>
          </button>

          {/* Expiring balance */}
          <div className="rounded-xl border border-gray-200 bg-white p-6">
            <h3 className="text-base font-semibold text-gray-900 mb-2">Expiring balance</h3>
            <p className="text-2xl font-semibold text-gray-900">0.00</p>
          </div>

          {/* Available balance */}
          <div className="rounded-xl border border-gray-200 bg-white p-6">
            <h3 className="text-base font-semibold text-gray-900 mb-2">Available balance</h3>
            <p className="text-2xl font-semibold text-gray-900">0.00</p>
          </div>
        </div>

        {/* Right content area */}
        <div className="lg:col-span-2">
          <div className="rounded-2xl border border-gray-200 bg-white p-8">
            <div className="flex items-start justify-between mb-6">
              <div>
                <h2 className="text-2xl font-semibold text-gray-900 mb-2">Starting balance</h2>
                <p className="text-sm text-gray-600">This page shows the starting balance for this specific budget.</p>
              </div>
              <div className="text-3xl font-semibold text-gray-900">0.00</div>
            </div>

            {/* Balance breakdown */}
            <div className="space-y-4">
              <div className="flex items-center justify-between py-4 border-b border-gray-100">
                <div className="flex items-center gap-3">
                  <div className="h-2 w-2 rounded-full bg-blue-600"></div>
                  <span className="text-sm text-gray-900">Unallocated monthly recurring budget</span>
                </div>
                <span className="text-sm font-medium text-gray-900">0.00</span>
              </div>

              <div className="flex items-center justify-between py-4 border-b border-gray-100">
                <div className="flex items-center gap-3">
                  <div className="h-2 w-2 rounded-full bg-sky-400"></div>
                  <span className="text-sm text-gray-900">Carried over from December 2025</span>
                </div>
                <span className="text-sm font-medium text-gray-900">0.00</span>
              </div>

              <div className="flex items-center justify-between py-4 border-b border-gray-100">
                <div className="flex items-center gap-3">
                  <div className="h-2 w-2 rounded-full bg-red-400"></div>
                  <span className="text-sm text-gray-900">Adjustments</span>
                </div>
                <span className="text-sm font-medium text-gray-900">0.00</span>
              </div>

              <div className="flex items-center justify-between py-4">
                <div className="flex items-center gap-3">
                  <div className="h-2 w-2 rounded-full bg-yellow-400"></div>
                  <span className="text-sm text-gray-900">Booster</span>
                </div>
                <span className="text-sm font-medium text-gray-900">0.00</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
