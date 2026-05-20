'use client';

import { useLayoutEffect, useState } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { createClient } from '@/lib/supabase/client';
import {
  isBlockedSignupEmailDomain,
  SIGNUP_WORK_EMAIL_REQUIRED_MESSAGE,
} from '@/lib/auth/blocked-signup-email-domains';
import { DEFAULT_POST_AUTH_PATH } from '@/lib/auth/post-auth-path';
import { GoogleAuthButton } from '@/components/auth/GoogleAuthButton';
import { Mail, Lock, User, AlertCircle, CheckCircle } from 'lucide-react';

type SignupPageClientProps = {
  initialOAuthErrorMessage?: string;
};

export function SignupPageClient({ initialOAuthErrorMessage }: SignupPageClientProps) {
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [honeypot, setHoneypot] = useState('');
  const [error, setError] = useState(initialOAuthErrorMessage ?? '');
  const [success, setSuccess] = useState(false);
  const [loading, setLoading] = useState(false);
  const supabase = createClient();

  useLayoutEffect(() => {
    if (!initialOAuthErrorMessage || typeof window === 'undefined') return;
    const u = new URL(window.location.href);
    if (u.searchParams.get('error') !== 'work-email') return;
    u.searchParams.delete('error');
    const q = u.searchParams.toString();
    window.history.replaceState({}, '', q ? `${u.pathname}?${q}` : u.pathname);
  }, [initialOAuthErrorMessage]);

  const handleSignup = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setSuccess(false);
    setLoading(true);

    if (honeypot.trim() !== '') {
      setLoading(false);
      return;
    }

    if (isBlockedSignupEmailDomain(email)) {
      setError(SIGNUP_WORK_EMAIL_REQUIRED_MESSAGE);
      setLoading(false);
      return;
    }

    try {
      const { data, error } = await supabase.auth.signUp({
        email,
        password,
        options: {
          data: {
            first_name: firstName,
            last_name: lastName,
          },
        },
      });

      if (error) {
        setError(error.message);
        setLoading(false);
        return;
      }

      if (data.user) {
        setSuccess(true);

        fetch('/api/emails/welcome', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          credentials: 'include',
          body: JSON.stringify({ email, firstName }),
        }).catch(err => {
          console.error('Failed to send welcome email:', err);
        });

        setTimeout(() => {
          window.location.assign(DEFAULT_POST_AUTH_PATH);
        }, 2000);
      }
    } catch {
      setError('An unexpected error occurred');
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 px-4 py-12">
      <div className="w-full max-w-md">
        <div className="flex justify-center mb-8">
          <Image
            src="/superwork-logo-black.svg"
            alt="Superwork"
            width={180}
            height={36}
            priority
          />
        </div>

        <div className="rounded-2xl border border-gray-200 bg-white p-8 shadow-sm">
          <h1 className="text-2xl font-semibold text-gray-900 mb-2">Create an account</h1>
          <p className="text-sm text-gray-600 mb-6">Get started with Superwork today</p>

          {error && (
            <div className="mb-6 rounded-xl border border-red-200 bg-red-50 p-4 flex items-start gap-3">
              <AlertCircle className="h-5 w-5 text-red-600 flex-shrink-0 mt-0.5" />
              <p className="text-sm text-red-800">{error}</p>
            </div>
          )}

          {success && (
            <div className="mb-6 rounded-xl border border-green-200 bg-green-50 p-4 flex items-start gap-3">
              <CheckCircle className="h-5 w-5 text-green-600 flex-shrink-0 mt-0.5" />
              <p className="text-sm text-green-800">Account created successfully! Redirecting...</p>
            </div>
          )}

          <form onSubmit={handleSignup} className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label htmlFor="firstName" className="block text-sm font-medium text-gray-900 mb-2">
                  First name
                </label>
                <div className="relative">
                  <User className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-400" />
                  <input
                    id="firstName"
                    type="text"
                    value={firstName}
                    onChange={(e) => setFirstName(e.target.value)}
                    required
                    className="w-full rounded-xl border border-gray-200 bg-white py-3 pl-10 pr-4 text-sm focus:border-gray-400 focus:outline-none focus:ring-2 focus:ring-gray-200"
                    placeholder="John"
                  />
                </div>
              </div>

              <div>
                <label htmlFor="lastName" className="block text-sm font-medium text-gray-900 mb-2">
                  Last name
                </label>
                <input
                  id="lastName"
                  type="text"
                  value={lastName}
                  onChange={(e) => setLastName(e.target.value)}
                  required
                  className="w-full rounded-xl border border-gray-200 bg-white py-3 px-4 text-sm focus:border-gray-400 focus:outline-none focus:ring-2 focus:ring-gray-200"
                  placeholder="Doe"
                />
              </div>
            </div>

            <div className="absolute -left-[9999px] h-0 w-0 overflow-hidden" aria-hidden="true">
              <label htmlFor="website">Website</label>
              <input
                id="website"
                type="text"
                name="website"
                tabIndex={-1}
                autoComplete="off"
                value={honeypot}
                onChange={(e) => setHoneypot(e.target.value)}
              />
            </div>

            <div>
              <label htmlFor="email" className="block text-sm font-medium text-gray-900 mb-2">
                Work email
              </label>
              <div className="relative">
                <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-400" />
                <input
                  id="email"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                  className="w-full rounded-xl border border-gray-200 bg-white py-3 pl-10 pr-4 text-sm focus:border-gray-400 focus:outline-none focus:ring-2 focus:ring-gray-200"
                  placeholder="you@yourcompany.com"
                />
              </div>
              <p className="mt-2 text-xs text-gray-500">
                Use your company email. Personal addresses (Gmail, Outlook, iCloud, etc.) cannot be used to sign up.
              </p>
            </div>

            <div>
              <label htmlFor="password" className="block text-sm font-medium text-gray-900 mb-2">
                Password
              </label>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-400" />
                <input
                  id="password"
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  minLength={6}
                  className="w-full rounded-xl border border-gray-200 bg-white py-3 pl-10 pr-4 text-sm focus:border-gray-400 focus:outline-none focus:ring-2 focus:ring-gray-200"
                  placeholder="At least 6 characters"
                />
              </div>
              <p className="mt-2 text-xs text-gray-500">Must be at least 6 characters</p>
            </div>

            <button
              type="submit"
              disabled={loading || success}
              className="w-full rounded-xl bg-[#bfe937] px-6 py-3 text-sm font-medium text-gray-900 transition-colors hover:bg-[#acd829] disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loading ? 'Creating account...' : success ? 'Success!' : 'Create account'}
            </button>
          </form>

          <div className="mt-6 space-y-4">
            <div className="relative">
              <div className="absolute inset-0 flex items-center" aria-hidden>
                <span className="w-full border-t border-gray-200" />
              </div>
              <div className="relative flex justify-center text-xs uppercase tracking-wide">
                <span className="bg-white px-2 text-gray-500">or continue with</span>
              </div>
            </div>
            <GoogleAuthButton onError={setError} disabled={loading || success} />
          </div>

          <p className="mt-6 text-center text-sm text-gray-600">
            Already have an account?{' '}
            <Link href="/login" className="font-medium text-gray-900 hover:underline">
              Sign in
            </Link>
          </p>
          <p className="mt-3 text-center text-xs text-gray-500">
            By creating an account, you agree to our{' '}
            <Link href="/terms" className="underline hover:text-gray-700">
              Terms
            </Link>{' '}
            and{' '}
            <Link
              href="https://www.superwork.co/privacy-policy"
              target="_blank"
              rel="noopener noreferrer"
              className="underline hover:text-gray-700"
            >
              Privacy Policy
            </Link>
            .
          </p>
        </div>
      </div>
    </div>
  );
}
