import type { NextRequest } from 'next/server';
import type { SupabaseClient } from '@supabase/supabase-js';
import { cookies } from 'next/headers';
import type { PlatformRole } from '@/lib/auth/platform-role';
import { isInternalStaff } from '@/lib/auth/platform-role';

/**
 * Selected client workspace cookie for internal staff. Many routes scope reads/writes when set;
 * messaging (conversations + messages) allows all-clients mode but still enforces a match when
 * this cookie is present. Stricter “must select context” flows include project PATCH/DELETE,
 * quote updates, asset mutations, and intake updates (see grep for readSelectedWorkspaceIdFromRequest).
 */

export const INTERNAL_SELECTED_WORKSPACE_COOKIE = 'internal_selected_workspace_id';

export function readSelectedWorkspaceIdFromRequest(request: NextRequest): string | null {
  const value = request.cookies.get(INTERNAL_SELECTED_WORKSPACE_COOKIE)?.value?.trim();
  return value || null;
}

export async function readSelectedWorkspaceIdFromServerCookies(): Promise<string | null> {
  const cookieStore = await cookies();
  const value = cookieStore.get(INTERNAL_SELECTED_WORKSPACE_COOKIE)?.value?.trim();
  return value || null;
}

export async function loadInternalWorkspaceOptions(db: SupabaseClient): Promise<
  Array<{ id: string; name: string }>
> {
  const { data, error } = await db
    .from('workspaces')
    .select('id, name')
    .eq('type', 'client')
    .order('name', { ascending: true });
  if (error) {
    throw new Error(error.message);
  }
  return (data || []).map((workspace: { id: string; name: string | null }) => ({
    id: workspace.id,
    name: workspace.name || 'Customer',
  }));
}

export async function resolveSelectedWorkspaceForRole(
  db: SupabaseClient,
  platformRole: PlatformRole,
  requestedWorkspaceId: string | null
): Promise<{ workspaceId: string | null; options: Array<{ id: string; name: string }> }> {
  if (!isInternalStaff(platformRole)) {
    return { workspaceId: null, options: [] };
  }

  const options = await loadInternalWorkspaceOptions(db);
  if (options.length === 0) {
    return { workspaceId: null, options };
  }

  if (requestedWorkspaceId && options.some((option) => option.id === requestedWorkspaceId)) {
    return { workspaceId: requestedWorkspaceId, options };
  }

  return { workspaceId: options[0].id, options };
}

export function resolveInternalWriteWorkspaceId(params: {
  platformRole: PlatformRole;
  selectedWorkspaceId: string | null;
  explicitWorkspaceId?: string | null;
}): { workspaceId: string | null; error: string | null } {
  const { platformRole, selectedWorkspaceId, explicitWorkspaceId } = params;
  if (!isInternalStaff(platformRole)) {
    return { workspaceId: explicitWorkspaceId ?? null, error: null };
  }

  if (selectedWorkspaceId) {
    if (explicitWorkspaceId && explicitWorkspaceId !== selectedWorkspaceId) {
      return {
        workspaceId: null,
        error: 'Provided workspace does not match selected client context',
      };
    }
    return { workspaceId: selectedWorkspaceId, error: null };
  }

  if (explicitWorkspaceId) {
    return { workspaceId: explicitWorkspaceId, error: null };
  }

  return {
    workspaceId: null,
    error: 'Select a client context or provide workspace_id when using All clients',
  };
}
