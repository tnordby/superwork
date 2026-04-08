export const dynamic = 'force-static';

export default function TermsPage() {
  return (
    <main className="mx-auto max-w-3xl px-6 py-12">
      <h1 className="text-3xl font-semibold text-gray-900">Terms of Service</h1>
      <p className="mt-2 text-sm text-gray-600">Effective date: March 2026</p>

      <section className="mt-8 space-y-6 text-sm leading-6 text-gray-700">
        <div>
          <h2 className="text-base font-semibold text-gray-900">1. Service Overview</h2>
          <p className="mt-2">
            Superwork provides a client portal for consulting delivery, project communication, assets,
            and billing visibility. By using the service, you agree to these terms.
          </p>
        </div>

        <div>
          <h2 className="text-base font-semibold text-gray-900">2. Accounts and Access</h2>
          <p className="mt-2">
            You are responsible for account credentials and activities under your account. You must
            provide accurate information and notify us if you suspect unauthorized access.
          </p>
        </div>

        <div>
          <h2 className="text-base font-semibold text-gray-900">3. Customer Data</h2>
          <p className="mt-2">
            You retain ownership of your data. You grant Superwork permission to process and store data
            only to provide the service. We apply tenant access controls, but you are responsible for
            managing user access in your organization.
          </p>
        </div>

        <div>
          <h2 className="text-base font-semibold text-gray-900">4. Billing and Payments</h2>
          <p className="mt-2">
            Paid plans renew according to your subscription terms. Fees are non-refundable unless required
            by law or explicitly stated in a separate agreement.
          </p>
        </div>

        <div>
          <h2 className="text-base font-semibold text-gray-900">5. Acceptable Use</h2>
          <p className="mt-2">
            You may not use Superwork for unlawful activity, security abuse, or to access data outside your
            authorized tenant or role.
          </p>
        </div>

        <div>
          <h2 className="text-base font-semibold text-gray-900">6. Termination</h2>
          <p className="mt-2">
            Either party may terminate service according to applicable agreements. We may suspend access for
            abuse, legal requirements, or security risk.
          </p>
        </div>

        <div>
          <h2 className="text-base font-semibold text-gray-900">7. Disclaimer and Liability</h2>
          <p className="mt-2">
            Superwork is provided &quot;as is&quot; during beta. To the maximum extent allowed by law, we
            disclaim implied warranties and limit liability for indirect or consequential damages.
          </p>
        </div>

        <div>
          <h2 className="text-base font-semibold text-gray-900">8. Contact</h2>
          <p className="mt-2">
            Questions about these terms: support@superwork.co
          </p>
        </div>
      </section>
    </main>
  );
}
