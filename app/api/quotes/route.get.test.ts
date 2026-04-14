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
  notifyQuoteManagersNewQuoteRequest: vi.fn(),
}));

const custUser = { id: 'cust-1', user_metadata: {} };

function quotesChainResult(rows: unknown[], error: { message: string } | null = null) {
  return {
    select: () => ({
      order: () => ({
        eq: () => Promise.resolve({ data: rows, error }),
        in: () => Promise.resolve({ data: rows, error }),
      }),
    }),
  };
}

describe('GET /api/quotes', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    hoisted.mockReadSelected.mockReturnValue(null);
    hoisted.mockResolvePlatformRole.mockResolvedValue('customer');
    hoisted.mockGetUser.mockResolvedValue({
      data: { user: custUser },
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

    const res = await GET(new NextRequest('http://localhost/api/quotes'));
    expect(res.status).toBe(401);
  });

  it('returns 400 when quote manager has no selected client workspace', async () => {
    hoisted.mockResolvePlatformRole.mockResolvedValue('project_manager');
    hoisted.mockReadSelected.mockReturnValue(null);
    hoisted.mockCreateClient.mockResolvedValue({
      auth: { getUser: hoisted.mockGetUser },
    });

    const res = await GET(new NextRequest('http://localhost/api/quotes'));
    expect(res.status).toBe(400);
    const body = await res.json();
    expect(body.error).toContain('Select a client context');
  });

  it('returns empty list when workspace has no projects', async () => {
    hoisted.mockResolvePlatformRole.mockResolvedValue('project_manager');
    hoisted.mockReadSelected.mockReturnValue('ws-1');
    hoisted.mockCreateClient.mockResolvedValue({
      auth: { getUser: hoisted.mockGetUser },
      from(table: string) {
        expect(table).toBe('projects');
        return {
          select: () => ({
            eq: () => Promise.resolve({ data: [], error: null }),
          }),
        };
      },
    });

    const res = await GET(new NextRequest('http://localhost/api/quotes'));
    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({ quotes: [] });
  });

  it('returns 500 when loading workspace projects fails', async () => {
    hoisted.mockResolvePlatformRole.mockResolvedValue('project_manager');
    hoisted.mockReadSelected.mockReturnValue('ws-1');
    hoisted.mockCreateClient.mockResolvedValue({
      auth: { getUser: hoisted.mockGetUser },
      from(table: string) {
        expect(table).toBe('projects');
        return {
          select: () => ({
            eq: () =>
              Promise.resolve({ data: null, error: { message: 'projects query failed' } }),
          }),
        };
      },
    });

    const res = await GET(new NextRequest('http://localhost/api/quotes'));
    expect(res.status).toBe(500);
  });

  it('strips internal pricing fields for customers', async () => {
    const row = {
      id: 'q1',
      user_id: 'cust-1',
      title: 'T',
      adjusted_hours: 10,
      internal_hourly_rate: 200,
      floor_price: 999,
    };
    hoisted.mockCreateClient.mockResolvedValue({
      auth: { getUser: hoisted.mockGetUser },
      from(table: string) {
        expect(table).toBe('quotes');
        return quotesChainResult([row]);
      },
    });

    const res = await GET(new NextRequest('http://localhost/api/quotes'));
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.quotes).toHaveLength(1);
    expect(body.quotes[0].id).toBe('q1');
    expect(body.quotes[0].adjusted_hours).toBeUndefined();
    expect(body.quotes[0].internal_hourly_rate).toBeUndefined();
    expect(body.quotes[0].floor_price).toBeUndefined();
  });

  it('returns full rows for quote managers', async () => {
    hoisted.mockResolvePlatformRole.mockResolvedValue('project_manager');
    hoisted.mockReadSelected.mockReturnValue('ws-1');
    const row = {
      id: 'q1',
      project_id: 'p1',
      adjusted_hours: 10,
      internal_hourly_rate: 200,
    };
    hoisted.mockCreateClient.mockResolvedValue({
      auth: { getUser: hoisted.mockGetUser },
      from(table: string) {
        if (table === 'projects') {
          return {
            select: () => ({
              eq: () => Promise.resolve({ data: [{ id: 'p1' }], error: null }),
            }),
          };
        }
        if (table === 'quotes') {
          return quotesChainResult([row]);
        }
        throw new Error(`unexpected table ${table}`);
      },
    });

    const res = await GET(new NextRequest('http://localhost/api/quotes'));
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.quotes[0].adjusted_hours).toBe(10);
    expect(body.quotes[0].internal_hourly_rate).toBe(200);
  });
});
