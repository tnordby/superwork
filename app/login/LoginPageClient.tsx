'use client';

import { useLayoutEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import Image from 'next/image';
import { createClient } from '@/lib/supabase/client';
import { GoogleAuthButton } from '@/components/auth/GoogleAuthButton';
import { Mail, Lock, AlertCircle } from 'lucide-react';

type LoginPageClientProps = {
  initialOAuthErrorMessage?: string;
};

export function LoginPageClient({ initialOAuthErrorMessage }: LoginPageClientProps) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState(initialOAuthErrorMessage ?? '');
  const [loading, setLoading] = useState(false);
  const router = useRouter();
  const supabase = createClient();

  useLayoutEffect(() => {
    if (!initialOAuthErrorMessage || typeof window === 'undefined') return;
    const u = new URL(window.location.href);
    if (u.searchParams.get('error') !== 'oauth') return;
    u.searchParams.delete('error');
    const q = u.searchParams.toString();
    window.history.replaceState({}, '', q ? `${u.pathname}?${q}` : u.pathname);
  }, [initialOAuthErrorMessage]);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      const normalizedEmail = email.trim().toLowerCase();
      const { data, error } = await supabase.auth.signInWithPassword({
        email: normalizedEmail,
        password,
      });

      if (error) {
        const lowerMessage = error.message.toLowerCase();
        if (lowerMessage.includes('invalid login credentials')) {
          setError('Email or password is incorrect. Please try again or reset your password.');
        } else if (lowerMessage.includes('email not confirmed')) {
          setError('Please confirm your email before signing in.');
        } else {
          setError(error.message);
        }
        setLoading(false);
        return;
      }

      if (data.user) {
        router.push('/');
        router.refresh();
      }
    } catch (err) {
      console.error('Unexpected login error:', err);
      if (err instanceof TypeError && err.message.includes('fetch')) {
        setError('Unable to connect to authentication service. Please check your internet connection and try again.');
      } else {
        setError('An unexpected error occurred. Please try again.');
      }
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 px-4">
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
          <h1 className="text-center text-2xl font-semibold text-gray-900 mb-2">Welcome back</h1>
          <p className="text-center text-sm text-gray-600 mb-6">Sign in to your Superwork account</p>

          {error && (
            <div className="mb-6 rounded-xl border border-red-200 bg-red-50 p-4 flex items-start gap-3">
              <AlertCircle className="h-5 w-5 text-red-600 flex-shrink-0 mt-0.5" />
              <p className="text-sm text-red-800">{error}</p>
            </div>
          )}

          <form onSubmit={handleLogin} className="space-y-4">
            <div>
              <label htmlFor="email" className="block text-sm font-medium text-gray-900 mb-2">
                Email
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
                  placeholder="you@example.com"
                />
              </div>
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
                  className="w-full rounded-xl border border-gray-200 bg-white py-3 pl-10 pr-4 text-sm focus:border-gray-400 focus:outline-none focus:ring-2 focus:ring-gray-200"
                  placeholder="Enter your password"
                />
              </div>
            </div>

            <div className="flex items-center justify-end">
              <Link
                href="/forgot-password"
                className="text-sm text-gray-600 hover:text-gray-900 transition-colors"
              >
                Forgot password?
              </Link>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full rounded-xl bg-[#bfe937] px-6 py-3 text-sm font-medium text-gray-900 transition-colors hover:bg-[#acd829] disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loading ? 'Signing in...' : 'Sign in'}
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
            <GoogleAuthButton nextPath="/" onError={setError} disabled={loading} />
          </div>

          <p className="mt-6 text-center text-sm text-gray-600">
            Don&apos;t have an account?{' '}
            <Link href="/signup" className="font-medium text-gray-900 hover:underline">
              Sign up
            </Link>
          </p>
          <p className="mt-3 text-center text-xs text-gray-500">
            By continuing, you agree to our{' '}
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
