'use client';

import Link from 'next/link';
import { CreditCard } from 'lucide-react';
import {
  PROJECT_CREATION_BLOCKED_MESSAGE,
  PROJECT_CREATION_PLAN_PATH,
} from '@/lib/billing/project-creation-eligibility';

export function ActivePlanRequired() {
  return (
    <div className="rounded-2xl border border-amber-200 bg-amber-50 p-8 text-center">
      <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-amber-100">
        <CreditCard className="h-6 w-6 text-amber-800" aria-hidden />
      </div>
      <h2 className="text-lg font-semibold text-gray-900">{PROJECT_CREATION_BLOCKED_MESSAGE}</h2>
      <p className="mt-2 text-sm text-gray-600">
        Choose a plan and add payment details to start new projects and custom briefs.
      </p>
      <Link
        href={PROJECT_CREATION_PLAN_PATH}
        className="mt-6 inline-flex items-center justify-center rounded-xl bg-[#bfe937] px-6 py-3 text-sm font-medium text-gray-900 transition-colors hover:bg-[#acd829]"
      >
        Go to plan
      </Link>
    </div>
  );
}
