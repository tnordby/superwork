import { describe, it, expect, vi, beforeEach } from 'vitest';
import { NextRequest } from 'next/server';
import { GET } from './route';

const hoisted = vi.hoisted(() => ({
  mockGetUser: vi.fn(),
  mockCreateClient: vi.fn(),
  mockResolvePlatformRole: vi.fn(),
  mockReadSelected: vi.fn(),
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

const customer = { id: 'cust-1', user_metadata: {} };

describe('GET /api/projects', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    hoisted.mockReadSelected.mockReturnValue(null);
    hoisted.mockResolvePlatformRole.mockResolvedValue('customer');
    hoisted.mockGetUser.mockResolvedValue({
      data: { user: customer },
      error: null,
    });
  });

  it('returns 401 when not authenticated', async () => {
    hoisted.mockGetUser.mockResolvedValue({
      data: { user: null },
      error: new Error('no session'),
    });
    hoisted.mockCreateClient.mockResolvedValue({
      auth: { getUser: hoisted.mockGetUser },
    });

    const res = await GET(new NextRequest('http://localhost/api/projects'));
    expect(res.status).toBe(401);
  });

  it('returns 400 when internal staff has no selected client workspace', async () => {
    hoisted.mockResolvePlatformRole.mockResolvedValue('project_manager');
    hoisted.mockReadSelected.mockReturnValue(null);
    hoisted.mockCreateClient.mockResolvedValue({
      auth: { getUser: hoisted.mockGetUser },
    });

    const res = await GET(new NextRequest('http://localhost/api/projects'));
    expect(res.status).toBe(400);
    const body = await res.json();
    expect(body.error).toContain('Select a client context');
  });

  it('scopes internal list to selected workspace', async () => {
    hoisted.mockResolvePlatformRole.mockResolvedValue('consultant');
    hoisted.mockReadSelected.mockReturnValue('ws-9');
    const spyEq = vi.fn().mockResolvedValue({ data: [{ id: 'p1' }], error: null });
    hoisted.mockCreateClient.mockResolvedValue({
      auth: { getUser: hoisted.mockGetUser },
      from(table: string) {
        expect(table).toBe('projects');
        return {
          select: () => ({
            order: () => ({
              eq: spyEq,
            }),
          }),
        };
      },
    });

    const res = await GET(new NextRequest('http://localhost/api/projects'));
    expect(res.status).toBe(200);
    expect(spyEq).toHaveBeenCalledWith('workspace_id', 'ws-9');
    const body = await res.json();
    expect(body.projects).toHaveLength(1);
  });

  it('scopes customer list to their user_id', async () => {
    const spyEq = vi.fn().mockResolvedValue({ data: [{ id: 'p1' }], error: null });
    hoisted.mockCreateClient.mockResolvedValue({
      auth: { getUser: hoisted.mockGetUser },
      from() {
        return {
          select: () => ({
            order: () => ({
              eq: spyEq,
            }),
          }),
        };
      },
    });

    const res = await GET(new NextRequest('http://localhost/api/projects'));
    expect(res.status).toBe(200);
    expect(spyEq).toHaveBeenCalledWith('user_id', 'cust-1');
  });
});
