import type { createClient } from '@/lib/supabase/server';
import { normalizePlatformRole, type PlatformRole } from './platform-role';

type ServerClient = Awaited<ReturnType<typeof createClient>>;

/**
 * DB row wins when present; otherwise JWT `user_metadata.role`.
 * Call from Route Handlers / Server Components with the user-scoped Supabase client.
 */
export async function resolvePlatformRole(
  supabase: ServerClient,
  userId: string,
  metadataRole: string | undefined
): Promise<PlatformRole> {
  const { data, error } = await supabase
    .from('user_platform_roles')
    .select('role')
    .eq('user_id', userId)
    .maybeSingle();

  if (error) {
    console.warn('[resolvePlatformRole] user_platform_roles read failed:', error.message);
  }

  if (data?.role && typeof data.role === 'string') {
    return normalizePlatformRole(data.role);
  }

  return normalizePlatformRole(metadataRole);
}
