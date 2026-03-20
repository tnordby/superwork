'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useParams, useRouter } from 'next/navigation';
import { computeValuePricing, roundUpToNearestThousand } from '@/lib/quotes/value-pricing';

type Quote = {
  id: string;
  title: string;
  description: string | null;
  status: string;
  currency: string | null;
  final_price: number | null;
  adjusted_hours: number | null;
  estimated_hours_low: number | null;
  estimated_hours_high: number | null;
  internal_hourly_rate: number | null;
  pass_through_costs: number | null;
  desired_margin_percent: number | null;
  certainty_buffer_percent: number | null;
  certainty_premium: number | null;
  value_adjustment: number | null;
  value_anchor_price: number | null;
  value_confidence_score: number | null;
  pricing_rationale: string | null;
  desired_future_state: string | null;
  success_metrics: string | null;
  estimated_value: number | null;
  baseline_hours?: number | null;
  client_first_name: string | null;
  client_last_name: string | null;
  client_email: string | null;
  client_company_name: string | null;
  milestones?: {
    id?: string;
    title: string;
    description: string | null;
    estimated_hours: number | null;
    order_index: number;
  }[];
};

function getStatusLabel(status: string): string {
  if (status === 'approved') return 'Accepted';
  if (status === 'rejected') return 'Rejected';
  return 'Pending';
}

