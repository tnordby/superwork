import type { SupabaseClient } from '@supabase/supabase-js';

/**
 * Server-side check: customer (or any user) is owner or member of the workspace.
 * Used to reject hostile workspace_id / project_id query params before listing assets.
 */
export async function customerHasWorkspaceAccess(
  supabase: SupabaseClient,
  userId: string,
  workspaceId: string
): Promise<boolean> {
  const { data: owned } = await supabase
    .from('workspaces')
    .select('id')
    .eq('id', workspaceId)
    .eq('owner_id', userId)
    .maybeSingle();
  if (owned) return true;
  const { data: member } = await supabase
    .from('workspace_members')
    .select('workspace_id')
    .eq('workspace_id', workspaceId)
    .eq('user_id', userId)
    .maybeSingle();
  return !!member;
}

/**
 * True if the user may filter assets by this project (RLS-aligned; avoids empty lists without explanation).
 */
export async function customerCanFilterAssetsByProject(
  supabase: SupabaseClient,
  userId: string,
  projectId: string
): Promise<boolean> {
  const { data: projectRow } = await supabase
    .from('projects')
    .select('workspace_id, user_id')
    .eq('id', projectId)
    .maybeSingle();
  if (!projectRow) return false;
  if (projectRow.workspace_id) {
    return customerHasWorkspaceAccess(supabase, userId, projectRow.workspace_id);
  }
  return projectRow.user_id === userId;
}
