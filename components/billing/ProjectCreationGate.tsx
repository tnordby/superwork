'use client';

import { Loader2 } from 'lucide-react';
import type { ReactNode } from 'react';
import { ActivePlanRequired } from '@/components/billing/ActivePlanRequired';
import { useProjectCreationEligibility } from '@/hooks/use-project-creation-eligibility';

export function ProjectCreationGate({ children }: { children: ReactNode }) {
  const state = useProjectCreationEligibility();

  if (state === 'loading') {
    return (
      <div className="flex items-center justify-center py-16">
        <Loader2 className="h-8 w-8 animate-spin text-gray-400" aria-label="Loading" />
      </div>
    );
  }

  if (state === 'blocked') {
    return <ActivePlanRequired />;
  }

  return <>{children}</>;
}
