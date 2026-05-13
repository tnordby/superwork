import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import { resolvePlatformRole } from '@/lib/auth/resolve-platform-role';
import { isInternalStaff } from '@/lib/auth/platform-role';

/**
 * In-app inbox UI is temporarily disabled (messaging will move to external channels).
 * Preserved implementation: `./archived-inbox.client.tsx`
 */
export default async function InboxPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect('/login');
  }

  const role = await resolvePlatformRole(supabase, user.id, user.user_metadata?.role);
  redirect(isInternalStaff(role) ? '/team' : '/');
}
