import { describe, it, expect, vi, beforeEach } from 'vitest';
import { NextRequest } from 'next/server';
import { GET, PATCH } from './route';

const hoisted = vi.hoisted(() => ({
  mockGetUser: vi.fn(),
  mockCreateClient: vi.fn(),
  mockResolvePlatformRole: vi.fn(),
  mockReadSelectedWorkspaceId: vi.fn(),
  mockValidateTeam: vi.fn(),
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

vi.mock('@/lib/account/validate-workspace-team', () => ({
  validateTeamBelongsToWorkspace: hoisted.mockValidateTeam,
}));

vi.mock('@/lib/supabase/admin', () => ({
  tryCreateServiceRoleClient: hoisted.mockTryServiceRole,
}));

vi.mock('@/lib/billing/workspace-budget', () => ({
  getWorkspaceBudgetSnapshot: vi.fn(),
}));

vi.mock('@/lib/messaging/project-start-conversation', () => ({
  ensureConversationWhenProjectStarts: vi.fn(),
}));

function supabaseForGet(opts: {
  mode: 'customer' | 'internal';
  project: Record<string, unknown> | null;
  error?: { code?: string; message: string } | null;
}) {
  const err = opts.error ?? null;
  const data = opts.project;
  return {
    auth: { getUser: hoisted.mockGetUser },
    from(table: string) {
      if (table !== 'projects') {
        throw new Error(`unexpected table ${table}`);
      }
      if (opts.mode === 'customer') {
        return {
          select: () => ({
            eq: () => ({
              eq: () => ({
                single: () => Promise.resolve({ data, error: err }),
              }),
            }),
          }),
        };
      }
      return {
        select: () => ({
          eq: () => ({
            eq: () => ({
              single: () => Promise.resolve({ data, error: err }),
            }),
          }),
        }),
      };
    },
  };
}

function supabaseForTeamPatch(existing: Record<string, unknown>, updated: Record<string, unknown>) {
  let projectsFromCount = 0;
  return {
    auth: {
      getUser: hoisted.mockGetUser,
    },
    from(table: string) {
      if (table !== 'projects') {
        throw new Error(`unexpected table ${table}`);
      }
      projectsFromCount += 1;
      if (projectsFromCount === 1) {
        return {
          select: () => ({
            eq: () => ({
              eq: () => ({
                single: () => Promise.resolve({ data: existing, error: null }),
              }),
            }),
          }),
        };
      }
      return {
        update: () => ({
          eq: () => ({
            select: () => ({
              single: () => Promise.resolve({ data: updated, error: null }),
            }),
          }),
        }),
      };
    },
  };
}

describe('GET /api/projects/[id]', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('returns 401 when not authenticated', async () => {
    hoisted.mockCreateClient.mockResolvedValue({
      auth: { getUser: hoisted.mockGetUser },
    });
    hoisted.mockGetUser.mockResolvedValue({ data: { user: null }, error: new Error('auth') });

    const res = await GET(new NextRequest('http://localhost/api/projects/p1'), {
      params: Promise.resolve({ id: 'p1' }),
    });
    expect(res.status).toBe(401);
  });

  it('returns 400 when internal staff has no selected client context', async () => {
    hoisted.mockCreateClient.mockResolvedValue({
      auth: { getUser: hoisted.mockGetUser },
    });
    hoisted.mockGetUser.mockResolvedValue({
      data: { user: { id: 'u1', user_metadata: {} } },
      error: null,
    });
    hoisted.mockResolvePlatformRole.mockResolvedValue('consultant');
    hoisted.mockReadSelectedWorkspaceId.mockReturnValue(null);

    const res = await GET(new NextRequest('http://localhost/api/projects/p1'), {
      params: Promise.resolve({ id: 'p1' }),
    });
    expect(res.status).toBe(400);
    const body = await res.json();
    expect(body.error).toBe('Select a client context before viewing this project.');
  });

  it('returns 500 when the projects query fails with a non-404 error', async () => {
    const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
    hoisted.mockCreateClient.mockResolvedValue(
      supabaseForGet({
        mode: 'internal',
        project: null,
        error: { message: 'Database unavailable' },
      })
    );
    hoisted.mockGetUser.mockResolvedValue({
      data: { user: { id: 'u1', user_metadata: {} } },
      error: null,
    });
    hoisted.mockResolvePlatformRole.mockResolvedValue('admin');
    hoisted.mockReadSelectedWorkspaceId.mockReturnValue('ws-1');

    try {
      const res = await GET(new NextRequest('http://localhost/api/projects/p1'), {
        params: Promise.resolve({ id: 'p1' }),
      });
      expect(res.status).toBe(500);
      const body = await res.json();
      expect(body.error).toBe('Database unavailable');
    } finally {
      consoleSpy.mockRestore();
    }
  });

  it('returns 404 when project row is missing (PGRST116)', async () => {
    hoisted.mockCreateClient.mockResolvedValue(
      supabaseForGet({
        mode: 'internal',
        project: null,
        error: { code: 'PGRST116', message: 'Not found' },
      })
    );
    hoisted.mockGetUser.mockResolvedValue({
      data: { user: { id: 'u1', user_metadata: {} } },
      error: null,
    });
    hoisted.mockResolvePlatformRole.mockResolvedValue('project_manager');
    hoisted.mockReadSelectedWorkspaceId.mockReturnValue('ws-1');

    const res = await GET(new NextRequest('http://localhost/api/projects/p1'), {
      params: Promise.resolve({ id: 'p1' }),
    });
    expect(res.status).toBe(404);
    const body = await res.json();
    expect(body.error).toBe('Project not found');
  });

  it('returns 200 for internal user with matching client context', async () => {
    const project = {
      id: 'p1',
      name: 'Alpha',
      workspace_id: 'ws-1',
      user_id: 'cust-1',
      status: 'planned',
    };
    hoisted.mockCreateClient.mockResolvedValue(
      supabaseForGet({ mode: 'internal', project })
    );
    hoisted.mockGetUser.mockResolvedValue({
      data: { user: { id: 'u1', user_metadata: {} } },
      error: null,
    });
    hoisted.mockResolvePlatformRole.mockResolvedValue('admin');
    hoisted.mockReadSelectedWorkspaceId.mockReturnValue('ws-1');

    const res = await GET(new NextRequest('http://localhost/api/projects/p1'), {
      params: Promise.resolve({ id: 'p1' }),
    });
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.project.id).toBe('p1');
    expect(body.project.name).toBe('Alpha');
  });

  it('returns 200 for customer scoped to user_id', async () => {
    const project = {
      id: 'p1',
      name: 'Mine',
      workspace_id: 'ws-1',
      user_id: 'cust-1',
      status: 'planned',
    };
    hoisted.mockCreateClient.mockResolvedValue(
      supabaseForGet({ mode: 'customer', project })
    );
    hoisted.mockGetUser.mockResolvedValue({
      data: { user: { id: 'cust-1', user_metadata: {} } },
      error: null,
    });
    hoisted.mockResolvePlatformRole.mockResolvedValue('customer');
    hoisted.mockReadSelectedWorkspaceId.mockReturnValue(null);

    const res = await GET(new NextRequest('http://localhost/api/projects/p1'), {
      params: Promise.resolve({ id: 'p1' }),
    });
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.project.user_id).toBe('cust-1');
  });
});

