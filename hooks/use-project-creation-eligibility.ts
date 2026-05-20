'use client';

import { useEffect, useState } from 'react';
import { useAuth } from '@/components/AuthProvider';
import { isInternalStaff } from '@/lib/auth/platform-role';

export type ProjectCreationEligibilityState = 'loading' | 'allowed' | 'blocked';

export function useProjectCreationEligibility(): ProjectCreationEligibilityState {
  const { platformRole } = useAuth();
  const [state, setState] = useState<ProjectCreationEligibilityState>('loading');

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

  return state;
}
