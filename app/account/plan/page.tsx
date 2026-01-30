export default function PlanPage() {
  return (
    <div className="p-8">
      <h1 className="text-3xl font-semibold text-gray-900 mb-8">Plan</h1>

      {/* Empty state - No active subscription */}
      <div className="rounded-2xl border border-gray-200 bg-gray-50 p-12 text-center">
        <h2 className="text-2xl font-semibold text-gray-900 mb-3">No active subscription</h2>
        <p className="text-gray-600 max-w-2xl mx-auto">
          There isn't an active subscription, if you want to re-activate your always-on creative service get in touch.
        </p>
      </div>
    </div>
  );
}
