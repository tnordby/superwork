import { describe, expect, it, vi } from 'vitest';
import type { SupabaseClient } from '@supabase/supabase-js';
import { validateTeamBelongsToWorkspace } from './validate-workspace-team';

function mockSupabaseForTeamLookup(result: { data: unknown; error: unknown }): SupabaseClient {
  const chain = {
    select: vi.fn().mockReturnThis(),
    eq: vi.fn().mockReturnThis(),
    maybeSingle: vi.fn().mockResolvedValue(result),
  };
  return {
    from: vi.fn().mockReturnValue(chain),
  } as unknown as SupabaseClient;
}

describe('validateTeamBelongsToWorkspace', () => {
  it('allows null/empty team id', async () => {
    const client = mockSupabaseForTeamLookup({ data: null, error: null });
    await expect(validateTeamBelongsToWorkspace(client, null, 'ws-1')).resolves.toEqual({ ok: true });
    await expect(validateTeamBelongsToWorkspace(client, '', 'ws-1')).resolves.toEqual({ ok: true });
    expect(client.from).not.toHaveBeenCalled();
  });

  it('rejects team when project has no workspace', async () => {
    const client = mockSupabaseForTeamLookup({ data: null, error: null });
    await expect(validateTeamBelongsToWorkspace(client, 'team-1', null)).resolves.toEqual({
      ok: false,
      message: 'A team can only be assigned when the project belongs to a workspace.',
    });
    expect(client.from).not.toHaveBeenCalled();
  });

  it('rejects when team row is missing', async () => {
    const client = mockSupabaseForTeamLookup({ data: null, error: null });
    await expect(validateTeamBelongsToWorkspace(client, 'team-1', 'ws-1')).resolves.toEqual({
      ok: false,
      message: 'That team does not exist in this workspace.',
    });
  });

  it('accepts when team exists in workspace', async () => {
    const client = mockSupabaseForTeamLookup({ data: { id: 'team-1' }, error: null });
    await expect(validateTeamBelongsToWorkspace(client, 'team-1', 'ws-1')).resolves.toEqual({ ok: true });
  });
});
