'use client';

import { useMemo, useState } from 'react';

type OnboardingProgress = {
  hubspotAccessCompleted: boolean;
  documentCompleted: boolean;
  surveyCompleted: boolean;
  isHidden: boolean;
};

type OnboardingChecklistCardProps = {
  initialProgress: OnboardingProgress;
  links: {
    hubspotAccessUrl: string;
    documentUrl: string;
    surveyUrl: string;
    videoUrl: string;
  };
};

type ChecklistItem = {
  id: 'hubspot' | 'document' | 'survey';
  title: string;
  description: string;
  href: string;
  completed: boolean;
  highlighted?: boolean;
};

export default function OnboardingChecklistCard({ initialProgress, links }: OnboardingChecklistCardProps) {
  const [progress, setProgress] = useState<OnboardingProgress>(initialProgress);
  const [savingField, setSavingField] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const items = useMemo<ChecklistItem[]>(
    () => [
      {
        id: 'hubspot',
        title: 'Give HubSpot access',
        description: 'Use your company access link so our team can securely access your HubSpot portal.',
        href: links.hubspotAccessUrl,
        completed: progress.hubspotAccessCompleted,
        highlighted: true,
      },
      {
        id: 'document',
        title: 'Complete onboarding document',
        description: 'Provide your business context and goals.',
        href: links.documentUrl,
        completed: progress.documentCompleted,
      },
      {
        id: 'survey',
        title: 'Complete onboarding survey',
        description: 'Answer setup questions for your engagement.',
        href: links.surveyUrl,
        completed: progress.surveyCompleted,
      },
    ],
    [progress, links]
  );

  const completedCount = items.filter((item) => item.completed).length;
  const totalItems = items.length;
  const isComplete = completedCount === totalItems;

  if (progress.isHidden) {
    return (
      <section className="rounded-2xl border border-[#d7e7f7] bg-[#f7fbff] p-6">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-xl font-semibold text-gray-900">Onboarding hidden</h2>
            <p className="mt-1 text-sm text-gray-600">You can show it again anytime.</p>
          </div>
          <button
            type="button"
            onClick={() => void updateProgressPatch('isHidden', false)}
            disabled={savingField === 'isHidden'}
            className="rounded-lg border border-gray-300 px-3 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 disabled:opacity-60"
          >
            {savingField === 'isHidden' ? 'Saving...' : 'Show onboarding'}
          </button>
        </div>
      </section>
    );
  }

  async function updateProgressPatch(
    field: 'documentCompleted' | 'surveyCompleted' | 'hubspotAccessCompleted' | 'isHidden',
    value: boolean
  ) {
    setError(null);
    setSavingField(field);

    const patchBody =
      field === 'documentCompleted'
        ? { documentCompleted: value }
        : field === 'surveyCompleted'
          ? { surveyCompleted: value }
          : field === 'hubspotAccessCompleted'
            ? { hubspotAccessCompleted: value }
            : { isHidden: value };

    try {
      const response = await fetch('/api/onboarding/progress', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(patchBody),
      });

      if (!response.ok) {
        throw new Error('Failed to update onboarding item');
      }

      setProgress((prev) => ({
        ...prev,
        ...(field === 'documentCompleted' ? { documentCompleted: value } : {}),
        ...(field === 'surveyCompleted' ? { surveyCompleted: value } : {}),
        ...(field === 'hubspotAccessCompleted' ? { hubspotAccessCompleted: value } : {}),
        ...(field === 'isHidden' ? { isHidden: value } : {}),
      }));
    } catch (e) {
      console.error(e);
      setError('Unable to update onboarding progress right now.');
    } finally {
      setSavingField(null);
    }
  }

  async function updateItemCompletion(
    itemId: ChecklistItem['id'],
    completed: boolean
  ) {
    if (itemId === 'hubspot') {
      await updateProgressPatch('hubspotAccessCompleted', completed);
      return;
    }

    await updateProgressPatch(itemId === 'document' ? 'documentCompleted' : 'surveyCompleted', completed);
  }

  return (
    <section className="rounded-2xl border border-[#d7e7f7] bg-[#f7fbff] p-6">
      <div className="mb-6 flex items-start justify-between gap-4">
        <div>
          <h2 className="text-xl font-semibold text-gray-900">Onboarding</h2>
          <p className="mt-1 text-sm text-gray-600 max-w-2xl">
            Complete these setup steps once. Hide this section once it is no longer needed.
          </p>
        </div>
        <button
          type="button"
          onClick={() => void updateProgressPatch('isHidden', true)}
          disabled={savingField === 'isHidden'}
          className="inline-flex h-9 w-9 items-center justify-center rounded-full border border-gray-200 bg-white text-lg leading-none text-gray-500 transition-colors hover:text-gray-800 hover:bg-gray-50 disabled:opacity-60"
          aria-label="Hide onboarding"
          title="Hide onboarding"
        >
          ×
        </button>
      </div>

      {error && (
        <div className="mb-3 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
          {error}
        </div>
      )}

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-12">
        <div className="rounded-xl border border-[#dfe7ef] bg-white p-4 lg:col-span-6">
          <p className="text-sm font-semibold text-gray-900">Onboarding walkthrough</p>
          <p className="mt-1 text-sm text-gray-600">A quick setup video can live here for new customers.</p>
          <div className="mt-3 flex h-44 items-center justify-center rounded-lg border border-dashed border-gray-300 bg-gray-50 text-sm text-gray-500">
            Video placeholder
          </div>
          <a
            href={links.videoUrl}
            target="_blank"
            rel="noreferrer"
            className="mt-3 inline-block text-sm font-medium text-gray-700 underline underline-offset-2 hover:text-gray-900"
          >
            Open onboarding video →
          </a>
        </div>

        <div className="rounded-xl border border-[#dfe7ef] bg-white p-4 lg:col-span-6">
          <p className="text-sm font-semibold text-gray-900">Onboarding checklist</p>
          <div className="mt-4 space-y-3">
            {items.map((item) => (
              <div
                key={item.id}
                className={`rounded-lg border p-3 ${
                  item.highlighted
                    ? 'border-[#cde98f] bg-[#f6ffd8]'
                    : 'border-gray-200 bg-gray-50'
                }`}
              >
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p className="text-sm font-semibold text-gray-900">{item.title}</p>
                    <p className="mt-1 text-sm text-gray-600">{item.description}</p>
                    <a
                      href={item.href}
                      target="_blank"
                      rel="noreferrer"
                      className="mt-2 inline-block text-sm font-medium text-gray-700 underline underline-offset-2 hover:text-gray-900"
                    >
                      {item.id === 'hubspot' ? 'Open HubSpot access link →' : 'Open placeholder →'}
                    </a>
                  </div>
                  <button
                    type="button"
                    onClick={() => void updateItemCompletion(item.id, !item.completed)}
                    disabled={savingField === item.id}
                    className={`mt-0.5 inline-flex h-6 w-6 items-center justify-center rounded-md border transition-colors disabled:opacity-60 ${
                      item.completed
                        ? 'border-green-500 bg-green-500 text-white'
                        : 'border-gray-300 bg-white text-transparent hover:border-gray-400'
                    }`}
                    aria-label={item.completed ? `Mark ${item.title} incomplete` : `Mark ${item.title} complete`}
                  >
                    {savingField === item.id
                      ? '…'
                      : item.completed
                        ? '✓'
                        : '✓'}
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
      <div className="mt-4 border-t border-[#dfe7ef] pt-3">
        <p className="text-xs text-gray-500">
          {isComplete ? 'All onboarding items are complete.' : 'Complete the checklist, or hide it with the X button.'}
        </p>
      </div>
    </section>
  );
}

