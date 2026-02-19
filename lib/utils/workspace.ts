import { createClient } from '@/lib/supabase/client';

/**
 * Get the user's primary workspace
 * For now, returns the first workspace owned by the user
 */
export async function getUserWorkspace() {
  const supabase = createClient();

  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    return null;
  }

  // Get workspace owned by user
  const { data: ownedWorkspace } = await supabase
    .from('workspaces')
    .select('*')
    .eq('owner_id', user.id)
    .single();

  if (ownedWorkspace) {
    return ownedWorkspace;
  }

  // If no owned workspace, get first workspace where user is a member
  const { data: membership } = await supabase
    .from('workspace_members')
    .select('workspace_id, workspaces(*)')
    .eq('user_id', user.id)
    .limit(1)
    .single();

  return membership?.workspaces || null;
}

/**
 * Get or create a workspace for the user
 */
export async function getOrCreateWorkspace() {
  const supabase = createClient();

  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    throw new Error('User not authenticated');
  }

  // Try to get existing workspace
  let workspace = await getUserWorkspace();

  if (workspace) {
    return workspace;
  }

  // Create new workspace for user
  const { data: newWorkspace, error } = await supabase
    .from('workspaces')
    .insert({
      name: `${user.email}'s Workspace`,
      owner_id: user.id,
      type: 'client',
    })
    .select()
    .single();

  if (error) {
    throw error;
  }

  return newWorkspace;
}
