import { describe, it, expect, vi, beforeEach } from 'vitest';
import { NextRequest } from 'next/server';
import { PATCH } from './route';

const hoisted = vi.hoisted(() => ({
  mockGetUser: vi.fn(),
  mockCreateClient: vi.fn(),
  mockResolvePlatformRole: vi.fn(),
  mockReadSelected: vi.fn(),
  mockCustomerContext: vi.fn(),
  mockBudget: vi.fn(),
  mockRpc: vi.fn(),
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

vi.mock('@/lib/account/customer-workspace-context', () => ({
  resolveCustomerWorkspaceContext: hoisted.mockCustomerContext,
}));

vi.mock('@/lib/billing/workspace-budget', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@/lib/billing/workspace-budget')>();
  return {
    ...actual,
    getWorkspaceBudgetSnapshot: hoisted.mockBudget,
  };
});

vi.mock('@/lib/auth/quote-assignee', () => ({
  validateQuoteAssignee: vi.fn().mockResolvedValue({ ok: true }),
}));

function supabaseForCustomerApprove(opts: {
  existing: Record<string, unknown>;
  approved: Record<string, unknown>;
  rpcResult: { data: unknown; error: unknown | null };
}) {
  let quotesFromCalls = 0;
  return {
    auth: {
      getUser: hoisted.mockGetUser,
    },
    from(table: string) {
      if (table !== 'quotes') {
        throw new Error(`unexpected table ${table}`);
      }
      quotesFromCalls += 1;
      if (quotesFromCalls === 1) {
        return {
          select: () => ({
            eq: () => ({
              single: () => Promise.resolve({ data: opts.existing, error: null }),
            }),
          }),
        };
      }
      if (quotesFromCalls === 2) {
        return {
          update: () => ({
            eq: () => ({
              select: () => ({
                single: () => Promise.resolve({ data: opts.approved, error: null }),
              }),
            }),
          }),
        };
      }
      return {
        update: () => ({
          eq: () => Promise.resolve({ data: null, error: null }),
        }),
      };
    },
    rpc: hoisted.mockRpc.mockResolvedValue(opts.rpcResult),
  };
}

const baseQuote = {
  id: 'quote-1',
  user_id: 'cust-1',
  status: 'pending_customer_approval',
  project_id: 'proj-1',
  final_price: 150,
  estimated_price: null,
  assignment_locked: false,
};

describe('PATCH /api/quotes/[id] — customer approval → project', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    hoisted.mockReadSelected.mockReturnValue(null);
    hoisted.mockResolvePlatformRole.mockResolvedValue('customer');
    hoisted.mockGetUser.mockResolvedValue({
      data: { user: { id: 'cust-1', user_metadata: {} } },
      error: null,
    });
    hoisted.mockCustomerContext.mockResolvedValue({
      workspace: { id: 'ws-1', owner_id: 'cust-1', name: 'Acme' },
      actorRole: 'owner' as const,
      isOwner: true,
      canManageMembers: true,
      admin: {} as import('@supabase/supabase-js').SupabaseClient,
    });
    hoisted.mockBudget.mockResolvedValue({
      currency: 'usd',
      totalPurchasedCents: 1_000_000,
      usedCents: 0,
      committedCents: 0,
      availableCents: 900_000,
    });
  });

  it('returns 200 and calls create_project_from_quote when customer approves', async () => {
    const approved = {
      ...baseQuote,
      status: 'approved',
      approved_at: '2026-01-01T00:00:00.000Z',
      approved_by_user_id: 'cust-1',
      assignment_locked: true,
    };
    hoisted.mockCreateClient.mockResolvedValue(
      supabaseForCustomerApprove({
        existing: baseQuote,
        approved,
        rpcResult: { data: 'new-project-id', error: null },
      })
    );

    const request = new NextRequest('http://localhost/api/quotes/quote-1', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ status: 'approved' }),
    });

    const res = await PATCH(request, { params: Promise.resolve({ id: 'quote-1' }) });
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.quote.status).toBe('approved');
    expect(hoisted.mockRpc).toHaveBeenCalledWith('create_project_from_quote', {
      quote_id_param: 'quote-1',
    });
  });

  it('returns 500 and reverts quote when create_project_from_quote fails', async () => {
    const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
    const approved = {
      ...baseQuote,
      status: 'approved',
      approved_at: '2026-01-01T00:00:00.000Z',
      approved_by_user_id: 'cust-1',
      assignment_locked: true,
    };
    hoisted.mockCreateClient.mockResolvedValue(
      supabaseForCustomerApprove({
        existing: baseQuote,
        approved,
        rpcResult: { data: null, error: { message: 'budget constraint violated' } },
      })
    );

    const request = new NextRequest('http://localhost/api/quotes/quote-1', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ status: 'approved' }),
    });

    try {
      const res = await PATCH(request, { params: Promise.resolve({ id: 'quote-1' }) });
      expect(res.status).toBe(500);
      const body = await res.json();
      expect(body.error).toContain('budget constraint');
      expect(hoisted.mockRpc).toHaveBeenCalledWith('create_project_from_quote', {
        quote_id_param: 'quote-1',
      });
    } finally {
      consoleSpy.mockRestore();
    }
  });

  it('returns 400 when workspace balance is insufficient for the quoted amount', async () => {
    hoisted.mockBudget.mockResolvedValue({
      currency: 'usd',
      totalPurchasedCents: 100,
      usedCents: 0,
      committedCents: 0,
      availableCents: 100,
    });

    hoisted.mockCreateClient.mockResolvedValue(
      supabaseForCustomerApprove({
        existing: baseQuote,
        approved: baseQuote,
        rpcResult: { data: null, error: null },
      })
    );

    const request = new NextRequest('http://localhost/api/quotes/quote-1', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ status: 'approved' }),
    });

    const res = await PATCH(request, { params: Promise.resolve({ id: 'quote-1' }) });
    expect(res.status).toBe(400);
    const body = await res.json();
    expect(body.error).toContain('Insufficient balance');
    expect(hoisted.mockRpc).not.toHaveBeenCalled();
  });
});
