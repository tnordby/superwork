import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import { resolvePlatformRole } from '@/lib/auth/resolve-platform-role';
import { isAdmin } from '@/lib/auth/platform-role';
import { AdminSidebar } from '@/components/navigation/AdminSidebar';
import { AdminMain } from '@/components/navigation/AdminMain';

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const supabase = await createClient();
  const {
    data: { user },
    error,
  } = await supabase.auth.getUser();

  if (error || !user) {
    redirect('/login');
  }

  const role = await resolvePlatformRole(supabase, user.id, user.user_metadata?.role);
  if (!isAdmin(role)) {
    redirect('/');
  }

  return (
    <div className="flex min-h-screen">
      <AdminSidebar />
      <AdminMain>{children}</AdminMain>
    </div>
  );
}
