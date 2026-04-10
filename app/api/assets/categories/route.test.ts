import { describe, it, expect, vi, beforeEach } from 'vitest';
import { NextRequest } from 'next/server';
import { GET } from './route';

const hoisted = vi.hoisted(() => ({
  mockGetUser: vi.fn(),
  mockCreateClient: vi.fn(),
  mockResolvePlatformRole: vi.fn(),
  mockReadSelected: vi.fn(),
  mockHasWorkspace: vi.fn(),
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
}));

function categoriesThenable(result: { data: unknown; error: unknown | null }) {
  const chain = {
    select: () => chain,
    eq: () => chain,
    order: () => chain,
    then(onF?: (v: typeof result) => unknown, onR?: (e: unknown) => unknown) {
      return Promise.resolve(result).then(onF as never, onR);
    },
  };
  return chain;
}

describe('GET /api/assets/categories', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    hoisted.mockHasWorkspace.mockResolvedValue(true);
    hoisted.mockReadSelected.mockReturnValue(null);
  });

  it('returns 401 when not authenticated', async () => {
    hoisted.mockCreateClient.mockResolvedValue({
      auth: {
        getUser: () => Promise.resolve({ data: { user: null }, error: new Error('no') }),
      },
      from: () => categoriesThenable({ data: [], error: null }),
    });

    const res = await GET(new NextRequest('http://localhost/api/assets/categories'));
    expect(res.status).toBe(401);
  });

  it('returns 403 when customer cannot access workspace', async () => {
    hoisted.mockHasWorkspace.mockResolvedValue(false);
    hoisted.mockCreateClient.mockResolvedValue({
      auth: {
        getUser: () =>
          Promise.resolve({ data: { user: { id: 'u1', user_metadata: {} } }, error: null }),
      },
      from: () => categoriesThenable({ data: [], error: null }),
    });
    hoisted.mockResolvePlatformRole.mockResolvedValue('customer');

    const res = await GET(
      new NextRequest('http://localhost/api/assets/categories?workspace_id=ws-x')
    );
    expect(res.status).toBe(403);
  });

  it('returns empty categories when workspace_id is missing', async () => {
    hoisted.mockCreateClient.mockResolvedValue({
      auth: {
        getUser: () =>
          Promise.resolve({ data: { user: { id: 'u1', user_metadata: {} } }, error: null }),
      },
      from: () => categoriesThenable({ data: [], error: null }),
    });
    hoisted.mockResolvePlatformRole.mockResolvedValue('customer');

    const res = await GET(new NextRequest('http://localhost/api/assets/categories'));
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.categories).toEqual([]);
  });

  it('returns 200 with category rows', async () => {
    const rows = [{ id: 'cat-1', workspace_id: 'ws-1', name: 'Brand' }];
    hoisted.mockCreateClient.mockResolvedValue({
      auth: {
        getUser: () =>
          Promise.resolve({ data: { user: { id: 'u1', user_metadata: {} } }, error: null }),
      },
      from: () => categoriesThenable({ data: rows, error: null }),
    });
    hoisted.mockResolvePlatformRole.mockResolvedValue('customer');

    const res = await GET(
      new NextRequest('http://localhost/api/assets/categories?workspace_id=ws-1')
    );
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.categories).toEqual(rows);
  });
});
