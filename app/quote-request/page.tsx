'use client';

import { useState, useEffect, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { ArrowLeft, Send, Loader2 } from 'lucide-react';

function QuoteRequestForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [loading, setLoading] = useState(false);

  const category = searchParams.get('category') || '';
  const service = searchParams.get('service') || '';

  const [formData, setFormData] = useState({
    title: service,
    description: '',
    category: category,
    service_type: service,
    estimated_price: '',
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      const response = await fetch('/api/quotes', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: formData.title,
          description: formData.description,
          category: formData.category,
          service_type: formData.service_type,
          estimated_price: formData.estimated_price ? parseFloat(formData.estimated_price) : undefined,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to submit quote request');
      }

      // Redirect to quotes page with success message
      router.push('/quotes?quoteRequested=true');
    } catch (error: any) {
      console.error('Error submitting quote request:', error);
      alert(`Failed to submit request: ${error.message}`);
    } finally {
      setLoading(false);
    }
  };

  const handleChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>
  ) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value,
    });
  };

  return (
    <div className="p-8">
      <div className="max-w-2xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <Link
            href="/projects?tab=browse"
            className="inline-flex items-center gap-2 text-sm text-gray-600 hover:text-gray-900 mb-4"
          >
            <ArrowLeft className="h-4 w-4" />
            Back to Services
          </Link>
          <h1 className="text-3xl font-semibold text-gray-900 mb-2">Request Quote</h1>
          <p className="text-gray-600">
            Tell us about your project and we'll provide a detailed quote
          </p>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Service */}
          <div className="rounded-xl border border-gray-200 bg-gray-50 p-6">
            <div className="grid grid-cols-2 gap-4 text-sm">
              <div>
                <span className="font-medium text-gray-700">Category:</span>
                <p className="text-gray-900 mt-1">{formData.category}</p>
              </div>
              <div>
                <span className="font-medium text-gray-700">Service:</span>
                <p className="text-gray-900 mt-1">{formData.service_type}</p>
              </div>
            </div>
          </div>

          {/* Project Title */}
          <div>
            <label htmlFor="title" className="block text-sm font-medium text-gray-900 mb-2">
              Project Title <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              id="title"
              name="title"
              required
              value={formData.title}
              onChange={handleChange}
              className="w-full rounded-lg border border-gray-300 px-4 py-3 text-sm focus:border-gray-900 focus:outline-none focus:ring-1 focus:ring-gray-900"
              placeholder="e.g., Q1 2024 CRM Implementation"
            />
          </div>

          {/* Description */}
          <div>
            <label htmlFor="description" className="block text-sm font-medium text-gray-900 mb-2">
              Project Description <span className="text-red-500">*</span>
            </label>
            <textarea
              id="description"
              name="description"
              required
              value={formData.description}
              onChange={handleChange}
              rows={6}
              className="w-full rounded-lg border border-gray-300 px-4 py-3 text-sm focus:border-gray-900 focus:outline-none focus:ring-1 focus:ring-gray-900"
              placeholder="Describe your project requirements, goals, timeline, and any specific needs..."
            />
            <p className="mt-1 text-xs text-gray-500">
              The more details you provide, the more accurate our quote will be
            </p>
          </div>

          {/* Estimated Budget */}
          <div>
            <label htmlFor="estimated_price" className="block text-sm font-medium text-gray-900 mb-2">
              Estimated Budget (Optional)
            </label>
            <div className="relative">
              <span className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-500">$</span>
              <input
                type="number"
                id="estimated_price"
                name="estimated_price"
                value={formData.estimated_price}
                onChange={handleChange}
                min="0"
                step="100"
                className="w-full rounded-lg border border-gray-300 pl-8 pr-4 py-3 text-sm focus:border-gray-900 focus:outline-none focus:ring-1 focus:ring-gray-900"
                placeholder="10000"
              />
            </div>
            <p className="mt-1 text-xs text-gray-500">
              This helps us provide a more tailored quote
            </p>
          </div>

          {/* Submit Button */}
          <div className="flex items-center justify-end gap-4 pt-6 border-t border-gray-200">
            <Link
              href="/projects?tab=browse"
              className="rounded-lg px-6 py-3 text-sm font-medium text-gray-700 hover:text-gray-900"
            >
              Cancel
            </Link>
            <button
              type="submit"
              disabled={loading}
              className="flex items-center gap-2 rounded-lg bg-[#bfe937] px-6 py-3 text-sm font-medium text-gray-900 transition-opacity hover:opacity-90 disabled:opacity-50"
            >
              {loading ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Submitting...
                </>
              ) : (
                <>
                  <Send className="h-4 w-4" />
                  Submit Quote Request
                </>
              )}
            </button>
          </div>
        </form>

        {/* What happens next */}
        <div className="mt-8 rounded-xl border border-gray-200 bg-gray-50 p-6">
          <h3 className="text-sm font-semibold text-gray-900 mb-3">What happens next?</h3>
          <ol className="text-sm text-gray-600 space-y-2">
            <li className="flex items-start gap-2">
              <span className="text-[#bfe937] font-bold">1.</span>
              <span>Our team will review your request within 24 hours</span>
            </li>
            <li className="flex items-start gap-2">
              <span className="text-[#bfe937] font-bold">2.</span>
              <span>We'll prepare a detailed quote with pricing and timeline</span>
            </li>
            <li className="flex items-start gap-2">
              <span className="text-[#bfe937] font-bold">3.</span>
              <span>You'll receive an email when your quote is ready</span>
            </li>
            <li className="flex items-start gap-2">
              <span className="text-[#bfe937] font-bold">4.</span>
              <span>Review and approve the quote to start your project</span>
            </li>
          </ol>
        </div>
      </div>
    </div>
  );
}

export default function QuoteRequestPage() {
  return (
    <Suspense fallback={
      <div className="p-8">
        <div className="max-w-2xl mx-auto">
          <div className="animate-pulse space-y-4">
            <div className="h-8 bg-gray-200 rounded w-1/4"></div>
            <div className="h-4 bg-gray-200 rounded w-1/2"></div>
          </div>
        </div>
      </div>
    }>
      <QuoteRequestForm />
    </Suspense>
  );
}
