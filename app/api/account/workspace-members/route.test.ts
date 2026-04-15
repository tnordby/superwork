import { beforeEach, describe, expect, it, vi } from 'vitest';
import { GET } from './route';

const hoisted = vi.hoisted(() => ({
  mockCreateClient: vi.fn(),
  mockResolveCustomerWorkspaceContext: vi.fn(),
}));

vi.mock('@/lib/supabase/server', () => ({
  createClient: hoisted.mockCreateClient,
}));

vi.mock('@/lib/account/customer-workspace-context', () => ({
  resolveCustomerWorkspaceContext: hoisted.mockResolveCustomerWorkspaceContext,
}));

describe('GET /api/account/workspace-members', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('returns 401 when unauthenticated', async () => {
    hoisted.mockCreateClient.mockResolvedValue({
      auth: {
        getUser: () =>
          Promise.resolve({
            data: { user: null },
            error: new Error('no session'),
          }),
      },
    });

    const res = await GET();
    expect(res.status).toBe(401);
  });

  it('returns members with profile names from separate profile lookup', async () => {
    hoisted.mockCreateClient.mockResolvedValue({
      auth: {
        getUser: () =>
          Promise.resolve({
            data: { user: { id: 'user-1' } },
            error: null,
          }),
      },
    });

    const workspaceMembers = [
      {
        user_id: 'u-1',
        role: 'admin',
        invited_at: '2026-01-01T00:00:00.000Z',
        accepted_at: '2026-01-02T00:00:00.000Z',
      },
      {
        user_id: 'u-2',
        role: 'member',
        invited_at: '2026-01-03T00:00:00.000Z',
        accepted_at: null,
      },
    ];

    const admin = {
      from(table: string) {
        if (table === 'workspace_members') {
          return {
            select: (query: string) => {
              expect(query).toBe('user_id, role, invited_at, accepted_at');
              return {
                eq: () => ({
                  order: () =>
                    Promise.resolve({
                      data: workspaceMembers,
                      error: null,
                    }),
                }),
              };
            },
          };
        }
        if (table === 'profiles') {
          return {
            select: (query: string) => {
              expect(query).toBe('id, first_name, last_name, email');
              return {
                in: (_column: string, ids: string[]) => {
                  expect(ids).toEqual(['u-1', 'u-2']);
                  return Promise.resolve({
                    data: [
                      { id: 'u-1', first_name: 'Ada', last_name: 'Lovelace', email: 'ada@example.com' },
                      { id: 'u-2', first_name: null, last_name: null, email: 'member@example.com' },
                    ],
                    error: null,
                  });
                },
              };
            },
          };
        }
        throw new Error(`Unexpected table: ${table}`);
      },
    };

    hoisted.mockResolveCustomerWorkspaceContext.mockResolvedValue({
      workspace: { id: 'ws-1', owner_id: 'owner-1', name: 'Workspace One' },
      actorRole: 'owner',
      isOwner: true,
      canManageMembers: true,
      admin,
    });

    const res = await GET();
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.members).toEqual([
      {
        user_id: 'u-1',
        role: 'admin',
        invited_at: '2026-01-01T00:00:00.000Z',
        accepted_at: '2026-01-02T00:00:00.000Z',
        name: 'Ada Lovelace',
        email: 'ada@example.com',
      },
      {
        user_id: 'u-2',
        role: 'member',
        invited_at: '2026-01-03T00:00:00.000Z',
        accepted_at: null,
        name: 'member@example.com',
        email: 'member@example.com',
      },
    ]);
  });

  it('returns 500 when profile lookup fails', async () => {
    hoisted.mockCreateClient.mockResolvedValue({
      auth: {
        getUser: () =>
          Promise.resolve({
            data: { user: { id: 'user-1' } },
            error: null,
          }),
      },
    });

    const admin = {
      from(table: string) {
        if (table === 'workspace_members') {
          return {
            select: () => ({
              eq: () => ({
                order: () =>
                  Promise.resolve({
                    data: [
                      {
                        user_id: 'u-1',
                        role: 'admin',
                        invited_at: '2026-01-01T00:00:00.000Z',
                        accepted_at: null,
                      },
                    ],
                    error: null,
                  }),
              }),
            }),
          };
        }
        if (table === 'profiles') {
          return {
            select: () => ({
              in: () =>
                Promise.resolve({
                  data: null,
                  error: { message: 'profiles unavailable' },
                }),
            }),
          };
        }
        throw new Error(`Unexpected table: ${table}`);
      },
    };

    hoisted.mockResolveCustomerWorkspaceContext.mockResolvedValue({
      workspace: { id: 'ws-1', owner_id: 'owner-1', name: 'Workspace One' },
      actorRole: 'owner',
      isOwner: true,
      canManageMembers: true,
      admin,
    });

    const res = await GET();
    expect(res.status).toBe(500);
    const body = await res.json();
    expect(body.error).toBe('profiles unavailable');
  });
});
