'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { ArrowLeft, Send, Loader2 } from 'lucide-react';
import { useAuth } from '@/components/AuthProvider';
import { isInternalStaff } from '@/lib/auth/platform-role';

export default function CustomBriefPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [workspaceTeams, setWorkspaceTeams] = useState<{ id: string; name: string }[]>([]);
  const [teamIdForProject, setTeamIdForProject] = useState('');
  const { platformRole } = useAuth();
  const [internalSelectedWorkspaceId, setInternalSelectedWorkspaceId] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    void fetch('/api/internal/selected-workspace', { credentials: 'include' })
      .then((res) => (res.ok ? res.json() : null))
      .then((data) => {
        if (cancelled || !data) return;
        const id =
          typeof data.workspace_id === 'string' && data.workspace_id.trim() ? data.workspace_id.trim() : null;
        setInternalSelectedWorkspaceId(id);
      })
      .catch(() => {});
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    if (platformRole === null) return;
    let cancelled = false;
    const internal = isInternalStaff(platformRole);

    const run = async () => {
      let url: string | null = null;
      if (internal) {
        if (!internalSelectedWorkspaceId) {
          if (!cancelled) setWorkspaceTeams([]);
          return;
        }
        url = `/api/internal/workspace-teams?workspace_id=${encodeURIComponent(internalSelectedWorkspaceId)}`;
      } else {
        url = '/api/account/workspace-teams';
      }
      try {
        const res = await fetch(url, { credentials: 'include' });
        const data = res.ok ? await res.json() : null;
        if (cancelled || !data?.teams || !Array.isArray(data.teams)) return;
        setWorkspaceTeams(
          data.teams.map((t: { id: string; name: string }) => ({ id: t.id, name: t.name }))
        );
      } catch {
        if (!cancelled) setWorkspaceTeams([]);
      }
    };

    void run();
    return () => {
      cancelled = true;
    };
  }, [platformRole, internalSelectedWorkspaceId]);
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
      const briefDescription = `
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
      `.trim();

      // Create project first so quote client info is sourced from project ownership.
      const projectPayload: Record<string, unknown> = {
        name: formData.projectName,
        description: briefDescription,
        category: 'Custom Services',
        service_type: 'Custom Brief',
      };
      if (teamIdForProject.trim()) {
        projectPayload.team_id = teamIdForProject.trim();
      }

      const projectResponse = await fetch('/api/projects', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(projectPayload),
      });
      const projectData = await projectResponse.json();
      if (!projectResponse.ok || !projectData.project?.id) {
        throw new Error(projectData.error || 'Failed to create project from brief');
      }

      // Create a quote from the custom brief and link it to the project.
      const response = await fetch('/api/quotes', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: formData.projectName,
          description: briefDescription,
          project_id: projectData.project.id,
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
    } catch (error: unknown) {
      console.error('Error submitting brief:', error);
      alert(
        `Failed to submit brief: ${error instanceof Error ? error.message : 'Unknown error'}`
      );
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
            Tell us about your unique needs and we&apos;ll create a tailored solution for you
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

          {(workspaceTeams.length > 0 ||
            (platformRole !== null &&
              isInternalStaff(platformRole) &&
              internalSelectedWorkspaceId)) ? (
            <div className="rounded-lg border border-gray-200 bg-gray-50 p-4">
              <label htmlFor="brief-team" className="block text-sm font-medium text-gray-900 mb-1">
                Team (optional)
              </label>
              <p className="text-xs text-gray-600 mb-2">
                Attribute this brief&apos;s project to a team for budget tracking on Account → Teams.
              </p>
              <select
                id="brief-team"
                value={teamIdForProject}
                onChange={(e) => setTeamIdForProject(e.target.value)}
                className="w-full max-w-md rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm"
              >
                <option value="">No team</option>
                {workspaceTeams.map((t) => (
                  <option key={t.id} value={t.id}>
                    {t.name}
                  </option>
                ))}
              </select>
            </div>
          ) : null}

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
              <span>We&apos;ll schedule a discovery call to dive deeper into your requirements</span>
            </li>
            <li className="flex items-start gap-2">
              <span className="text-[#bfe937] font-bold">3.</span>
              <span>You&apos;ll receive a custom proposal with timeline and pricing</span>
            </li>
            <li className="flex items-start gap-2">
              <span className="text-[#bfe937] font-bold">4.</span>
              <span>Once approved, we&apos;ll kick off your project with a dedicated team</span>
            </li>
          </ul>
        </div>
      </div>
    </div>
  );
}
