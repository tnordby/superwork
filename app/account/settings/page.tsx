'use client';

import { useState } from 'react';
import { CreditCard } from 'lucide-react';

export default function SettingsPage() {
  const [formData, setFormData] = useState({
    firstName: 'Thorstein',
    lastName: 'Nordby',
    email: 'thorstein@nettly.no',
  });

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value,
    });
  };

  return (
    <div className="p-8">
      <h1 className="text-3xl font-semibold text-gray-900 mb-8">Settings</h1>

      <div className="space-y-8">
        {/* Person of reference */}
        <section className="rounded-2xl border border-gray-200 bg-white p-8">
          <h2 className="text-2xl font-semibold text-gray-900 mb-8">Person of reference</h2>

          <div className="space-y-6">
            <div>
              <h3 className="text-base font-medium text-gray-900 mb-6">Details</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <label htmlFor="firstName" className="block text-sm font-medium text-gray-900 mb-2">
                    Name
                  </label>
                  <input
                    type="text"
                    id="firstName"
                    name="firstName"
                    value={formData.firstName}
                    onChange={handleChange}
                    className="w-full rounded-xl border border-gray-200 bg-white px-4 py-3 text-sm focus:border-gray-400 focus:outline-none focus:ring-2 focus:ring-gray-200"
                  />
                </div>
                <div>
                  <label htmlFor="lastName" className="block text-sm font-medium text-gray-900 mb-2">
                    Surname
                  </label>
                  <input
                    type="text"
                    id="lastName"
                    name="lastName"
                    value={formData.lastName}
                    onChange={handleChange}
                    className="w-full rounded-xl border border-gray-200 bg-white px-4 py-3 text-sm focus:border-gray-400 focus:outline-none focus:ring-2 focus:ring-gray-200"
                  />
                </div>
              </div>
            </div>

            <div>
              <label htmlFor="email" className="block text-sm font-medium text-gray-900 mb-2">
                Email
              </label>
              <input
                type="email"
                id="email"
                name="email"
                value={formData.email}
                onChange={handleChange}
                className="w-full md:w-1/2 rounded-xl border border-gray-200 bg-white px-4 py-3 text-sm focus:border-gray-400 focus:outline-none focus:ring-2 focus:ring-gray-200"
              />
            </div>
          </div>
        </section>

        {/* Payment methods */}
        <section className="rounded-2xl border border-gray-200 bg-white p-8">
          <h2 className="text-2xl font-semibold text-gray-900 mb-8">Payment methods</h2>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            <div>
              <h3 className="text-base font-semibold text-gray-900 mb-2">Credit or debit cards</h3>
              <p className="text-sm text-gray-600">Connected cards will appear here listed</p>
            </div>

            <div className="lg:col-span-2">
              <h3 className="text-base font-semibold text-gray-900 mb-4">Add new card</h3>

              <div className="flex flex-col sm:flex-row gap-4 mb-4">
                <div className="flex-1 relative">
                  <CreditCard className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-400" />
                  <input
                    type="text"
                    placeholder="Card number"
                    className="w-full rounded-xl border border-gray-200 bg-white pl-12 pr-4 py-3 text-sm focus:border-gray-400 focus:outline-none focus:ring-2 focus:ring-gray-200"
                  />
                </div>
                <button className="rounded-xl bg-gray-900 px-6 py-3 text-sm font-medium text-white transition-colors hover:bg-gray-800">
                  Autofill <span className="text-[#bfe937]">link</span>
                </button>
                <button className="rounded-xl bg-teal-600 px-6 py-3 text-sm font-medium text-white transition-colors hover:bg-teal-700">
                  Add card
                </button>
              </div>

              <p className="text-xs text-gray-500">
                A temporary $0.5 charge that automatically refunds might be applied to verify your credit card at the start of your project
              </p>
            </div>
          </div>
        </section>

        {/* Bank accounts */}
        <section className="rounded-2xl border border-gray-200 bg-white p-8">
          <h2 className="text-2xl font-semibold text-gray-900 mb-8">Bank accounts</h2>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            <div>
              <p className="text-sm text-gray-600 mb-1">
                Contact <a href="mailto:payment@superwork.co" className="text-blue-600 hover:underline">payment@superwork.co</a>
              </p>
              <p className="text-sm text-gray-600">if you want to disconnect a bank account</p>
            </div>

            <div className="lg:col-span-2">
              <h3 className="text-base font-semibold text-gray-900 mb-4">
                Connecting a bank account is easy and secure
              </h3>

              <button className="rounded-xl border border-gray-300 bg-white px-6 py-3 text-sm font-medium text-gray-700 transition-colors hover:bg-gray-50">
                Add account
              </button>
            </div>
          </div>
        </section>
      </div>
    </div>
  );
}
