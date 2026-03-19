import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import { resolvePlatformRole } from '@/lib/auth/resolve-platform-role';
import { isAdmin, isConsultant, isQuoteManager } from '@/lib/auth/platform-role';

export default async function TeamLayout({ children }: { children: React.ReactNode }) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect('/login');
  }

  const role = await resolvePlatformRole(supabase, user.id, user.user_metadata?.role);
  if (isAdmin(role)) {
    redirect('/admin');
  }
  if (!isConsultant(role) && !isQuoteManager(role)) {
    redirect('/');
  }

  return <>{children}</>;
}
