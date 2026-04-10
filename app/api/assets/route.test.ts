import { describe, it, expect, vi, beforeEach } from 'vitest';
import { NextRequest } from 'next/server';
import { GET } from './route';

const hoisted = vi.hoisted(() => ({
  mockGetUser: vi.fn(),
  mockCreateClient: vi.fn(),
  mockResolvePlatformRole: vi.fn(),
  mockReadSelected: vi.fn(),
  mockHasWorkspace: vi.fn(),
  mockCanProject: vi.fn(),
}));

vi.mock('@/lib/supabase/server', () => ({
  createClient: hoisted.mockCreateClient,
}));

vi.mock('@/lib/auth/resolve-platform-role', () => ({
  resolvePlatformRole: hoisted.mockResolvePlatformRole,
}));

vi.mock('@/lib/internal/client-context', () => ({
  readSelectedWorkspaceIdFromRequest: hoisted.mockReadSelected,
}));

vi.mock('@/lib/assets/customer-access', () => ({
  customerHasWorkspaceAccess: hoisted.mockHasWorkspace,
  customerCanFilterAssetsByProject: hoisted.mockCanProject,
}));

function assetsQueryThenable(result: { data: unknown[]; error: unknown | null }) {
  const chain = {
    select: () => chain,
    order: () => chain,
    eq: () => chain,
    or: () => chain,
    range: () => chain,
    then(
      onFulfilled?: (v: typeof result) => unknown,
      onRejected?: (e: unknown) => unknown
    ) {
      return Promise.resolve(result).then(onFulfilled as never, onRejected);
    },
  };
  return chain;
}

describe('GET /api/assets', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    hoisted.mockHasWorkspace.mockResolvedValue(true);
    hoisted.mockCanProject.mockResolvedValue(true);
    hoisted.mockReadSelected.mockReturnValue(null);
  });

  it('returns 401 when not authenticated', async () => {
    hoisted.mockCreateClient.mockResolvedValue({
      auth: {
        getUser: () => Promise.resolve({ data: { user: null }, error: new Error('no') }),
      },
      from: () => assetsQueryThenable({ data: [], error: null }),
    });

    const res = await GET(new NextRequest('http://localhost/api/assets'));
    expect(res.status).toBe(401);
  });

  it('returns 403 when customer requests a workspace they cannot access', async () => {
    hoisted.mockHasWorkspace.mockResolvedValue(false);
    hoisted.mockCreateClient.mockResolvedValue({
      auth: {
        getUser: () =>
          Promise.resolve({ data: { user: { id: 'u1', user_metadata: {} } }, error: null }),
      },
      from: () => assetsQueryThenable({ data: [], error: null }),
    });
    hoisted.mockResolvePlatformRole.mockResolvedValue('customer');

    const res = await GET(
      new NextRequest('http://localhost/api/assets?workspace_id=foreign-ws')
    );
    expect(res.status).toBe(403);
    expect(hoisted.mockHasWorkspace).toHaveBeenCalledWith(
      expect.anything(),
      'u1',
      'foreign-ws'
    );
  });

  it('returns 403 when customer filters by a project they cannot use', async () => {
    hoisted.mockCanProject.mockResolvedValue(false);
    hoisted.mockCreateClient.mockResolvedValue({
      auth: {
        getUser: () =>
          Promise.resolve({ data: { user: { id: 'u1', user_metadata: {} } }, error: null }),
      },
      from: () => assetsQueryThenable({ data: [], error: null }),
    });
    hoisted.mockResolvePlatformRole.mockResolvedValue('customer');

    const res = await GET(new NextRequest('http://localhost/api/assets?project_id=proj-x'));
    expect(res.status).toBe(403);
  });

  it('returns 200 with empty list when query succeeds', async () => {
    hoisted.mockCreateClient.mockResolvedValue({
      auth: {
        getUser: () =>
          Promise.resolve({ data: { user: { id: 'u1', user_metadata: {} } }, error: null }),
      },
      from: () => assetsQueryThenable({ data: [], error: null }),
    });
    hoisted.mockResolvePlatformRole.mockResolvedValue('customer');

    const res = await GET(
      new NextRequest('http://localhost/api/assets?workspace_id=ws-1')
    );
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.assets).toEqual([]);
    expect(body.page).toBe(1);
    expect(body.has_more).toBe(false);
  });

  it('does not call customer workspace checks for internal staff', async () => {
    hoisted.mockCreateClient.mockResolvedValue({
      auth: {
        getUser: () =>
          Promise.resolve({ data: { user: { id: 'pm1', user_metadata: {} } }, error: null }),
      },
      from: () => assetsQueryThenable({ data: [], error: null }),
    });
    hoisted.mockResolvePlatformRole.mockResolvedValue('project_manager');
    hoisted.mockReadSelected.mockReturnValue('ws-selected');

    const res = await GET(
      new NextRequest('http://localhost/api/assets?workspace_id=ws-1')
    );
    expect(res.status).toBe(200);
    expect(hoisted.mockHasWorkspace).not.toHaveBeenCalled();
    expect(hoisted.mockCanProject).not.toHaveBeenCalled();
  });

  it('returns 500 when the assets query fails', async () => {
    const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
    hoisted.mockCreateClient.mockResolvedValue({
      auth: {
        getUser: () =>
          Promise.resolve({ data: { user: { id: 'u1', user_metadata: {} } }, error: null }),
      },
      from: () =>
        assetsQueryThenable({ data: [], error: { message: 'rls', code: 'PGRST301' } }),
    });
    hoisted.mockResolvePlatformRole.mockResolvedValue('customer');

    try {
      const res = await GET(new NextRequest('http://localhost/api/assets'));
      expect(res.status).toBe(500);
      const body = await res.json();
      expect(body.error).toBe('Failed to fetch assets');
    } finally {
      consoleSpy.mockRestore();
    }
  });
});
