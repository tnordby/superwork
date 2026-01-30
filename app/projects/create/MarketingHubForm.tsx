import { CheckCircle2, Loader2 } from 'lucide-react';
import Link from 'next/link';

interface MarketingFormData {
  hubspotTier: string;
  websiteHostedOnHubSpot: string;
  websitePlatform: string;
  blogAndLandingPages: string;
  domainManager: string;
  domainProvider: string;
  canMakeDnsChanges: string;
  adPlatforms: string[];
  linkedinUrl: string;
  otherSocialProfiles: string;
  connectPersonalLinkedin: string;
  emailTypes: string[];
  primaryEmailLanguage: string;
  secondaryLanguages: string;
  subscriptionComplexity: string;
  demoFormAction: string;
  importantMetrics: string;
  primarySuccessMetric: string;
  additionalNotes: string;
}

interface Props {
  marketingGoals: string;
  setMarketingGoals: (value: string) => void;
  marketingFormData: MarketingFormData;
  setMarketingFormData: (data: MarketingFormData) => void;
  onSubmit: (e: React.FormEvent) => void;
  loading: boolean;
  estimatedHours?: number;
}

export default function MarketingHubForm({
  marketingGoals,
  setMarketingGoals,
  marketingFormData,
  setMarketingFormData,
  onSubmit,
  loading,
  estimatedHours,
}: Props) {
  const updateField = (field: keyof MarketingFormData, value: any) => {
    setMarketingFormData({ ...marketingFormData, [field]: value });
  };

  const toggleArrayItem = (field: 'adPlatforms' | 'emailTypes', value: string) => {
    const currentArray = marketingFormData[field];
    if (currentArray.includes(value)) {
      updateField(field, currentArray.filter(item => item !== value));
    } else {
      updateField(field, [...currentArray, value]);
    }
  };

  return (
    <form onSubmit={onSubmit} className="space-y-8">
      {/* HubSpot Tier */}
      <div>
        <label className="block text-sm font-medium text-gray-900 mb-2">
          Which HubSpot Marketing tier are you on today (Professional or Enterprise)? *
        </label>
        <div className="space-y-2">
          {['Professional', 'Enterprise'].map((tier) => (
            <label key={tier} className="flex items-center gap-2">
              <input
                type="radio"
                name="hubspotTier"
                value={tier}
                checked={marketingFormData.hubspotTier === tier}
                onChange={(e) => updateField('hubspotTier', e.target.value)}
                className="w-4 h-4"
                required
              />
              <span className="text-sm">{tier}</span>
            </label>
          ))}
        </div>
      </div>

      {/* Marketing Goals */}
      <div>
        <label htmlFor="marketing_goals" className="block text-sm font-medium text-gray-900 mb-2">
          Marketing Goals & Conversion Paths *
        </label>
        <textarea
          id="marketing_goals"
          rows={4}
          required
          value={marketingGoals}
          onChange={(e) => setMarketingGoals(e.target.value)}
          className="w-full rounded-xl border border-gray-200 bg-white px-4 py-3 text-sm focus:border-gray-400 focus:outline-none focus:ring-2 focus:ring-gray-200"
          placeholder="Describe your marketing objectives and key conversion points..."
        />
      </div>

      {/* Website Section */}
      <div className="space-y-4">
        <h3 className="text-base font-semibold text-gray-900 border-b pb-2">Website</h3>

        <div>
          <label className="block text-sm font-medium text-gray-900 mb-2">
            Is your website hosted on HubSpot? *
          </label>
          <div className="flex gap-4">
            <label className="flex items-center gap-2">
              <input
                type="radio"
                name="websiteHostedOnHubSpot"
                value="Yes"
                checked={marketingFormData.websiteHostedOnHubSpot === 'Yes'}
                onChange={(e) => updateField('websiteHostedOnHubSpot', e.target.value)}
                className="w-4 h-4"
                required
              />
              <span className="text-sm">Yes</span>
            </label>
            <label className="flex items-center gap-2">
              <input
                type="radio"
                name="websiteHostedOnHubSpot"
                value="No"
                checked={marketingFormData.websiteHostedOnHubSpot === 'No'}
                onChange={(e) => updateField('websiteHostedOnHubSpot', e.target.value)}
                className="w-4 h-4"
                required
              />
              <span className="text-sm">No</span>
            </label>
          </div>
        </div>

        {marketingFormData.websiteHostedOnHubSpot === 'No' && (
          <div>
            <label htmlFor="websitePlatform" className="block text-sm font-medium text-gray-900 mb-2">
              Which platform is your website hosted on?
            </label>
            <input
              type="text"
              id="websitePlatform"
              value={marketingFormData.websitePlatform}
              onChange={(e) => updateField('websitePlatform', e.target.value)}
              placeholder="e.g. WordPress, Webflow, custom, Shopify"
              className="w-full rounded-xl border border-gray-200 bg-white px-4 py-3 text-sm focus:border-gray-400 focus:outline-none focus:ring-2 focus:ring-gray-200"
            />
          </div>
        )}

        <div>
          <label className="block text-sm font-medium text-gray-900 mb-2">
            Do you want to host your blog and landing pages on HubSpot? *
          </label>
          <div className="space-y-2">
            {['Yes, both blog and landing pages', 'Only landing pages', 'No, keep everything external', 'Not sure'].map((option) => (
              <label key={option} className="flex items-center gap-2">
                <input
                  type="radio"
                  name="blogAndLandingPages"
                  value={option}
                  checked={marketingFormData.blogAndLandingPages === option}
                  onChange={(e) => updateField('blogAndLandingPages', e.target.value)}
                  className="w-4 h-4"
                  required
                />
                <span className="text-sm">{option}</span>
              </label>
            ))}
          </div>
        </div>
      </div>

      {/* Domain Section */}
      <div className="space-y-4">
        <h3 className="text-base font-semibold text-gray-900 border-b pb-2">Domain</h3>

        <div>
          <label className="block text-sm font-medium text-gray-900 mb-2">
            Who manages your domain? *
          </label>
          <div className="space-y-2">
            {['Internal IT', 'External agency', 'Founder'].map((option) => (
              <label key={option} className="flex items-center gap-2">
                <input
                  type="radio"
                  name="domainManager"
                  value={option}
                  checked={marketingFormData.domainManager === option}
                  onChange={(e) => updateField('domainManager', e.target.value)}
                  className="w-4 h-4"
                  required
                />
                <span className="text-sm">{option}</span>
              </label>
            ))}
          </div>
        </div>

        <div>
          <label htmlFor="domainProvider" className="block text-sm font-medium text-gray-900 mb-2">
            Domain provider *
          </label>
          <input
            type="text"
            id="domainProvider"
            value={marketingFormData.domainProvider}
            onChange={(e) => updateField('domainProvider', e.target.value)}
            placeholder="e.g. Cloudflare, GoDaddy"
            className="w-full rounded-xl border border-gray-200 bg-white px-4 py-3 text-sm focus:border-gray-400 focus:outline-none focus:ring-2 focus:ring-gray-200"
            required
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-900 mb-2">
            Can we make domain (DNS) changes during onboarding? *
          </label>
          <div className="flex gap-4">
            <label className="flex items-center gap-2">
              <input
                type="radio"
                name="canMakeDnsChanges"
                value="Yes"
                checked={marketingFormData.canMakeDnsChanges === 'Yes'}
                onChange={(e) => updateField('canMakeDnsChanges', e.target.value)}
                className="w-4 h-4"
                required
              />
              <span className="text-sm">Yes</span>
            </label>
            <label className="flex items-center gap-2">
              <input
                type="radio"
                name="canMakeDnsChanges"
                value="No"
                checked={marketingFormData.canMakeDnsChanges === 'No'}
                onChange={(e) => updateField('canMakeDnsChanges', e.target.value)}
                className="w-4 h-4"
                required
              />
              <span className="text-sm">No</span>
            </label>
          </div>
        </div>
      </div>

      {/* Advertising Channels */}
      <div className="space-y-4">
        <h3 className="text-base font-semibold text-gray-900 border-b pb-2">Advertising Channels</h3>

        <div>
          <label className="block text-sm font-medium text-gray-900 mb-2">
            Which ad platforms should we connect?
          </label>
          <div className="space-y-2">
            {['Google Ads', 'LinkedIn Ads', 'Meta Ads', 'None yet'].map((platform) => (
              <label key={platform} className="flex items-center gap-2">
                <input
                  type="checkbox"
                  checked={marketingFormData.adPlatforms.includes(platform)}
                  onChange={() => toggleArrayItem('adPlatforms', platform)}
                  className="w-4 h-4 rounded"
                />
                <span className="text-sm">{platform}</span>
              </label>
            ))}
          </div>
        </div>
      </div>

      {/* Social Media */}
      <div className="space-y-4">
        <h3 className="text-base font-semibold text-gray-900 border-b pb-2">Social Media</h3>

        <div>
          <label htmlFor="linkedinUrl" className="block text-sm font-medium text-gray-900 mb-2">
            LinkedIn company page URL
          </label>
          <input
            type="url"
            id="linkedinUrl"
            value={marketingFormData.linkedinUrl}
            onChange={(e) => updateField('linkedinUrl', e.target.value)}
            placeholder="https://www.linkedin.com/company/..."
            className="w-full rounded-xl border border-gray-200 bg-white px-4 py-3 text-sm focus:border-gray-400 focus:outline-none focus:ring-2 focus:ring-gray-200"
          />
        </div>

        <div>
          <label htmlFor="otherSocialProfiles" className="block text-sm font-medium text-gray-900 mb-2">
            Other company profiles
          </label>
          <textarea
            id="otherSocialProfiles"
            rows={3}
            value={marketingFormData.otherSocialProfiles}
            onChange={(e) => updateField('otherSocialProfiles', e.target.value)}
            placeholder="Paste URLs: Facebook, Instagram, YouTube, X, etc."
            className="w-full rounded-xl border border-gray-200 bg-white px-4 py-3 text-sm focus:border-gray-400 focus:outline-none focus:ring-2 focus:ring-gray-200"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-900 mb-2">
            Should we connect personal LinkedIn profiles?
          </label>
          <div className="flex gap-4">
            <label className="flex items-center gap-2">
              <input
                type="radio"
                name="connectPersonalLinkedin"
                value="Yes"
                checked={marketingFormData.connectPersonalLinkedin === 'Yes'}
                onChange={(e) => updateField('connectPersonalLinkedin', e.target.value)}
                className="w-4 h-4"
              />
              <span className="text-sm">Yes</span>
            </label>
            <label className="flex items-center gap-2">
              <input
                type="radio"
                name="connectPersonalLinkedin"
                value="No"
                checked={marketingFormData.connectPersonalLinkedin === 'No'}
                onChange={(e) => updateField('connectPersonalLinkedin', e.target.value)}
                className="w-4 h-4"
              />
              <span className="text-sm">No</span>
            </label>
          </div>
        </div>
      </div>

      {/* Email Subscription Strategy */}
      <div className="space-y-4">
        <h3 className="text-base font-semibold text-gray-900 border-b pb-2">Email Subscription Strategy</h3>

        <div>
          <label className="block text-sm font-medium text-gray-900 mb-2">
            Email types you actively send
          </label>
          <div className="space-y-2">
            {['Newsletter', 'Product updates', 'Events / webinars', 'Customer communications'].map((type) => (
              <label key={type} className="flex items-center gap-2">
                <input
                  type="checkbox"
                  checked={marketingFormData.emailTypes.includes(type)}
                  onChange={() => toggleArrayItem('emailTypes', type)}
                  className="w-4 h-4 rounded"
                />
                <span className="text-sm">{type}</span>
              </label>
            ))}
            <label className="flex items-center gap-2">
              <input
                type="checkbox"
                checked={marketingFormData.emailTypes.includes('Other')}
                onChange={() => toggleArrayItem('emailTypes', 'Other')}
                className="w-4 h-4 rounded"
              />
              <span className="text-sm">Other</span>
            </label>
            {marketingFormData.emailTypes.includes('Other') && (
              <input
                type="text"
                placeholder="Please specify..."
                className="ml-6 w-full rounded-xl border border-gray-200 bg-white px-4 py-2 text-sm focus:border-gray-400 focus:outline-none focus:ring-2 focus:ring-gray-200"
                onChange={(e) => {
                  const otherValue = e.target.value;
                  const updatedTypes = marketingFormData.emailTypes.filter(t => t !== 'Other' && !t.startsWith('Other: '));
                  if (otherValue) {
                    updatedTypes.push(`Other: ${otherValue}`);
                  } else {
                    updatedTypes.push('Other');
                  }
                  updateField('emailTypes', updatedTypes);
                }}
              />
            )}
          </div>
        </div>

        <div>
          <label htmlFor="primaryEmailLanguage" className="block text-sm font-medium text-gray-900 mb-2">
            Primary email language
          </label>
          <input
            type="text"
            id="primaryEmailLanguage"
            value={marketingFormData.primaryEmailLanguage}
            onChange={(e) => updateField('primaryEmailLanguage', e.target.value)}
            placeholder="e.g. English"
            className="w-full rounded-xl border border-gray-200 bg-white px-4 py-3 text-sm focus:border-gray-400 focus:outline-none focus:ring-2 focus:ring-gray-200"
          />
        </div>

        <div>
          <label htmlFor="secondaryLanguages" className="block text-sm font-medium text-gray-900 mb-2">
            Secondary languages (if any)
          </label>
          <input
            type="text"
            id="secondaryLanguages"
            value={marketingFormData.secondaryLanguages}
            onChange={(e) => updateField('secondaryLanguages', e.target.value)}
            placeholder="e.g. Spanish, French"
            className="w-full rounded-xl border border-gray-200 bg-white px-4 py-3 text-sm focus:border-gray-400 focus:outline-none focus:ring-2 focus:ring-gray-200"
          />
        </div>

      </div>

      {/* Metrics & Reporting */}
      <div className="space-y-4">
        <h3 className="text-base font-semibold text-gray-900 border-b pb-2">Metrics & Reporting</h3>

        <div>
          <label htmlFor="importantMetrics" className="block text-sm font-medium text-gray-900 mb-2">
            Which metrics are most important for you to track? *
          </label>
          <textarea
            id="importantMetrics"
            rows={3}
            value={marketingFormData.importantMetrics}
            onChange={(e) => updateField('importantMetrics', e.target.value)}
            placeholder="e.g. leads, meetings, pipeline, revenue, CAC, conversion rates"
            className="w-full rounded-xl border border-gray-200 bg-white px-4 py-3 text-sm focus:border-gray-400 focus:outline-none focus:ring-2 focus:ring-gray-200"
            required
          />
        </div>

        <div>
          <label htmlFor="primarySuccessMetric" className="block text-sm font-medium text-gray-900 mb-2">
            Primary success metric *
          </label>
          <input
            type="text"
            id="primarySuccessMetric"
            value={marketingFormData.primarySuccessMetric}
            onChange={(e) => updateField('primarySuccessMetric', e.target.value)}
            placeholder="What ultimately defines success for you?"
            className="w-full rounded-xl border border-gray-200 bg-white px-4 py-3 text-sm focus:border-gray-400 focus:outline-none focus:ring-2 focus:ring-gray-200"
            required
          />
        </div>
      </div>

      {/* Additional Notes */}
      <div>
        <label htmlFor="additionalNotes" className="block text-sm font-medium text-gray-900 mb-2">
          Additional Notes
        </label>
        <textarea
          id="additionalNotes"
          rows={4}
          value={marketingFormData.additionalNotes}
          onChange={(e) => updateField('additionalNotes', e.target.value)}
          placeholder="Any other details you want to add?"
          className="w-full rounded-xl border border-gray-200 bg-white px-4 py-3 text-sm focus:border-gray-400 focus:outline-none focus:ring-2 focus:ring-gray-200"
        />
      </div>

      {/* What's Included Summary */}
      <div className="rounded-xl border border-gray-200 bg-gray-50 p-6">
        <h4 className="text-sm font-medium text-gray-900 mb-3">What We'll Deliver</h4>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
          <div className="text-sm text-gray-700 flex items-start gap-2">
            <CheckCircle2 className="h-4 w-4 text-green-600 mt-0.5 flex-shrink-0" />
            <span>Complete Marketing Hub configuration</span>
          </div>
          <div className="text-sm text-gray-700 flex items-start gap-2">
            <CheckCircle2 className="h-4 w-4 text-green-600 mt-0.5 flex-shrink-0" />
            <span>Privacy & consent banner setup</span>
          </div>
          <div className="text-sm text-gray-700 flex items-start gap-2">
            <CheckCircle2 className="h-4 w-4 text-green-600 mt-0.5 flex-shrink-0" />
            <span>Domain and email configuration</span>
          </div>
          <div className="text-sm text-gray-700 flex items-start gap-2">
            <CheckCircle2 className="h-4 w-4 text-green-600 mt-0.5 flex-shrink-0" />
            <span>Forms, CTAs, landing pages</span>
          </div>
          <div className="text-sm text-gray-700 flex items-start gap-2">
            <CheckCircle2 className="h-4 w-4 text-green-600 mt-0.5 flex-shrink-0" />
            <span>Marketing workflows & automation</span>
          </div>
          <div className="text-sm text-gray-700 flex items-start gap-2">
            <CheckCircle2 className="h-4 w-4 text-green-600 mt-0.5 flex-shrink-0" />
            <span>Dashboards and reporting</span>
          </div>
        </div>
      </div>

      {/* Submit Buttons */}
      <div className="flex gap-4 pt-4">
        <button
          type="submit"
          disabled={loading}
          className="flex-1 flex items-center justify-center gap-2 rounded-xl bg-[#bfe937] px-6 py-3 text-sm font-medium text-gray-900 transition-opacity hover:opacity-90 disabled:opacity-50"
        >
          {loading ? (
            <>
              <Loader2 className="h-4 w-4 animate-spin" />
              Creating Project...
            </>
          ) : (
            'Submit & Start Project'
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
}
