import type { SupabaseClient } from '@supabase/supabase-js';

/**
 * Ensures team_id belongs to the given workspace (for project assignment).
 */
export async function validateTeamBelongsToWorkspace(
  admin: SupabaseClient,
  teamId: string | null | undefined,
  workspaceId: string | null | undefined
): Promise<{ ok: true } | { ok: false; message: string }> {
  if (teamId === undefined || teamId === null || teamId === '') {
    return { ok: true };
  }
  const trimmed = teamId.trim();
  if (!trimmed) return { ok: true };
  if (!workspaceId) {
    return {
      ok: false,
      message: 'A team can only be assigned when the project belongs to a workspace.',
    };
  }
  const { data, error } = await admin
    .from('workspace_teams')
    .select('id')
    .eq('id', trimmed)
    .eq('workspace_id', workspaceId)
    .maybeSingle();

  if (error) {
    return { ok: false, message: error.message };
  }
  if (!data) {
    return { ok: false, message: 'That team does not exist in this workspace.' };
  }
  return { ok: true };
}
