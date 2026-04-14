import { describe, it, expect, vi, beforeEach } from 'vitest';
import { NextRequest } from 'next/server';
import * as quoteNotify from '@/lib/quotes/quote-email-notify';
import { POST } from './route';

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
  notifyQuoteManagersNewQuoteRequest: vi.fn(),
}));

const testUser = { id: 'cust-1', user_metadata: {} };

function supabaseForCustomerCreateQuote(opts: {
  quoteRow: { id: string; title: string };
  profileRow: Record<string, unknown> | null;
}) {
  return {
    auth: {
      getUser: hoisted.mockGetUser,
    },
    from(table: string) {
      if (table === 'profiles') {
        return {
          select: () => ({
            eq: () => ({
              maybeSingle: () =>
                Promise.resolve({
                  data: opts.profileRow,
                  error: null,
                }),
            }),
          }),
        };
      }
      if (table === 'quotes') {
        return {
          insert: () => ({
            select: () => ({
              single: () =>
                Promise.resolve({
                  data: opts.quoteRow,
                  error: null,
                }),
            }),
          }),
        };
      }
      throw new Error(`unexpected table ${table}`);
    },
  };
}

describe('POST /api/quotes', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    hoisted.mockReadSelected.mockReturnValue(null);
    hoisted.mockResolvePlatformRole.mockResolvedValue('customer');
    hoisted.mockGetUser.mockResolvedValue({
      data: { user: testUser },
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

    const res = await POST(
      new NextRequest('http://localhost/api/quotes', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: 'T',
          category: 'c',
          service_type: 's',
        }),
      })
    );
    expect(res.status).toBe(401);
    expect(quoteNotify.notifyQuoteManagersNewQuoteRequest).not.toHaveBeenCalled();
  });

  it('returns 400 when required fields are missing', async () => {
    hoisted.mockCreateClient.mockResolvedValue({
      auth: { getUser: hoisted.mockGetUser },
    });

    const res = await POST(
      new NextRequest('http://localhost/api/quotes', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ title: 'Only title' }),
      })
    );
    expect(res.status).toBe(400);
    expect(quoteNotify.notifyQuoteManagersNewQuoteRequest).not.toHaveBeenCalled();
  });

  it('returns 201 and schedules notifyQuoteManagersNewQuoteRequest', async () => {
    hoisted.mockCreateClient.mockResolvedValue(
      supabaseForCustomerCreateQuote({
        quoteRow: { id: 'quote-new', title: 'Website' },
        profileRow: {
          first_name: 'Ada',
          last_name: 'Lovelace',
          email: 'ada@example.com',
          company_name: 'ACME',
        },
      })
    );

    const res = await POST(
      new NextRequest('http://localhost/api/quotes', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: 'Website',
          category: 'build',
          service_type: 'implementation',
        }),
      })
    );

    expect(res.status).toBe(201);
    const body = await res.json();
    expect(body.quote.id).toBe('quote-new');
    expect(quoteNotify.notifyQuoteManagersNewQuoteRequest).toHaveBeenCalledWith({
      quoteId: 'quote-new',
      quoteTitle: 'Website',
      submittedByUserId: 'cust-1',
    });
  });
});