describe('PATCH /api/projects/[id] (team_id)', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('returns 400 when internal staff has no selected client context', async () => {
    hoisted.mockCreateClient.mockResolvedValue({
      auth: { getUser: hoisted.mockGetUser },
    });
    hoisted.mockGetUser.mockResolvedValue({
      data: { user: { id: 'u1', user_metadata: {} } },
      error: null,
    });
    hoisted.mockResolvePlatformRole.mockResolvedValue('consultant');
    hoisted.mockReadSelectedWorkspaceId.mockReturnValue(null);

    const request = new NextRequest('http://localhost/api/projects/p1', {
      method: 'PATCH',
      body: JSON.stringify({ team_id: 't1' }),
    });

    const res = await PATCH(request, { params: Promise.resolve({ id: 'p1' }) });
    expect(res.status).toBe(400);
    const body = await res.json();
    expect(body.error).toContain('client context');
  });

  it('returns 400 when team validation fails', async () => {
    const existing = {
      id: 'p1',
      workspace_id: 'ws-1',
      status: 'planned',
      cost: 0,
      user_id: 'cust-1',
    };
    hoisted.mockCreateClient.mockResolvedValue(supabaseForTeamPatch(existing, existing));
    hoisted.mockGetUser.mockResolvedValue({
      data: { user: { id: 'u1', user_metadata: {} } },
      error: null,
    });
    hoisted.mockResolvePlatformRole.mockResolvedValue('project_manager');
    hoisted.mockReadSelectedWorkspaceId.mockReturnValue('ws-1');
    hoisted.mockTryServiceRole.mockReturnValue({});
    hoisted.mockValidateTeam.mockResolvedValue({
      ok: false,
      message: 'That team does not exist in this workspace.',
    });

    const request = new NextRequest('http://localhost/api/projects/p1', {
      method: 'PATCH',
      body: JSON.stringify({ team_id: 'bad-team' }),
    });

    const res = await PATCH(request, { params: Promise.resolve({ id: 'p1' }) });
    expect(res.status).toBe(400);
    const body = await res.json();
    expect(body.error).toContain('does not exist');
  });

  it('returns 200 after team validation passes', async () => {
    const existing = {
      id: 'p1',
      workspace_id: 'ws-1',
      status: 'planned',
      cost: 0,
      user_id: 'cust-1',
    };
    const updated = { ...existing, team_id: 't1' };
    hoisted.mockCreateClient.mockResolvedValue(supabaseForTeamPatch(existing, updated));
    hoisted.mockGetUser.mockResolvedValue({
      data: { user: { id: 'u1', user_metadata: {} } },
      error: null,
    });
    hoisted.mockResolvePlatformRole.mockResolvedValue('admin');
    hoisted.mockReadSelectedWorkspaceId.mockReturnValue('ws-1');
    hoisted.mockTryServiceRole.mockReturnValue({});
    hoisted.mockValidateTeam.mockResolvedValue({ ok: true });

    const request = new NextRequest('http://localhost/api/projects/p1', {
      method: 'PATCH',
      body: JSON.stringify({ team_id: 't1' }),
    });

    const res = await PATCH(request, { params: Promise.resolve({ id: 'p1' }) });
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.project.team_id).toBe('t1');
  });

  it('returns 400 when project has no workspace but team_id is set', async () => {
    const existing = {
      id: 'p1',
      workspace_id: null,
      status: 'planned',
      cost: 0,
      user_id: 'cust-1',
    };
    hoisted.mockCreateClient.mockResolvedValue(supabaseForTeamPatch(existing, existing));
    hoisted.mockGetUser.mockResolvedValue({
      data: { user: { id: 'u1', user_metadata: {} } },
      error: null,
    });
    hoisted.mockResolvePlatformRole.mockResolvedValue('admin');
    hoisted.mockReadSelectedWorkspaceId.mockReturnValue('ws-1');

    const request = new NextRequest('http://localhost/api/projects/p1', {
      method: 'PATCH',
      body: JSON.stringify({ team_id: 't1' }),
    });

    const res = await PATCH(request, { params: Promise.resolve({ id: 'p1' }) });
    expect(res.status).toBe(400);
    const body = await res.json();
    expect(body.error).toContain('workspace');
  });
});
