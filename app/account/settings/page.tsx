'use client';

import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { CreditCard } from 'lucide-react';

export default function SettingsPage() {
  const router = useRouter();
  const [notifyInboxLoading, setNotifyInboxLoading] = useState(true);
  const [notifyInbox, setNotifyInbox] = useState(true);
  const [notifyError, setNotifyError] = useState('');

  const [profileLoading, setProfileLoading] = useState(true);
  const [profileSaving, setProfileSaving] = useState(false);
  const [profileError, setProfileError] = useState('');
  const [profileSavedAt, setProfileSavedAt] = useState<number | null>(null);
  const [formData, setFormData] = useState({
    firstName: '',
    lastName: '',
    email: '',
  });

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const res = await fetch('/api/account/notification-preferences');
        if (!res.ok) throw new Error('load failed');
        const data = (await res.json()) as { emailNotifyInboxMessages?: boolean };
        if (!cancelled) {
          setNotifyInbox(data.emailNotifyInboxMessages !== false);
        }
      } catch {
        if (!cancelled) {
          setNotifyError('Could not load notification settings.');
        }
      } finally {
        if (!cancelled) setNotifyInboxLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const res = await fetch('/api/account/profile');
        if (res.status === 401) {
          router.push('/login');
          return;
        }
        if (!res.ok) throw new Error('load failed');
        const data = (await res.json()) as { firstName?: string; lastName?: string; email?: string };
        if (!cancelled) {
          setFormData({
            firstName: typeof data.firstName === 'string' ? data.firstName : '',
            lastName: typeof data.lastName === 'string' ? data.lastName : '',
            email: typeof data.email === 'string' ? data.email : '',
          });
        }
      } catch {
        if (!cancelled) {
          setProfileError('Could not load your profile.');
        }
      } finally {
        if (!cancelled) setProfileLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [router]);

  const updateNotifyInbox = useCallback(async (next: boolean) => {
    setNotifyError('');
    const res = await fetch('/api/account/notification-preferences', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ emailNotifyInboxMessages: next }),
    });
    if (!res.ok) {
      setNotifyError('Could not save your preference. Please try again.');
      return;
    }
    setNotifyInbox(next);
  }, []);

  const saveProfile = useCallback(async () => {
    setProfileError('');
    setProfileSavedAt(null);
    setProfileSaving(true);
    try {
      const res = await fetch('/api/account/profile', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          firstName: formData.firstName,
          lastName: formData.lastName,
        }),
      });
      if (res.status === 401) {
        router.push('/login');
        return;
      }
      if (!res.ok) {
        setProfileError('Could not save your details. Please try again.');
        return;
      }
      const data = (await res.json()) as { firstName?: string; lastName?: string; email?: string };
      setFormData({
        firstName: typeof data.firstName === 'string' ? data.firstName : '',
        lastName: typeof data.lastName === 'string' ? data.lastName : '',
        email: typeof data.email === 'string' ? data.email : formData.email,
      });
      setProfileSavedAt(Date.now());
    } finally {
      setProfileSaving(false);
    }
  }, [formData.firstName, formData.lastName, formData.email, router]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setProfileSavedAt(null);
    setFormData({
      ...formData,
      [e.target.name]: e.target.value,
    });
  };

  return (
    <div className="p-8">
      <h1 className="text-3xl font-semibold text-gray-900 mb-8">Settings</h1>

      <div className="space-y-8">
        <section className="rounded-2xl border border-gray-200 bg-white p-8">
          <h2 className="text-2xl font-semibold text-gray-900 mb-4">Notifications</h2>
          <p className="text-sm text-gray-600 mb-6">
            Control whether we email you when someone sends a message on one of your project threads.
          </p>
          {notifyError && (
            <p className="mb-4 text-sm text-red-600" role="alert">
              {notifyError}
            </p>
          )}
          <label className="flex cursor-pointer items-start gap-3">
            <input
              type="checkbox"
              className="mt-1 h-4 w-4 rounded border-gray-300"
              checked={notifyInbox}
              disabled={notifyInboxLoading}
              onChange={(e) => void updateNotifyInbox(e.target.checked)}
            />
            <span>
              <span className="block text-sm font-medium text-gray-900">New project message emails</span>
              <span className="mt-1 block text-sm text-gray-600">
                When on, we send a short email when someone messages you on a project thread.
              </span>
            </span>
          </label>
        </section>

        {/* Person of reference */}
        <section className="rounded-2xl border border-gray-200 bg-white p-8">
          <h2 className="text-2xl font-semibold text-gray-900 mb-8">Person of reference</h2>

          <div className="space-y-6">
            {profileError && (
              <p className="text-sm text-red-600" role="alert">
                {profileError}
              </p>
            )}
            {profileSavedAt !== null && !profileError && (
              <p className="text-sm text-gray-600">Your details were saved.</p>
            )}
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
                    disabled={profileLoading}
                    autoComplete="given-name"
                    className="w-full rounded-xl border border-gray-200 bg-white px-4 py-3 text-sm focus:border-gray-400 focus:outline-none focus:ring-2 focus:ring-gray-200 disabled:cursor-not-allowed disabled:bg-gray-50"
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
                    disabled={profileLoading}
                    autoComplete="family-name"
                    className="w-full rounded-xl border border-gray-200 bg-white px-4 py-3 text-sm focus:border-gray-400 focus:outline-none focus:ring-2 focus:ring-gray-200 disabled:cursor-not-allowed disabled:bg-gray-50"
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
                readOnly
                autoComplete="email"
                className="w-full md:w-1/2 rounded-xl border border-gray-200 bg-gray-50 px-4 py-3 text-sm text-gray-700"
              />
              <p className="mt-2 text-xs text-gray-500">
                Sign-in email is managed from your account provider; contact support if you need it changed.
              </p>
            </div>

            <div>
              <button
                type="button"
                onClick={() => void saveProfile()}
                disabled={profileLoading || profileSaving}
                className="rounded-xl bg-gray-900 px-6 py-3 text-sm font-medium text-white transition-colors hover:bg-gray-800 disabled:cursor-not-allowed disabled:opacity-50"
              >
                {profileSaving ? 'Saving…' : 'Save details'}
              </button>
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

      </div>
    </div>
  );
}
