'use client';

import { useState } from 'react';

export default function TestEmailPage() {
  const [email, setEmail] = useState('');
  const [template, setTemplate] = useState('welcome');
  const [sending, setSending] = useState(false);
  const [result, setResult] = useState<any>(null);

  const sendTestEmail = async () => {
    setSending(true);
    setResult(null);

    try {
      const response = await fetch(`/api/test-email?template=${template}&to=${email}`);
      const data = await response.json();
      setResult(data);
    } catch (error) {
      setResult({
        error: 'Failed to send email',
        details: error instanceof Error ? error.message : 'Unknown error',
      });
    } finally {
      setSending(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 p-8">
      <div className="max-w-2xl mx-auto">
        <div className="bg-white rounded-xl border border-gray-200 p-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">Email Testing</h1>
          <p className="text-gray-600 mb-8">
            Test your Resend email templates before going live
          </p>

          <div className="space-y-6">
            {/* Email Input */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Send to email
              </label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="your-email@example.com"
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              />
            </div>

            {/* Template Select */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Email Template
              </label>
              <select
                value={template}
                onChange={(e) => setTemplate(e.target.value)}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              >
                <option value="welcome">AUTH-01: Welcome Client</option>
                <option value="password-reset">AUTH-03: Password Reset</option>
                <option value="subscription-activated">BILL-01: Subscription Activated</option>
                <option value="payment-failed">BILL-03: Payment Failed</option>
              </select>
            </div>

            {/* Send Button */}
            <button
              onClick={sendTestEmail}
              disabled={!email || sending}
              className="w-full bg-gray-900 text-white px-6 py-3 rounded-lg font-medium hover:bg-gray-800 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              {sending ? 'Sending...' : 'Send Test Email'}
            </button>

            {/* Result */}
            {result && (
              <div
                className={`p-4 rounded-lg ${
                  result.error
                    ? 'bg-red-50 border border-red-200'
                    : 'bg-green-50 border border-green-200'
                }`}
              >
                <pre className="text-sm overflow-auto">
                  {JSON.stringify(result, null, 2)}
                </pre>
              </div>
            )}
          </div>

          {/* Instructions */}
          <div className="mt-8 pt-8 border-t border-gray-200">
            <h2 className="text-lg font-semibold text-gray-900 mb-4">Testing Checklist</h2>
            <ul className="space-y-2 text-sm text-gray-600">
              <li className="flex items-start gap-2">
                <span className="text-green-600">✓</span>
                <span>Check email arrives in inbox (not spam)</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-green-600">✓</span>
                <span>Verify brand colors (#bfe937 green, #1c1e31 midnight)</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-green-600">✓</span>
                <span>Test all CTA buttons work</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-green-600">✓</span>
                <span>Check mobile rendering on your phone</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-green-600">✓</span>
                <span>Verify logo and images load</span>
              </li>
            </ul>
          </div>

          {/* Dev Server Link */}
          <div className="mt-6 p-4 bg-blue-50 rounded-lg border border-blue-200">
            <h3 className="text-sm font-semibold text-blue-900 mb-2">
              Preview Templates Locally
            </h3>
            <p className="text-sm text-blue-700 mb-2">
              Run the React Email dev server to preview and edit templates:
            </p>
            <code className="block bg-blue-100 text-blue-900 px-3 py-2 rounded text-sm">
              npx email dev
            </code>
          </div>
        </div>
      </div>
    </div>
  );
}
