export const dynamic = 'force-static';

export default function PrivacyPage() {
  return (
    <main className="mx-auto max-w-3xl px-6 py-12">
      <h1 className="text-3xl font-semibold text-gray-900">Privacy Policy</h1>
      <p className="mt-2 text-sm text-gray-600">Effective date: March 2026</p>

      <section className="mt-8 space-y-6 text-sm leading-6 text-gray-700">
        <div>
          <h2 className="text-base font-semibold text-gray-900">1. Data We Collect</h2>
          <p className="mt-2">
            We collect account information, usage events, project content, messages, files, and billing
            metadata required to operate Superwork.
          </p>
        </div>

        <div>
          <h2 className="text-base font-semibold text-gray-900">2. How We Use Data</h2>
          <p className="mt-2">
            We use data to deliver core functionality, secure the platform, provide support, and improve
            reliability. We do not sell customer data.
          </p>
        </div>

        <div>
          <h2 className="text-base font-semibold text-gray-900">3. Data Sharing</h2>
          <p className="mt-2">
            We share data only with subprocessors needed for service operation (for example infrastructure,
            authentication, and payments), and only under appropriate contractual protections.
          </p>
        </div>

        <div>
          <h2 className="text-base font-semibold text-gray-900">4. Security</h2>
          <p className="mt-2">
            We use role-based access controls, tenant separation, and transport security measures. No system
            can guarantee absolute security, so we continuously monitor and improve protections.
          </p>
        </div>

        <div>
          <h2 className="text-base font-semibold text-gray-900">5. Retention</h2>
          <p className="mt-2">
            We retain data while accounts remain active and as required for legal, security, or contractual
            obligations.
          </p>
        </div>

        <div>
          <h2 className="text-base font-semibold text-gray-900">6. Your Rights</h2>
          <p className="mt-2">
            Depending on your jurisdiction, you may request access, correction, deletion, or export of your
            personal data. Contact us to exercise these rights.
          </p>
        </div>

        <div>
          <h2 className="text-base font-semibold text-gray-900">7. Contact</h2>
          <p className="mt-2">
            Privacy requests: privacy@superwork.co
          </p>
        </div>
      </section>
    </main>
  );
}
