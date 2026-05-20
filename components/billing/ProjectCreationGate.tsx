'use client';

import { useEffect, useState, type ReactNode } from 'react';
import { Loader2 } from 'lucide-react';
import { useAuth } from '@/components/AuthProvider';
import { isInternalStaff } from '@/lib/auth/platform-role';
import { ActivePlanRequired } from '@/components/billing/ActivePlanRequired';

type GateState = 'loading' | 'allowed' | 'blocked';

export function ProjectCreationGate({ children }: { children: ReactNode }) {
  const { platformRole } = useAuth();
  const [state, setState] = useState<GateState>('loading');

  useEffect(() => {
    if (platformRole !== null && isInternalStaff(platformRole)) {
      setState('allowed');
      return;
    }

    if (platformRole === null) {
      return;
    }

    let cancelled = false;

    void fetch('/api/account/project-creation-eligibility', { credentials: 'include' })
      .then(async (res) => {
        const data = res.ok ? await res.json() : null;
        if (cancelled) return;
        setState(data?.allowed === true ? 'allowed' : 'blocked');
      })
      .catch(() => {
        if (!cancelled) setState('blocked');
      });

    return () => {
      cancelled = true;
    };
  }, [platformRole]);

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
