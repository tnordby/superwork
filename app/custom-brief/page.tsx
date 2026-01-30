'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { ArrowLeft, Send, Loader2 } from 'lucide-react';

export default function CustomBriefPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    projectName: '',
    companyName: '',
    industryOrSector: '',
    projectGoals: '',
    currentChallenges: '',
    desiredOutcome: '',
    timeline: '',
    budget: '',
    stakeholders: '',
    technicalRequirements: '',
    additionalContext: '',
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      // Create a quote from the custom brief
      const response = await fetch('/api/quotes', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: formData.projectName,
          description: `
**Company:** ${formData.companyName}
**Industry:** ${formData.industryOrSector || 'N/A'}

**Project Goals:**
${formData.projectGoals}

**Current Challenges:**
${formData.currentChallenges}

**Desired Outcome:**
${formData.desiredOutcome}

**Timeline:** ${formData.timeline || 'Not specified'}
**Budget:** ${formData.budget || 'Not specified'}

**Stakeholders:**
${formData.stakeholders || 'Not specified'}

**Technical Requirements:**
${formData.technicalRequirements || 'Not specified'}

**Additional Context:**
${formData.additionalContext || 'Not specified'}
          `.trim(),
          category: 'Custom Services',
          service_type: 'Custom Brief',
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to submit brief');
      }

      // Redirect to quotes page with success message
      router.push('/quotes?briefSubmitted=true');
    } catch (error: any) {
      console.error('Error submitting brief:', error);
      alert(`Failed to submit brief: ${error.message}`);
    } finally {
      setLoading(false);
    }
  };

  const handleChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>
  ) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value,
    });
  };

  return (
    <div className="p-8">
      <div className="max-w-3xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <Link
            href="/projects"
            className="inline-flex items-center gap-2 text-sm text-gray-600 hover:text-gray-900 mb-4"
          >
            <ArrowLeft className="h-4 w-4" />
            Back to Projects
          </Link>
          <h1 className="text-3xl font-semibold text-gray-900 mb-2">Submit Custom Brief</h1>
          <p className="text-gray-600">
            Tell us about your unique needs and we'll create a tailored solution for you
          </p>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Project Name */}
          <div>
            <label htmlFor="projectName" className="block text-sm font-medium text-gray-900 mb-2">
              Project Name <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              id="projectName"
              name="projectName"
              required
              value={formData.projectName}
              onChange={handleChange}
              className="w-full rounded-lg border border-gray-300 px-4 py-3 text-sm focus:border-gray-900 focus:outline-none focus:ring-1 focus:ring-gray-900"
              placeholder="e.g., Advanced HubSpot Automation System"
            />
          </div>

          {/* Company Name */}
          <div>
            <label htmlFor="companyName" className="block text-sm font-medium text-gray-900 mb-2">
              Company Name <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              id="companyName"
              name="companyName"
              required
              value={formData.companyName}
              onChange={handleChange}
              className="w-full rounded-lg border border-gray-300 px-4 py-3 text-sm focus:border-gray-900 focus:outline-none focus:ring-1 focus:ring-gray-900"
              placeholder="Your company name"
            />
          </div>

          {/* Industry or Sector */}
          <div>
            <label htmlFor="industryOrSector" className="block text-sm font-medium text-gray-900 mb-2">
              Industry or Sector
            </label>
            <input
              type="text"
              id="industryOrSector"
              name="industryOrSector"
              value={formData.industryOrSector}
              onChange={handleChange}
              className="w-full rounded-lg border border-gray-300 px-4 py-3 text-sm focus:border-gray-900 focus:outline-none focus:ring-1 focus:ring-gray-900"
              placeholder="e.g., SaaS, E-commerce, Financial Services"
            />
          </div>

          {/* Project Goals */}
          <div>
            <label htmlFor="projectGoals" className="block text-sm font-medium text-gray-900 mb-2">
              What are your main project goals? <span className="text-red-500">*</span>
            </label>
            <textarea
              id="projectGoals"
              name="projectGoals"
              required
              value={formData.projectGoals}
              onChange={handleChange}
              rows={4}
              className="w-full rounded-lg border border-gray-300 px-4 py-3 text-sm focus:border-gray-900 focus:outline-none focus:ring-1 focus:ring-gray-900"
              placeholder="Describe what you want to achieve with this project..."
            />
            <p className="mt-1 text-xs text-gray-500">
              Be as specific as possible about your objectives and success criteria
            </p>
          </div>

          {/* Current Challenges */}
          <div>
            <label htmlFor="currentChallenges" className="block text-sm font-medium text-gray-900 mb-2">
              What challenges are you currently facing? <span className="text-red-500">*</span>
            </label>
            <textarea
              id="currentChallenges"
              name="currentChallenges"
              required
              value={formData.currentChallenges}
              onChange={handleChange}
              rows={4}
              className="w-full rounded-lg border border-gray-300 px-4 py-3 text-sm focus:border-gray-900 focus:outline-none focus:ring-1 focus:ring-gray-900"
              placeholder="What problems are you trying to solve?"
            />
          </div>

          {/* Desired Outcome */}
          <div>
            <label htmlFor="desiredOutcome" className="block text-sm font-medium text-gray-900 mb-2">
              What does success look like for this project? <span className="text-red-500">*</span>
            </label>
            <textarea
              id="desiredOutcome"
              name="desiredOutcome"
              required
              value={formData.desiredOutcome}
              onChange={handleChange}
              rows={4}
              className="w-full rounded-lg border border-gray-300 px-4 py-3 text-sm focus:border-gray-900 focus:outline-none focus:ring-1 focus:ring-gray-900"
              placeholder="Describe the ideal end state and measurable outcomes..."
            />
          </div>

          {/* Timeline */}
          <div>
            <label htmlFor="timeline" className="block text-sm font-medium text-gray-900 mb-2">
              What is your expected timeline?
            </label>
            <select
              id="timeline"
              name="timeline"
              value={formData.timeline}
              onChange={handleChange}
              className="w-full rounded-lg border border-gray-300 px-4 py-3 text-sm focus:border-gray-900 focus:outline-none focus:ring-1 focus:ring-gray-900"
            >
              <option value="">Select a timeline</option>
              <option value="urgent">Urgent (1-2 weeks)</option>
              <option value="short">Short-term (2-4 weeks)</option>
              <option value="medium">Medium-term (1-3 months)</option>
              <option value="long">Long-term (3+ months)</option>
              <option value="flexible">Flexible</option>
            </select>
          </div>

          {/* Budget */}
          <div>
            <label htmlFor="budget" className="block text-sm font-medium text-gray-900 mb-2">
              What is your budget range?
            </label>
            <select
              id="budget"
              name="budget"
              value={formData.budget}
              onChange={handleChange}
              className="w-full rounded-lg border border-gray-300 px-4 py-3 text-sm focus:border-gray-900 focus:outline-none focus:ring-1 focus:ring-gray-900"
            >
              <option value="">Select a budget range</option>
              <option value="under-5k">Under $5,000</option>
              <option value="5k-10k">$5,000 - $10,000</option>
              <option value="10k-25k">$10,000 - $25,000</option>
              <option value="25k-50k">$25,000 - $50,000</option>
              <option value="over-50k">Over $50,000</option>
              <option value="flexible">Flexible / To be discussed</option>
            </select>
          </div>

          {/* Stakeholders */}
          <div>
            <label htmlFor="stakeholders" className="block text-sm font-medium text-gray-900 mb-2">
              Who are the key stakeholders involved?
            </label>
            <textarea
              id="stakeholders"
              name="stakeholders"
              value={formData.stakeholders}
              onChange={handleChange}
              rows={3}
              className="w-full rounded-lg border border-gray-300 px-4 py-3 text-sm focus:border-gray-900 focus:outline-none focus:ring-1 focus:ring-gray-900"
              placeholder="e.g., Sales team, Marketing director, IT department..."
            />
          </div>

          {/* Technical Requirements */}
          <div>
            <label htmlFor="technicalRequirements" className="block text-sm font-medium text-gray-900 mb-2">
              Any specific technical requirements or integrations?
            </label>
            <textarea
              id="technicalRequirements"
              name="technicalRequirements"
              value={formData.technicalRequirements}
              onChange={handleChange}
              rows={4}
              className="w-full rounded-lg border border-gray-300 px-4 py-3 text-sm focus:border-gray-900 focus:outline-none focus:ring-1 focus:ring-gray-900"
              placeholder="List any systems, tools, or platforms that need to be integrated..."
            />
          </div>

          {/* Additional Context */}
          <div>
            <label htmlFor="additionalContext" className="block text-sm font-medium text-gray-900 mb-2">
              Any additional context or requirements?
            </label>
            <textarea
              id="additionalContext"
              name="additionalContext"
              value={formData.additionalContext}
              onChange={handleChange}
              rows={4}
              className="w-full rounded-lg border border-gray-300 px-4 py-3 text-sm focus:border-gray-900 focus:outline-none focus:ring-1 focus:ring-gray-900"
              placeholder="Share any other relevant information that would help us understand your needs..."
            />
          </div>

          {/* Submit Button */}
          <div className="flex items-center justify-end gap-4 pt-6 border-t border-gray-200">
            <Link
              href="/projects"
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
                  Submit Brief
                </>
              )}
            </button>
          </div>
        </form>

        {/* Help Text */}
        <div className="mt-8 rounded-xl border border-gray-200 bg-gray-50 p-6">
          <h3 className="text-sm font-semibold text-gray-900 mb-2">What happens next?</h3>
          <ul className="text-sm text-gray-600 space-y-2">
            <li className="flex items-start gap-2">
              <span className="text-[#bfe937] font-bold">1.</span>
              <span>Our team will review your custom brief within 24 hours</span>
            </li>
            <li className="flex items-start gap-2">
              <span className="text-[#bfe937] font-bold">2.</span>
              <span>We'll schedule a discovery call to dive deeper into your requirements</span>
            </li>
            <li className="flex items-start gap-2">
              <span className="text-[#bfe937] font-bold">3.</span>
              <span>You'll receive a custom proposal with timeline and pricing</span>
            </li>
            <li className="flex items-start gap-2">
              <span className="text-[#bfe937] font-bold">4.</span>
              <span>Once approved, we'll kick off your project with a dedicated team</span>
            </li>
          </ul>
        </div>
      </div>
    </div>
  );
}
