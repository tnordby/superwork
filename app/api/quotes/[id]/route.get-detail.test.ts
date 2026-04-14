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

vi.mock('@/lib/quotes/quote-email-notify', () => ({
  notifyCustomerAfterQuoteApproval: vi.fn(),
  notifyCustomerQuoteReadyForReview: vi.fn(),
  notifyQuoteManagersCustomerRejected: vi.fn(),
}));

vi.mock('@/lib/auth/quote-assignee', () => ({
  validateQuoteAssignee: vi.fn().mockResolvedValue({ ok: true }),
}));

vi.mock('@/lib/account/customer-workspace-context', () => ({
  resolveCustomerWorkspaceContext: vi.fn(),
}));

describe('GET /api/quotes/[id] — access control', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    hoisted.mockReadSelected.mockReturnValue(null);
    hoisted.mockResolvePlatformRole.mockResolvedValue('customer');
  });

  it('returns 400 when quote manager has no selected client workspace', async () => {
    hoisted.mockResolvePlatformRole.mockResolvedValue('project_manager');
    hoisted.mockGetUser.mockResolvedValue({
      data: { user: { id: 'pm-1', user_metadata: {} } },
      error: null,
    });
    hoisted.mockCreateClient.mockResolvedValue({
      auth: { getUser: hoisted.mockGetUser },
    });

    const res = await GET(new NextRequest('http://localhost/api/quotes/q1'), {
      params: Promise.resolve({ id: 'q1' }),
    });
    expect(res.status).toBe(400);
    const body = await res.json();
    expect(body.error).toContain('Select a client context');
  });

  it('returns 403 when customer requests another users quote', async () => {
    hoisted.mockGetUser.mockResolvedValue({
      data: { user: { id: 'cust-1', user_metadata: {} } },
      error: null,
    });
    let quotesCalls = 0;
    hoisted.mockCreateClient.mockResolvedValue({
      auth: { getUser: hoisted.mockGetUser },
      from(table: string) {
        if (table === 'quotes') {
          quotesCalls += 1;
          if (quotesCalls === 1) {
            return {
              select: () => ({
                eq: () => ({
                  single: () =>
                    Promise.resolve({
                      data: {
                        id: 'q1',
                        user_id: 'other-cust',
                        project_id: 'p1',
                        title: 'T',
                        service_type: 's',
                      },
                      error: null,
                    }),
                }),
              }),
            };
          }
        }
        return {
          select: () => ({
            eq: () => ({
              order: () => Promise.resolve({ data: [], error: null }),
            }),
          }),
        };
      },
    });

    const res = await GET(new NextRequest('http://localhost/api/quotes/q1'), {
      params: Promise.resolve({ id: 'q1' }),
    });
    expect(res.status).toBe(403);
  });
});
