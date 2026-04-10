import { describe, it, expect, vi, beforeEach } from 'vitest';
import { NextRequest } from 'next/server';
import { GET } from './route';

const hoisted = vi.hoisted(() => ({
  mockGetUser: vi.fn(),
  mockCreateClient: vi.fn(),
  mockResolvePlatformRole: vi.fn(),
  mockReadSelectedWorkspaceId: vi.fn(),
  mockTryServiceRole: vi.fn(),
}));

vi.mock('@/lib/supabase/server', () => ({
  createClient: hoisted.mockCreateClient,
}));

vi.mock('@/lib/auth/resolve-platform-role', () => ({
  resolvePlatformRole: hoisted.mockResolvePlatformRole,
}));

vi.mock('@/lib/internal/client-context', () => ({
  readSelectedWorkspaceIdFromRequest: hoisted.mockReadSelectedWorkspaceId,
}));

vi.mock('@/lib/supabase/admin', () => ({
  tryCreateServiceRoleClient: hoisted.mockTryServiceRole,
}));

function adminClientFactory(opts: {
  workspace: { data: unknown; error: { message: string } | null };
  teams: { data: unknown; error: { message: string } | null };
}) {
  return {
    from(table: string) {
      if (table === 'workspaces') {
        return {
          select: () => ({
            eq: () => ({
              maybeSingle: () => Promise.resolve(opts.workspace),
            }),
          }),
        };
      }
      if (table === 'workspace_teams') {
        return {
          select: () => ({
            eq: () => ({
              order: () => Promise.resolve(opts.teams),
            }),
          }),
        };
      }
      throw new Error(`unexpected table: ${table}`);
    },
  };
}

function req(url: string) {
  return new NextRequest(new URL(url, 'http://localhost'));
}

describe('GET /api/internal/workspace-teams', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    hoisted.mockCreateClient.mockResolvedValue({
      auth: { getUser: hoisted.mockGetUser },
    });
  });

  it('returns 401 when not authenticated', async () => {
    hoisted.mockGetUser.mockResolvedValue({ data: { user: null }, error: new Error('nope') });
    const res = await GET(req('http://localhost/api/internal/workspace-teams?workspace_id=ws-1'));
    expect(res.status).toBe(401);
  });

  it('returns 403 for customer role', async () => {
    hoisted.mockGetUser.mockResolvedValue({
      data: { user: { id: 'u1', user_metadata: {} } },
      error: null,
    });
    hoisted.mockResolvePlatformRole.mockResolvedValue('customer');
    const res = await GET(req('http://localhost/api/internal/workspace-teams?workspace_id=ws-1'));
    expect(res.status).toBe(403);
    const body = await res.json();
    expect(body.error).toBe('Forbidden');
  });

  it('returns 400 when workspace_id is missing', async () => {
    hoisted.mockGetUser.mockResolvedValue({
      data: { user: { id: 'u1', user_metadata: {} } },
      error: null,
    });
    hoisted.mockResolvePlatformRole.mockResolvedValue('consultant');
    const res = await GET(req('http://localhost/api/internal/workspace-teams'));
    expect(res.status).toBe(400);
  });

  it('returns 403 when selected client does not match workspace_id', async () => {
    hoisted.mockGetUser.mockResolvedValue({
      data: { user: { id: 'u1', user_metadata: {} } },
      error: null,
    });
    hoisted.mockResolvePlatformRole.mockResolvedValue('project_manager');
    hoisted.mockReadSelectedWorkspaceId.mockReturnValue('other-ws');
    const res = await GET(req('http://localhost/api/internal/workspace-teams?workspace_id=ws-1'));
    expect(res.status).toBe(403);
    const body = await res.json();
    expect(body.error).toContain('sidebar');
  });

  it('returns 503 when service role client is unavailable', async () => {
    hoisted.mockGetUser.mockResolvedValue({
      data: { user: { id: 'u1', user_metadata: {} } },
      error: null,
    });
    hoisted.mockResolvePlatformRole.mockResolvedValue('admin');
    hoisted.mockReadSelectedWorkspaceId.mockReturnValue('ws-1');
    hoisted.mockTryServiceRole.mockReturnValue(null);
    const res = await GET(req('http://localhost/api/internal/workspace-teams?workspace_id=ws-1'));
    expect(res.status).toBe(503);
  });

  it('returns 404 when workspace is not a client workspace', async () => {
    hoisted.mockGetUser.mockResolvedValue({
      data: { user: { id: 'u1', user_metadata: {} } },
      error: null,
    });
    hoisted.mockResolvePlatformRole.mockResolvedValue('consultant');
    hoisted.mockReadSelectedWorkspaceId.mockReturnValue('ws-1');
    hoisted.mockTryServiceRole.mockReturnValue(
      adminClientFactory({
        workspace: { data: { id: 'ws-1', type: 'internal' }, error: null },
        teams: { data: [], error: null },
      })
    );
    const res = await GET(req('http://localhost/api/internal/workspace-teams?workspace_id=ws-1'));
    expect(res.status).toBe(404);
  });

  it('returns 200 with teams sorted path (data from service role)', async () => {
    hoisted.mockGetUser.mockResolvedValue({
      data: { user: { id: 'u1', user_metadata: {} } },
      error: null,
    });
    hoisted.mockResolvePlatformRole.mockResolvedValue('consultant');
    hoisted.mockReadSelectedWorkspaceId.mockReturnValue('ws-1');
    hoisted.mockTryServiceRole.mockReturnValue(
      adminClientFactory({
        workspace: { data: { id: 'ws-1', type: 'client' }, error: null },
        teams: {
          data: [
            { id: 'b', name: 'Beta' },
            { id: 'a', name: 'Alpha' },
          ],
          error: null,
        },
      })
    );
    const res = await GET(req('http://localhost/api/internal/workspace-teams?workspace_id=ws-1'));
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.teams).toHaveLength(2);
    expect(body.teams).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ id: 'a', name: 'Alpha' }),
        expect.objectContaining({ id: 'b', name: 'Beta' }),
      ])
    );
  });
});