export default function TeamQuoteReviewPage() {
  const params = useParams<{ id: string }>();
  const router = useRouter();
  const quoteId = params.id;

  const [quote, setQuote] = useState<Quote | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [adjustedHours, setAdjustedHours] = useState('');
  const [estimatedHoursLow, setEstimatedHoursLow] = useState('');
  const [estimatedHoursHigh, setEstimatedHoursHigh] = useState('');
  const [internalHourlyRate, setInternalHourlyRate] = useState('');
  const [passThroughCosts, setPassThroughCosts] = useState('');
  const [desiredMarginPercent, setDesiredMarginPercent] = useState('35');
  const [certaintyBufferPercent, setCertaintyBufferPercent] = useState('20');
  const [valueAdjustment, setValueAdjustment] = useState('');
  const [valueAnchorPrice, setValueAnchorPrice] = useState('');
  const [valueConfidenceScore, setValueConfidenceScore] = useState('50');
  const [pricingRationale, setPricingRationale] = useState('');
  const [desiredFutureState, setDesiredFutureState] = useState('');
  const [successMetrics, setSuccessMetrics] = useState('');
  const [estimatedValue, setEstimatedValue] = useState('');
  const [finalPrice, setFinalPrice] = useState('');
  const [finalPriceTouched, setFinalPriceTouched] = useState(false);
  const [clientFirstName, setClientFirstName] = useState('');
  const [clientLastName, setClientLastName] = useState('');
  const [clientEmail, setClientEmail] = useState('');
  const [clientCompanyName, setClientCompanyName] = useState('');
  const [milestones, setMilestones] = useState<
    { title: string; description: string; estimated_hours: string }[]
  >([]);

  const adjustedHoursNum = Number(adjustedHours || 0);
  const pricingPreview = computeValuePricing({
    adjustedHours: adjustedHoursNum,
    estimatedHoursLow: Number(estimatedHoursLow || 0),
    estimatedHoursHigh: Number(estimatedHoursHigh || 0),
    internalHourlyRate: Number(internalHourlyRate || 0),
    passThroughCosts: Number(passThroughCosts || 0),
    desiredMarginPercent: Number(desiredMarginPercent || 0),
    certaintyBufferPercent: Number(certaintyBufferPercent || 0),
    valueAdjustment: Number(valueAdjustment || 0),
    valueAnchorPrice: Number(valueAnchorPrice || 0),
    valueConfidenceScore: Number(valueConfidenceScore || 0),
  });
  const suggestedRoundedPrice = roundUpToNearestThousand(pricingPreview.finalPrice);

  async function loadQuote() {
    setLoading(true);
    setError(null);
    const response = await fetch(`/api/quotes/${quoteId}`, { credentials: 'include' });
    const data = await response.json();
    if (!response.ok) {
      setError(data.error || 'Could not load quote');
      setLoading(false);
      return;
    }
    const q = data.quote as Quote;
    setQuote(q);
    setAdjustedHours(
      q.adjusted_hours != null
        ? String(q.adjusted_hours)
        : q.baseline_hours != null
          ? String(q.baseline_hours)
          : ''
    );
    setEstimatedHoursLow(q.estimated_hours_low != null ? String(q.estimated_hours_low) : '');
    setEstimatedHoursHigh(q.estimated_hours_high != null ? String(q.estimated_hours_high) : '');
    setInternalHourlyRate(q.internal_hourly_rate != null ? String(q.internal_hourly_rate) : '');
    setPassThroughCosts(q.pass_through_costs != null ? String(q.pass_through_costs) : '');
    setDesiredMarginPercent(
      q.desired_margin_percent != null ? String(q.desired_margin_percent) : '35'
    );
    setCertaintyBufferPercent(
      q.certainty_buffer_percent != null ? String(q.certainty_buffer_percent) : '20'
    );
    setValueAdjustment(q.value_adjustment != null ? String(q.value_adjustment) : '');
    setValueAnchorPrice(q.value_anchor_price != null ? String(q.value_anchor_price) : '');
    setValueConfidenceScore(
      q.value_confidence_score != null ? String(q.value_confidence_score) : '50'
    );
    setPricingRationale(q.pricing_rationale || '');
    setDesiredFutureState(q.desired_future_state || '');
    setSuccessMetrics(q.success_metrics || '');
    setEstimatedValue(q.estimated_value != null ? String(q.estimated_value) : '');
    setFinalPrice(q.final_price != null ? String(q.final_price) : '');
    setFinalPriceTouched(false);
    setClientFirstName(q.client_first_name || '');
    setClientLastName(q.client_last_name || '');
    setClientEmail(q.client_email || '');
    setClientCompanyName(q.client_company_name || '');
    setMilestones(
      Array.isArray(q.milestones) && q.milestones.length > 0
        ? q.milestones.map((m) => ({
            title: m.title || '',
            description: m.description || '',
            estimated_hours:
              m.estimated_hours !== null && m.estimated_hours !== undefined
                ? String(m.estimated_hours)
                : '',
          }))
        : []
    );
    setLoading(false);
  }

  useEffect(() => {
    loadQuote();
  }, [quoteId]);

  useEffect(() => {
    if (finalPriceTouched) return;
    if (quote?.final_price != null) return;
    setFinalPrice(String(suggestedRoundedPrice));
  }, [finalPriceTouched, quote?.final_price, suggestedRoundedPrice]);

  useEffect(() => {
    if (!adjustedHours && milestones.length > 0) {
      const sum = milestones.reduce((acc, m) => acc + Number(m.estimated_hours || 0), 0);
      if (sum > 0) setAdjustedHours(String(sum));
    }
  }, [milestones, adjustedHours]);

  async function saveAndSendToCustomer() {
    setSaving(true);
    const response = await fetch(`/api/quotes/${quoteId}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include',
      body: JSON.stringify({
        value_pricing: {
          adjusted_hours: Number(adjustedHours || 0),
          estimated_hours_low: Number(estimatedHoursLow || 0),
          estimated_hours_high: Number(estimatedHoursHigh || 0),
          internal_hourly_rate: Number(internalHourlyRate || 0),
          pass_through_costs: Number(passThroughCosts || 0),
          desired_margin_percent: Number(desiredMarginPercent || 0),
          certainty_buffer_percent: Number(certaintyBufferPercent || 0),
          value_adjustment: Number(valueAdjustment || 0),
          value_anchor_price: Number(valueAnchorPrice || 0),
          value_confidence_score: Number(valueConfidenceScore || 0),
          desired_future_state: desiredFutureState,
          success_metrics: successMetrics,
          estimated_value: estimatedValue ? Number(estimatedValue) : null,
        },
        client_info: {
          first_name: clientFirstName,
          last_name: clientLastName,
          email: clientEmail,
          company_name: clientCompanyName,
        },
        milestones: milestones.map((m) => ({
          title: m.title,
          description: m.description || null,
          estimated_hours: m.estimated_hours ? Number(m.estimated_hours) : null,
        })),
        pricing_rationale: pricingRationale,
        final_price: finalPrice ? Number(finalPrice) : undefined,
        status: 'pending_customer_approval',
      }),
    });
    const data = await response.json();
    if (!response.ok) {
      alert(data.error || 'Could not save quote');
      setSaving(false);
      return;
    }
    await loadQuote();
    setSaving(false);
    alert('Quote sent to customer with a single final price.');
  }

  if (loading) return <div className="p-8">Loading...</div>;
  if (error || !quote) return <div className="p-8 text-red-600">{error || 'Quote not found'}</div>;

  return (
    <div className="p-8 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-gray-900">{quote.title}</h1>
          <p className="text-sm text-gray-600">Status: {getStatusLabel(quote.status)}</p>
        </div>
        <div className="flex items-center gap-3">
          <Link href="/team/quotes" className="text-sm text-gray-600 hover:text-gray-900">
            ← Back to quotes
          </Link>
          <button
            onClick={() => router.refresh()}
            className="rounded-lg border border-gray-200 px-3 py-2 text-sm"
          >
            Refresh
          </button>
        </div>
      </div>

      <div className="rounded-xl border border-gray-200 bg-white p-6 space-y-4">
        <h2 className="text-lg font-semibold text-gray-900">Value Pricing Inputs (Internal)</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 rounded-lg border border-gray-200 bg-gray-50 p-4">
          <label className="text-sm text-gray-700">
            Client first name
            <input
              value={clientFirstName}
              onChange={(e) => setClientFirstName(e.target.value)}
              className="mt-1 w-full rounded-lg border border-gray-300 bg-white px-3 py-2"
            />
          </label>
          <label className="text-sm text-gray-700">
            Client last name
            <input
              value={clientLastName}
              onChange={(e) => setClientLastName(e.target.value)}
              className="mt-1 w-full rounded-lg border border-gray-300 bg-white px-3 py-2"
            />
          </label>
          <label className="text-sm text-gray-700">
            Client email
            <input
              type="email"
              value={clientEmail}
              onChange={(e) => setClientEmail(e.target.value)}
              className="mt-1 w-full rounded-lg border border-gray-300 bg-white px-3 py-2"
            />
          </label>
          <label className="text-sm text-gray-700">
            Company name
            <input
              value={clientCompanyName}
              onChange={(e) => setClientCompanyName(e.target.value)}
              className="mt-1 w-full rounded-lg border border-gray-300 bg-white px-3 py-2"
            />
          </label>
        </div>
        {quote.baseline_hours != null && (
          <div className="rounded-lg border border-blue-100 bg-blue-50 px-3 py-2 text-sm text-blue-800">
            Baseline hours pulled from service template: <span className="font-semibold">{quote.baseline_hours}</span>
          </div>
        )}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
          <div className="rounded-lg border border-gray-200 bg-gray-50 p-3">
            <p className="text-xs uppercase tracking-wide text-gray-500">Cost floor</p>
            <p className="mt-1 text-xl font-semibold text-gray-900">
              {pricingPreview.floor.toFixed(2)} {quote.currency || ''}
            </p>
          </div>
          <div className="rounded-lg border border-gray-200 bg-gray-50 p-3">
            <p className="text-xs uppercase tracking-wide text-gray-500">Risk-adjusted floor</p>
            <p className="mt-1 text-xl font-semibold text-gray-900">
              {pricingPreview.riskAdjustedFloor.toFixed(2)} {quote.currency || ''}
            </p>
          </div>
          <div className="rounded-lg border border-[#bfe937] bg-[#f7ffe3] p-3">
            <p className="text-xs uppercase tracking-wide text-gray-500">Suggested fixed price</p>
            <p className="mt-1 text-xl font-semibold text-gray-900">
              {suggestedRoundedPrice} {quote.currency || ''}
            </p>
          </div>
        </div>
        <div className="rounded-lg border border-gray-200 bg-gray-50 p-3">
          <p className="text-xs uppercase tracking-wide text-gray-500">Current pricing rationale</p>
          <p className="mt-1 text-sm text-gray-700 whitespace-pre-wrap">
            {pricingRationale.trim() || 'No rationale added yet.'}
          </p>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <label className="text-sm text-gray-700">
            Adjusted Hours
            <input
              value={adjustedHours}
              onChange={(e) => setAdjustedHours(e.target.value)}
              type="number"
              min="0"
              step="0.5"
              className="mt-1 w-full rounded-lg border border-gray-300 px-3 py-2"
            />
          </label>
          <label className="text-sm text-gray-700">
            Estimated Hours (low)
            <input
              value={estimatedHoursLow}
              onChange={(e) => setEstimatedHoursLow(e.target.value)}
              type="number"
              min="0"
              step="0.5"
              className="mt-1 w-full rounded-lg border border-gray-300 px-3 py-2"
            />
          </label>
          <label className="text-sm text-gray-700">
            Estimated Hours (high)
            <input
              value={estimatedHoursHigh}
              onChange={(e) => setEstimatedHoursHigh(e.target.value)}
              type="number"
              min="0"
              step="0.5"
              className="mt-1 w-full rounded-lg border border-gray-300 px-3 py-2"
            />
          </label>
          <label className="text-sm text-gray-700">
            Internal Hourly Rate
            <input
              value={internalHourlyRate}
              onChange={(e) => setInternalHourlyRate(e.target.value)}
              type="number"
              min="0"
              step="1"
              className="mt-1 w-full rounded-lg border border-gray-300 px-3 py-2"
            />
          </label>
          <label className="text-sm text-gray-700">
            Pass-through Costs
            <input
              value={passThroughCosts}
              onChange={(e) => setPassThroughCosts(e.target.value)}
              type="number"
              min="0"
              step="1"
              className="mt-1 w-full rounded-lg border border-gray-300 px-3 py-2"
            />
            <p className="mt-1 text-xs text-gray-500">
              Pass-through costs are expenses we pay on the customer&apos;s behalf to complete the
              project. These are billed at cost with no markup. Common examples include software
              license fees, partners, third-party software subscriptions, freelance specialists,
              and paid media spend. Pass-through costs are always itemized separately from our
              service fees so you can see exactly what you&apos;re paying for.
            </p>
          </label>
          <label className="text-sm text-gray-700">
            Desired Margin (%)
            <input
              value={desiredMarginPercent}
              onChange={(e) => setDesiredMarginPercent(e.target.value)}
              type="number"
              min="0"
              max="90"
              step="1"
              className="mt-1 w-full rounded-lg border border-gray-300 px-3 py-2"
            />
          </label>
          <label className="text-sm text-gray-700">
            Certainty Buffer (%)
            <input
              value={certaintyBufferPercent}
              onChange={(e) => setCertaintyBufferPercent(e.target.value)}
              type="number"
              min="0"
              max="100"
              step="1"
              className="mt-1 w-full rounded-lg border border-gray-300 px-3 py-2"
            />
          </label>
          <label className="text-sm text-gray-700">
            Strategic Uplift ($)
            <input
              value={valueAdjustment}
              onChange={(e) => setValueAdjustment(e.target.value)}
              type="number"
              min="0"
              step="1"
              className="mt-1 w-full rounded-lg border border-gray-300 px-3 py-2"
            />
            <p className="mt-1 text-xs text-gray-500">
              Manual price adjustment for strategic factors not captured by delivery math.
            </p>
          </label>
          <label className="text-sm text-gray-700 md:col-span-2">
            Target Value Price ($)
            <input
              value={valueAnchorPrice}
              onChange={(e) => setValueAnchorPrice(e.target.value)}
              type="number"
              min="0"
              step="1"
              className="mt-1 w-full rounded-lg border border-gray-300 px-3 py-2"
            />
            <p className="mt-1 text-xs text-gray-500">
              Your estimate of what this outcome is worth to the client in their business context.
            </p>
          </label>
          <label className="text-sm text-gray-700 md:col-span-2">
            Confidence in Target Price (%)
            <input
              value={valueConfidenceScore}
              onChange={(e) => setValueConfidenceScore(e.target.value)}
              type="number"
              min="0"
              max="100"
              step="1"
              className="mt-1 w-full rounded-lg border border-gray-300 px-3 py-2"
            />
            <p className="mt-1 text-xs text-gray-500">
              0 means ignore the target value price. 100 means fully apply it in the recommendation.
            </p>
          </label>
          <label className="text-sm text-gray-700 md:col-span-2">
            Pricing rationale (internal only)
            <textarea
              value={pricingRationale}
              onChange={(e) => setPricingRationale(e.target.value)}
              rows={3}
              placeholder="Why does the final price differ from the suggested number?"
              className="mt-1 w-full rounded-lg border border-gray-300 px-3 py-2"
            />
          </label>
          <label className="text-sm text-gray-700 md:col-span-2">
            Desired Future State
            <textarea
              value={desiredFutureState}
              onChange={(e) => setDesiredFutureState(e.target.value)}
              className="mt-1 w-full rounded-lg border border-gray-300 px-3 py-2"
              rows={2}
            />
          </label>
          <label className="text-sm text-gray-700 md:col-span-2">
            Success Metrics
            <textarea
              value={successMetrics}
              onChange={(e) => setSuccessMetrics(e.target.value)}
              className="mt-1 w-full rounded-lg border border-gray-300 px-3 py-2"
              rows={2}
            />
          </label>
          <label className="text-sm text-gray-700">
            Estimated Value Created
            <input
              value={estimatedValue}
              onChange={(e) => setEstimatedValue(e.target.value)}
              type="number"
              min="0"
              step="1"
              className="mt-1 w-full rounded-lg border border-gray-300 px-3 py-2"
            />
          </label>
          <label className="text-sm text-gray-700">
            Final Price (Customer sees this)
            <input
              value={finalPrice}
              onChange={(e) => {
                setFinalPriceTouched(true);
                setFinalPrice(e.target.value);
              }}
              type="number"
              min="0"
              step="1"
              className="mt-1 w-full rounded-lg border border-gray-300 px-3 py-2"
              placeholder="Set value-based final price"
            />
            <button
              type="button"
              onClick={() => {
                setFinalPriceTouched(true);
                setFinalPrice(String(suggestedRoundedPrice));
              }}
              className="mt-2 rounded-md border border-gray-200 px-2.5 py-1 text-xs font-medium text-gray-700 hover:bg-gray-50"
            >
              Use suggested price
            </button>
          </label>
        </div>
        <div className="rounded-lg border border-gray-200 p-4 space-y-3">
          <div className="flex items-center justify-between">
            <p className="text-sm font-semibold text-gray-900">Milestones</p>
            <button
              type="button"
              onClick={() =>
                setMilestones((prev) => [
                  ...prev,
                  { title: '', description: '', estimated_hours: '' },
                ])
              }
              className="rounded-md border border-gray-200 px-2.5 py-1 text-xs font-medium text-gray-700 hover:bg-gray-50"
            >
              Add milestone
            </button>
          </div>
          {milestones.length === 0 ? (
            <p className="text-sm text-gray-500">No milestones yet.</p>
          ) : (
            <div className="space-y-3">
              {milestones.map((m, idx) => (
                <div key={idx} className="grid grid-cols-1 md:grid-cols-12 gap-2 items-start">
                  <input
                    value={m.title}
                    onChange={(e) =>
                      setMilestones((prev) =>
                        prev.map((row, i) =>
                          i === idx ? { ...row, title: e.target.value } : row
                        )
                      )
                    }
                    placeholder="Milestone title"
                    className="md:col-span-4 rounded-lg border border-gray-300 px-3 py-2 text-sm"
                  />
                  <input
                    value={m.description}
                    onChange={(e) =>
                      setMilestones((prev) =>
                        prev.map((row, i) =>
                          i === idx ? { ...row, description: e.target.value } : row
                        )
                      )
                    }
                    placeholder="Description"
                    className="md:col-span-5 rounded-lg border border-gray-300 px-3 py-2 text-sm"
                  />
                  <input
                    value={m.estimated_hours}
                    onChange={(e) =>
                      setMilestones((prev) =>
                        prev.map((row, i) =>
                          i === idx ? { ...row, estimated_hours: e.target.value } : row
                        )
                      )
                    }
                    type="number"
                    min="0"
                    step="0.5"
                    placeholder="Hours"
                    className="md:col-span-2 rounded-lg border border-gray-300 px-3 py-2 text-sm"
                  />
                  <button
                    type="button"
                    onClick={() =>
                      setMilestones((prev) => prev.filter((_, i) => i !== idx))
                    }
                    className="md:col-span-1 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-xs font-medium text-red-700"
                  >
                    Remove
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>
        <div className="rounded-xl border border-[#bfe937] bg-[#f7ffe3] p-4">
          <p className="text-xs uppercase tracking-wide text-gray-500">Client-facing price</p>
          <p className="mt-1 text-2xl font-semibold text-gray-900">
            {finalPrice !== '' ? `${finalPrice} ${quote.currency || ''}` : 'Not set'}
          </p>
          <p className="mt-1 text-xs text-gray-600">
            Final client prices are rounded up to the nearest 1000.
          </p>
        </div>
        <div className="flex justify-end">
          <button
            onClick={saveAndSendToCustomer}
            disabled={saving}
            className="rounded-lg bg-[#bfe937] px-4 py-2 text-sm font-medium text-gray-900 disabled:opacity-50"
          >
            {saving ? 'Saving…' : 'Calculate final price + Send to customer'}
          </button>
        </div>
      </div>

    </div>
  );
}

