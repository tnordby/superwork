'use client';

import { useState, useEffect, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { ArrowLeft, Loader2, CheckCircle2 } from 'lucide-react';
import MarketingHubForm from './MarketingHubForm';
import DynamicIntakeForm from './DynamicIntakeForm';

interface ServiceTemplate {
  id: string;
  name: string;
  category: string;
  customer_description: string;
  estimated_hours: number | null;
}

function CreateProjectForm() {
  const router = useRouter();
  const searchParams = useSearchParams();

  const [formData, setFormData] = useState({
    name: '',
    description: '',
    category: '',
    service_type: '',
  });

  // HubSpot Marketing Hub specific form data
  const [marketingFormData, setMarketingFormData] = useState({
    hubspotTier: '',
    websiteHostedOnHubSpot: '',
    websitePlatform: '',
    blogAndLandingPages: '',
    domainManager: '',
    domainProvider: '',
    canMakeDnsChanges: '',
    adPlatforms: [] as string[],
    linkedinUrl: '',
    otherSocialProfiles: '',
    connectPersonalLinkedin: '',
    emailTypes: [] as string[],
    primaryEmailLanguage: '',
    secondaryLanguages: '',
    subscriptionComplexity: '',
    demoFormAction: '',
    importantMetrics: '',
    primarySuccessMetric: '',
    additionalNotes: '',
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [serviceTemplate, setServiceTemplate] = useState<ServiceTemplate | null>(null);
  const [templateLoading, setTemplateLoading] = useState(false);
  const [intakeResponses, setIntakeResponses] = useState<Record<string, any> | null>(null);
  const [hasIntakeForm, setHasIntakeForm] = useState(false);

  // Fetch service template if templateId is provided
  useEffect(() => {
    const templateId = searchParams.get('templateId');

    if (templateId) {
      console.log('Fetching template with ID:', templateId);
      setTemplateLoading(true);
      fetch(`/api/services/${templateId}`)
        .then(res => res.json())
        .then(data => {
          console.log('Template data received:', data);
          if (data.template) {
            setServiceTemplate(data.template);
            console.log('Service template set:', data.template.name);
            setFormData(prev => ({
              ...prev,
              category: data.template.category,
              service_type: data.template.name,
            }));

            // Check if this service has an intake form
            console.log('About to fetch intake form for template:', templateId);
            fetch(`/api/services/${templateId}/intake-form`)
              .then(res => {
                console.log('Intake form response status:', res.status);
                return res.json();
              })
              .then(intakeData => {
                console.log('Intake form data received:', intakeData);
                if (intakeData.fields && intakeData.fields.length > 0) {
                  console.log('✅ Setting hasIntakeForm to true, fields:', intakeData.fields.length);
                  setHasIntakeForm(true);
                } else {
                  console.log('❌ No intake form fields found');
                }
              })
              .catch(err => {
                console.error('❌ Error checking intake form:', err);
                console.error('Error details:', err.message);
              });
          } else {
            console.error('No template in response:', data);
          }
        })
        .catch(err => console.error('Error fetching template:', err))
        .finally(() => setTemplateLoading(false));
    } else {
      console.log('No templateId in URL params');
    }
  }, [searchParams]);

  // Pre-fill from URL params (for non-template services)
  useEffect(() => {
    const category = searchParams.get('category');
    const service = searchParams.get('service');
    const templateId = searchParams.get('templateId');

    // Only pre-fill if there's no template
    if (category && !templateId) {
      setFormData(prev => ({ ...prev, category, service_type: service || '' }));
    }
  }, [searchParams]);

  const handleIntakeFormSubmit = async (responses: Record<string, any>) => {
    setIntakeResponses(responses);
    setLoading(true);
    setError('');

    try {
      const templateId = searchParams.get('templateId');

      const payload: any = {
        name: serviceTemplate?.name || formData.name || 'Untitled Project',
        description: formData.description,
        category: serviceTemplate?.category || formData.category,
        service_type: serviceTemplate?.name || formData.service_type,
      };

      // If we have a template, include the template ID
      if (templateId) {
        payload.service_template_id = templateId;
      }

      const response = await fetch('/api/projects', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to create project');
      }

      // Save intake form responses
      if (responses && templateId) {
        try {
          await fetch(`/api/projects/${data.project.id}/intake-response`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              serviceTemplateId: templateId,
              responses: responses,
            }),
          });
        } catch (err) {
          console.error('Error saving intake responses:', err);
          // Don't block project creation if intake save fails
        }
      }

      // Redirect to the new project
      router.push(`/projects/${data.project.id}`);
    } catch (err: any) {
      setError(err.message);
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      const templateId = searchParams.get('templateId');

      const payload: any = { ...formData };

      // If we have a template, include the template ID
      if (templateId) {
        payload.service_template_id = templateId;
      }

      // For HubSpot Marketing Hub, format the description with form data
      if (serviceTemplate?.name === 'HubSpot Marketing Hub Onboarding') {
        payload.description = formatMarketingHubDescription(formData.description, marketingFormData);
      }

      const response = await fetch('/api/projects', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to create project');
      }

      // Save intake form responses if we have them
      if (intakeResponses && templateId) {
        try {
          await fetch(`/api/projects/${data.project.id}/intake-response`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              serviceTemplateId: templateId,
              responses: intakeResponses,
            }),
          });
        } catch (err) {
          console.error('Error saving intake responses:', err);
          // Don't block project creation if intake save fails
        }
      }

      // Redirect to the new project
      router.push(`/projects/${data.project.id}`);
    } catch (err: any) {
      setError(err.message);
      setLoading(false);
    }
  };

  // Format marketing hub form data into structured description
  const formatMarketingHubDescription = (goals: string, data: typeof marketingFormData) => {
    const standardDescription = serviceTemplate?.customer_description || '';

    return `${standardDescription}

# Intake Form

## HubSpot Tier
${data.hubspotTier || 'Not specified'}

## Marketing Goals
${goals}

## Website
- Hosted on HubSpot: ${data.websiteHostedOnHubSpot || 'Not specified'}
${data.websitePlatform ? `- Platform: ${data.websitePlatform}` : ''}
- Blog/Landing Pages: ${data.blogAndLandingPages || 'Not specified'}

## Domain
- Manager: ${data.domainManager || 'Not specified'}
- Provider: ${data.domainProvider || 'Not specified'}
- DNS Changes Allowed: ${data.canMakeDnsChanges || 'Not specified'}

## Advertising Channels
${data.adPlatforms.length > 0 ? data.adPlatforms.map(p => `- ${p}`).join('\n') : '- None specified'}

## Social Media
${data.linkedinUrl ? `- LinkedIn: ${data.linkedinUrl}` : ''}
${data.otherSocialProfiles ? `- Other: ${data.otherSocialProfiles}` : ''}
- Connect Personal LinkedIn: ${data.connectPersonalLinkedin || 'Not specified'}

## Email Strategy
${data.emailTypes.length > 0 ? `- Types: ${data.emailTypes.join(', ')}` : ''}
- Primary Language: ${data.primaryEmailLanguage || 'Not specified'}
${data.secondaryLanguages ? `- Secondary Languages: ${data.secondaryLanguages}` : ''}

## Metrics & Reporting
- Important Metrics: ${data.importantMetrics || 'Not specified'}
- Primary Success Metric: ${data.primarySuccessMetric || 'Not specified'}

${data.additionalNotes ? `## Additional Notes\n${data.additionalNotes}` : ''}`;
  };

  const categories = [
    'HubSpot Services',
    'Revenue Operations',
    'Technical Services',
    'AI & Data Services',
  ];

  // Auto-set form data when service template loads
  useEffect(() => {
    if (serviceTemplate && serviceTemplate.name === 'HubSpot Marketing Hub Onboarding') {
      setFormData(prev => ({
        ...prev,
        name: serviceTemplate.name,
        category: serviceTemplate.category,
        service_type: serviceTemplate.name,
      }));
    }
  }, [serviceTemplate]);

  // Service-specific form for HubSpot Marketing Hub Onboarding
  const renderMarketingHubForm = () => {
    return (
      <div className="space-y-6">
        {/* Brief Questions */}
        <div className="space-y-4">
          <h3 className="text-lg font-semibold text-gray-900">Project Brief</h3>
          <p className="text-sm text-gray-600">
            Please answer the following questions to help us configure your Marketing Hub properly.
          </p>
        </div>

        {/* Marketing Hub Form Component */}
        <MarketingHubForm
          marketingGoals={formData.description}
          setMarketingGoals={(value) => setFormData({ ...formData, description: value })}
          marketingFormData={marketingFormData}
          setMarketingFormData={setMarketingFormData}
          onSubmit={handleSubmit}
          loading={loading}
          estimatedHours={serviceTemplate?.estimated_hours || 80}
        />
      </div>
    );
  };

  // Generic form for non-template services
  const renderGenericForm = () => (
    <form onSubmit={handleSubmit} className="space-y-6">
      <div>
        <label htmlFor="name" className="block text-sm font-medium text-gray-900 mb-2">
          Project Name *
        </label>
        <input
          type="text"
          id="name"
          required
          value={formData.name}
          onChange={(e) => setFormData({ ...formData, name: e.target.value })}
          className="w-full rounded-xl border border-gray-200 bg-white px-4 py-3 text-sm focus:border-gray-400 focus:outline-none focus:ring-2 focus:ring-gray-200"
          placeholder="e.g., HubSpot CRM Implementation"
        />
      </div>

      <div>
        <label htmlFor="category" className="block text-sm font-medium text-gray-900 mb-2">
          Category *
        </label>
        <select
          id="category"
          required
          value={formData.category}
          onChange={(e) => setFormData({ ...formData, category: e.target.value })}
          className="w-full rounded-xl border border-gray-200 bg-white px-4 py-3 text-sm focus:border-gray-400 focus:outline-none focus:ring-2 focus:ring-gray-200"
        >
          <option value="">Select a category</option>
          {categories.map((cat) => (
            <option key={cat} value={cat}>
              {cat}
            </option>
          ))}
        </select>
      </div>

      <div>
        <label htmlFor="service_type" className="block text-sm font-medium text-gray-900 mb-2">
          Service Type *
        </label>
        <input
          type="text"
          id="service_type"
          required
          value={formData.service_type}
          onChange={(e) => setFormData({ ...formData, service_type: e.target.value })}
          className="w-full rounded-xl border border-gray-200 bg-white px-4 py-3 text-sm focus:border-gray-400 focus:outline-none focus:ring-2 focus:ring-gray-200"
          placeholder="e.g., CRM implementation"
        />
      </div>

      <div>
        <label htmlFor="description" className="block text-sm font-medium text-gray-900 mb-2">
          Description (Optional)
        </label>
        <textarea
          id="description"
          rows={4}
          value={formData.description}
          onChange={(e) => setFormData({ ...formData, description: e.target.value })}
          className="w-full rounded-xl border border-gray-200 bg-white px-4 py-3 text-sm focus:border-gray-400 focus:outline-none focus:ring-2 focus:ring-gray-200"
          placeholder="Describe what you need help with..."
        />
      </div>

      <div className="flex gap-4 pt-4">
        <button
          type="submit"
          disabled={loading}
          className="flex-1 flex items-center justify-center gap-2 rounded-xl bg-[#bfe937] px-6 py-3 text-sm font-medium text-gray-900 transition-opacity hover:opacity-90 disabled:opacity-50"
        >
          {loading ? (
            <>
              <Loader2 className="h-4 w-4 animate-spin" />
              Creating...
            </>
          ) : (
            'Create Project'
          )}
        </button>
        <Link
          href="/projects"
          className="flex-1 flex items-center justify-center rounded-xl border border-gray-300 px-6 py-3 text-sm font-medium text-gray-700 transition-colors hover:bg-gray-50"
        >
          Cancel
        </Link>
      </div>
    </form>
  );

  if (templateLoading) {
    return (
      <div className="p-8 max-w-3xl mx-auto">
        <div className="flex items-center justify-center py-12">
          <Loader2 className="h-8 w-8 animate-spin text-gray-400" />
        </div>
      </div>
    );
  }

  return (
    <div className="p-8 max-w-3xl mx-auto">
      <Link
        href="/projects"
        className="inline-flex items-center gap-2 text-sm text-gray-600 hover:text-gray-900 mb-6"
      >
        <ArrowLeft className="h-4 w-4" />
        Back to Projects
      </Link>

      <div className="rounded-2xl border border-gray-200 bg-white p-8">
        <h1 className="text-2xl font-semibold text-gray-900 mb-2">
          {serviceTemplate ? serviceTemplate.name : 'Create New Project'}
        </h1>
        <p className="text-sm text-gray-600 mb-8">
          {serviceTemplate
            ? 'Complete this brief to get started with your project'
            : 'Start a new project and we will help you get it done'}
        </p>

        {error && (
          <div className="mb-6 rounded-xl border border-red-200 bg-red-50 p-4">
            <p className="text-sm text-red-800">{error}</p>
          </div>
        )}

        {(() => {
          console.log('🔍 Rendering form. serviceTemplate:', serviceTemplate);
          console.log('🔍 serviceTemplate name:', serviceTemplate?.name);
          console.log('🔍 Has intake form:', hasIntakeForm);

          const isMarketingHub = serviceTemplate?.name === 'HubSpot Marketing Hub Onboarding';
          console.log('🔍 Is Marketing Hub:', isMarketingHub);

          // Use dynamic intake form if available (and not Marketing Hub which has custom form)
          if (hasIntakeForm && !isMarketingHub && serviceTemplate) {
            console.log('✅ Rendering DynamicIntakeForm');
            return (
              <DynamicIntakeForm
                serviceTemplateId={serviceTemplate.id}
                onSubmit={handleIntakeFormSubmit}
                loading={loading}
              />
            );
          }

          console.log('⚠️ Rendering fallback form:', isMarketingHub ? 'Marketing Hub' : 'Generic');
          return isMarketingHub ? renderMarketingHubForm() : renderGenericForm();
        })()}
      </div>
    </div>
  );
}

export default function CreateProjectPage() {
  return (
    <Suspense fallback={<div className="p-8">Loading...</div>}>
      <CreateProjectForm />
    </Suspense>
  );
}
