'use client';

import { Play } from 'lucide-react';
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
  linkLabel: string;
  href: string;
  completed: boolean;
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
        description: 'Share access so we can work in your portal securely.',
        linkLabel: 'Grant access',
        href: links.hubspotAccessUrl,
        completed: progress.hubspotAccessCompleted,
      },
      {
        id: 'document',
        title: 'Onboarding document',
        description: 'Business context and goals.',
        linkLabel: 'Open document',
        href: links.documentUrl,
        completed: progress.documentCompleted,
      },
      {
        id: 'survey',
        title: 'Onboarding survey',
        description: 'A few setup questions for your engagement.',
        linkLabel: 'Take survey',
        href: links.surveyUrl,
        completed: progress.surveyCompleted,
      },
    ],
    [progress, links]
  );

  const allChecklistComplete = items.every((item) => item.completed);

  if (progress.isHidden) {
    return (
      <section className="rounded-2xl border border-gray-200 bg-white p-6">
        <div className="flex items-center justify-between gap-4">
          <p className="text-sm text-gray-700">Onboarding hidden.</p>
          <button
            type="button"
            onClick={() => void updateProgressPatch('isHidden', false)}
            disabled={savingField === 'isHidden'}
            className="shrink-0 rounded-lg border border-gray-300 px-3 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 disabled:opacity-60"
          >
            {savingField === 'isHidden' ? 'Saving...' : 'Show again'}
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
    <section className="rounded-2xl border-2 border-[#c5dc6a] bg-gradient-to-br from-[#f7fcea] via-[#f1f8e4] to-[#eaf4d4] p-6 shadow-sm">
      <div className="mb-5 flex items-start justify-between gap-4">
        <h2 className="text-xl font-semibold text-gray-900">Onboarding</h2>
        {allChecklistComplete ? (
          <button
            type="button"
            onClick={() => void updateProgressPatch('isHidden', true)}
            disabled={savingField === 'isHidden'}
            className="inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-full border-2 border-gray-900/90 bg-white text-xl font-light leading-none text-gray-900 shadow-md transition-colors hover:bg-gray-50 hover:border-gray-900 disabled:opacity-60"
            aria-label="Hide onboarding section"
            title="Hide after completing all steps"
          >
            ×
          </button>
        ) : null}
      </div>

      {error && (
        <div className="mb-4 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
          {error}
        </div>
      )}

      <div className="grid grid-cols-1 gap-8 lg:grid-cols-2 lg:items-stretch lg:gap-10">
        <div className="flex flex-col lg:h-full lg:min-h-0 lg:pr-2">
          <a
            href={links.videoUrl}
            target="_blank"
            rel="noreferrer"
            aria-label="Open onboarding overview video"
            className="flex min-h-[11rem] flex-1 flex-col items-center justify-center gap-3 rounded-xl border border-[#d6e8b0] bg-white/80 px-4 py-10 text-gray-500 shadow-sm backdrop-blur-[2px] transition-colors hover:border-[#bfe937]/60 hover:bg-white lg:min-h-0 lg:py-6"
          >
            <span className="flex h-14 w-14 items-center justify-center rounded-full bg-white text-gray-800 shadow-sm ring-1 ring-gray-200/80">
              <Play className="ml-0.5 h-6 w-6" fill="currentColor" aria-hidden />
            </span>
          </a>
        </div>

        <div className="flex flex-col border-t border-[#dce9c4] pt-6 lg:border-t-0 lg:border-l lg:pl-8 lg:pt-0">
          <p className="text-sm font-medium text-gray-900">Checklist</p>
          <ol className="mt-3 list-none divide-y divide-[#dce9c4] p-0">
            {items.map((item, index) => (
              <li key={item.id} value={index + 1} className="flex items-start gap-3 py-4 first:pt-0 sm:gap-4">
                <span
                  className={`mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-xs font-semibold tabular-nums ring-1 ${
                    item.completed
                      ? 'bg-white/60 text-gray-500 ring-[#dce9c4]'
                      : 'bg-white/90 text-gray-900 ring-[#c5dc6a]'
                  }`}
                >
                  {index + 1}
                </span>
                <div
                  className={`min-w-0 flex-1 ${item.completed ? 'text-gray-500' : ''}`}
                >
                  <p
                    className={`text-sm font-medium ${item.completed ? 'line-through' : 'text-gray-900'}`}
                  >
                    {item.title}
                  </p>
                  <p
                    className={`mt-0.5 text-sm ${item.completed ? 'line-through' : 'text-gray-600'}`}
                  >
                    {item.description}
                  </p>
                  <a
                    href={item.href}
                    target="_blank"
                    rel="noreferrer"
                    className={`mt-2 inline-flex text-sm font-medium ${
                      item.completed
                        ? 'line-through no-underline'
                        : 'text-gray-900 underline decoration-gray-300 underline-offset-4 hover:decoration-gray-500'
                    }`}
                  >
                    {item.linkLabel}
                  </a>
                </div>
                <button
                  type="button"
                  onClick={() => void updateItemCompletion(item.id, !item.completed)}
                  disabled={savingField === item.id}
                  className={`mt-0.5 inline-flex h-6 w-6 shrink-0 items-center justify-center rounded-full border text-xs font-medium transition-colors disabled:opacity-60 ${
                    item.completed
                      ? 'border-[#bfe937] bg-[#bfe937] text-gray-900'
                      : 'border-gray-300 bg-white text-transparent hover:border-[#bfe937]'
                  }`}
                  aria-label={item.completed ? `Mark ${item.title} incomplete` : `Mark ${item.title} complete`}
                >
                  {savingField === item.id ? '…' : item.completed ? '✓' : ''}
                </button>
              </li>
            ))}
          </ol>
        </div>
      </div>
    </section>
  );
}

