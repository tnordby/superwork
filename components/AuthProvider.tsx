'use client';

import { createContext, useContext, useEffect, useState, useCallback } from 'react';
import { User } from '@supabase/supabase-js';
import { createClient } from '@/lib/supabase/client';
import { normalizePlatformRole, type PlatformRole } from '@/lib/auth/platform-role';

interface AuthContextType {
  user: User | null;
  loading: boolean;
  /** Resolved from `user_platform_roles` + API; null when logged out or not yet loaded */
  platformRole: PlatformRole | null;
  platformRoleLoading: boolean;
  signOut: () => Promise<void>;
  refreshPlatformRole: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType>({
  user: null,
  loading: true,
  platformRole: null,
  platformRoleLoading: false,
  signOut: async () => {},
  refreshPlatformRole: async () => {},
});

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [platformRole, setPlatformRole] = useState<PlatformRole | null>(null);
  const [platformRoleLoading, setPlatformRoleLoading] = useState(false);
  const supabase = createClient();

  const loadPlatformRole = useCallback(async (sessionUser: User | null) => {
    if (!sessionUser) {
      setPlatformRole(null);
      return;
    }
    setPlatformRoleLoading(true);
    try {
      const res = await fetch('/api/me/platform-role', { credentials: 'include' });
      if (res.ok) {
        const data = (await res.json()) as { role?: string };
        setPlatformRole(normalizePlatformRole(data.role ?? sessionUser.user_metadata?.role));
      } else {
        setPlatformRole(normalizePlatformRole(sessionUser.user_metadata?.role));
      }
    } catch {
      setPlatformRole(normalizePlatformRole(sessionUser.user_metadata?.role));
    } finally {
      setPlatformRoleLoading(false);
    }
  }, []);

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      const u = session?.user ?? null;
      setUser(u);
      setLoading(false);
      void loadPlatformRole(u);
    });

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      const u = session?.user ?? null;
      setUser(u);
      setLoading(false);
      void loadPlatformRole(u);
    });

    return () => subscription.unsubscribe();
  }, [supabase.auth, loadPlatformRole]);

  const signOut = async () => {
    await supabase.auth.signOut();
    setPlatformRole(null);
  };

  const refreshPlatformRole = useCallback(async () => {
    await loadPlatformRole(user);
  }, [user, loadPlatformRole]);

  return (
    <AuthContext.Provider
      value={{
        user,
        loading,
        platformRole,
        platformRoleLoading,
        signOut,
        refreshPlatformRole,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
