import { describe, it, expect, vi, beforeEach } from 'vitest';
import { NextRequest } from 'next/server';
import * as quoteNotify from '@/lib/quotes/quote-email-notify';
import { DELETE, POST } from './route';

const hoisted = vi.hoisted(() => ({
  mockGetUser: vi.fn(),
  mockCreateClient: vi.fn(),
  mockResolvePlatformRole: vi.fn(),
  mockReadSelected: vi.fn(),
  mockValidateAssignee: vi.fn(),
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

vi.mock('@/lib/auth/quote-assignee', () => ({
  validateQuoteAssignee: hoisted.mockValidateAssignee,
}));

vi.mock('@/lib/quotes/quote-email-notify', () => ({
  notifyQuoteAssignee: vi.fn(),
}));

const pmUser = { id: 'pm-1', user_metadata: { role: 'project_manager' } };

function supabaseAssignPostSuccess(opts: {
  quote: Record<string, unknown>;
  updatedQuote: Record<string, unknown>;
  projectWorkspaceId?: string;
}) {
  let quotesCalls = 0;
  const ws = opts.projectWorkspaceId ?? 'ws-1';
  return {
    auth: {
      getUser: hoisted.mockGetUser,
    },
    from(table: string) {
      if (table === 'projects') {
        return {
          select: () => ({
            eq: () => ({
              maybeSingle: () =>
                Promise.resolve({ data: { workspace_id: ws }, error: null }),
            }),
          }),
        };
      }
      if (table !== 'quotes') {
        throw new Error(`unexpected table ${table}`);
      }
      quotesCalls += 1;
      if (quotesCalls === 1) {
        return {
          select: () => ({
            eq: () => ({
              single: () => Promise.resolve({ data: opts.quote, error: null }),
            }),
          }),
        };
      }
      return {
        update: () => ({
          eq: () => ({
            select: () => ({
              single: () => Promise.resolve({ data: opts.updatedQuote, error: null }),
            }),
          }),
        }),
      };
    },
  };
}

function req(body: Record<string, unknown>) {
  return new NextRequest('http://localhost/api/quotes/q1/assign', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
}

describe('POST /api/quotes/[id]/assign', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    hoisted.mockReadSelected.mockReturnValue('ws-1');
    hoisted.mockResolvePlatformRole.mockResolvedValue('project_manager');
    hoisted.mockGetUser.mockResolvedValue({
      data: { user: pmUser },
      error: null,
    });
    hoisted.mockValidateAssignee.mockResolvedValue({ ok: true });
  });

  it('returns 401 when not authenticated', async () => {
    hoisted.mockGetUser.mockResolvedValue({
      data: { user: null },
      error: new Error('no session'),
    });
    hoisted.mockCreateClient.mockResolvedValue({
      auth: { getUser: hoisted.mockGetUser },
    });

    const res = await POST(req({ user_id: 'c1' }), {
      params: Promise.resolve({ id: 'q1' }),
    });
    expect(res.status).toBe(401);
    expect(quoteNotify.notifyQuoteAssignee).not.toHaveBeenCalled();
  });

  it('returns 403 for customer role', async () => {
    hoisted.mockResolvePlatformRole.mockResolvedValue('customer');
    hoisted.mockCreateClient.mockResolvedValue({
      auth: { getUser: hoisted.mockGetUser },
    });

    const res = await POST(req({ user_id: 'c1' }), {
      params: Promise.resolve({ id: 'q1' }),
    });
    expect(res.status).toBe(403);
    expect(quoteNotify.notifyQuoteAssignee).not.toHaveBeenCalled();
  });

  it('returns 400 when internal staff has no selected client workspace', async () => {
    hoisted.mockReadSelected.mockReturnValue(null);
    hoisted.mockCreateClient.mockResolvedValue({
      auth: { getUser: hoisted.mockGetUser },
    });

    const res = await POST(req({ user_id: 'c1' }), {
      params: Promise.resolve({ id: 'q1' }),
    });
    expect(res.status).toBe(400);
    expect(quoteNotify.notifyQuoteAssignee).not.toHaveBeenCalled();
  });

  it('returns 400 when user_id is missing', async () => {
    hoisted.mockCreateClient.mockResolvedValue({
      auth: { getUser: hoisted.mockGetUser },
    });

    const res = await POST(req({}), { params: Promise.resolve({ id: 'q1' }) });
    expect(res.status).toBe(400);
    expect(quoteNotify.notifyQuoteAssignee).not.toHaveBeenCalled();
  });

  it('returns 400 when assignee validation fails', async () => {
    hoisted.mockValidateAssignee.mockResolvedValue({
      ok: false,
      reason: 'Not an internal consultant',
    });
    hoisted.mockCreateClient.mockResolvedValue({
      auth: { getUser: hoisted.mockGetUser },
    });

    const res = await POST(req({ user_id: 'bad' }), {
      params: Promise.resolve({ id: 'q1' }),
    });
    expect(res.status).toBe(400);
    expect(quoteNotify.notifyQuoteAssignee).not.toHaveBeenCalled();
  });

  it('returns 404 when quote is missing', async () => {
    hoisted.mockCreateClient.mockResolvedValue({
      auth: { getUser: hoisted.mockGetUser },
      from(table: string) {
        expect(table).toBe('quotes');
        return {
          select: () => ({
            eq: () => ({
              single: () =>
                Promise.resolve({ data: null, error: { message: 'not found' } }),
            }),
          }),
        };
      },
    });

    const res = await POST(req({ user_id: 'consultant-1' }), {
      params: Promise.resolve({ id: 'missing' }),
    });
    expect(res.status).toBe(404);
    expect(quoteNotify.notifyQuoteAssignee).not.toHaveBeenCalled();
  });

  it('returns 403 when quote project is outside selected workspace', async () => {
    hoisted.mockCreateClient.mockResolvedValue(
      supabaseAssignPostSuccess({
        quote: {
          id: 'q1',
          project_id: 'p1',
          assignment_locked: false,
          title: 'T',
        },
        updatedQuote: {},
        projectWorkspaceId: 'other-ws',
      })
    );

    const res = await POST(req({ user_id: 'consultant-1' }), {
      params: Promise.resolve({ id: 'q1' }),
    });
    expect(res.status).toBe(403);
    expect(quoteNotify.notifyQuoteAssignee).not.toHaveBeenCalled();
  });

  it('returns 400 when assignment is locked', async () => {
    hoisted.mockCreateClient.mockResolvedValue(
      supabaseAssignPostSuccess({
        quote: {
          id: 'q1',
          project_id: 'p1',
          assignment_locked: true,
          title: 'T',
        },
        updatedQuote: {},
      })
    );

    const res = await POST(req({ user_id: 'consultant-1' }), {
      params: Promise.resolve({ id: 'q1' }),
    });
    expect(res.status).toBe(400);
    expect(quoteNotify.notifyQuoteAssignee).not.toHaveBeenCalled();
  });

  it('returns 200 and calls notifyQuoteAssignee on success', async () => {
    const updated = {
      id: 'q1',
      title: 'Website',
      assigned_lead_user_id: 'consultant-1',
    };
    hoisted.mockCreateClient.mockResolvedValue(
      supabaseAssignPostSuccess({
        quote: {
          id: 'q1',
          project_id: 'p1',
          assignment_locked: false,
          title: 'Website',
        },
        updatedQuote: updated,
      })
    );

    const res = await POST(req({ user_id: 'consultant-1' }), {
      params: Promise.resolve({ id: 'q1' }),
    });
    expect(res.status).toBe(200);
    expect(quoteNotify.notifyQuoteAssignee).toHaveBeenCalledWith({
      quoteId: 'q1',
      quoteTitle: 'Website',
      assigneeUserId: 'consultant-1',
    });
  });
});

function supabaseAssignDeleteFlow(opts: {
  quote: Record<string, unknown>;
  updatedQuote: Record<string, unknown>;
  projectWorkspaceId?: string;
}) {
  let quotesCalls = 0;
  const ws = opts.projectWorkspaceId ?? 'ws-1';
  return {
    auth: {
      getUser: hoisted.mockGetUser,
    },
    from(table: string) {
      if (table === 'projects') {
        return {
          select: () => ({
            eq: () => ({
              maybeSingle: () =>
                Promise.resolve({ data: { workspace_id: ws }, error: null }),
            }),
          }),
        };
      }
      if (table !== 'quotes') {
        throw new Error(`unexpected table ${table}`);
      }
      quotesCalls += 1;
      if (quotesCalls === 1) {
        return {
          select: () => ({
            eq: () => ({
              single: () => Promise.resolve({ data: opts.quote, error: null }),
            }),
          }),
        };
      }
      return {
        update: () => ({
          eq: () => ({
            select: () => ({
              single: () => Promise.resolve({ data: opts.updatedQuote, error: null }),
            }),
          }),
        }),
      };
    },
  };
}

describe('DELETE /api/quotes/[id]/assign', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    hoisted.mockReadSelected.mockReturnValue('ws-1');
    hoisted.mockResolvePlatformRole.mockResolvedValue('project_manager');
    hoisted.mockGetUser.mockResolvedValue({
      data: { user: pmUser },
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

    const res = await DELETE(new NextRequest('http://localhost/api/quotes/q1/assign'), {
      params: Promise.resolve({ id: 'q1' }),
    });
    expect(res.status).toBe(401);
  });

  it('returns 400 when internal staff has no selected client workspace', async () => {
    hoisted.mockReadSelected.mockReturnValue(null);
    hoisted.mockCreateClient.mockResolvedValue({
      auth: { getUser: hoisted.mockGetUser },
    });

    const res = await DELETE(new NextRequest('http://localhost/api/quotes/q1/assign'), {
      params: Promise.resolve({ id: 'q1' }),
    });
    expect(res.status).toBe(400);
  });

  it('returns 200 and clears assignment when allowed', async () => {
    const updated = {
      id: 'q1',
      title: 'Website',
      assigned_lead_user_id: null,
    };
    hoisted.mockCreateClient.mockResolvedValue(
      supabaseAssignDeleteFlow({
        quote: {
          id: 'q1',
          project_id: 'p1',
          assignment_locked: false,
          title: 'Website',
        },
        updatedQuote: updated,
      })
    );

    const res = await DELETE(new NextRequest('http://localhost/api/quotes/q1/assign'), {
      params: Promise.resolve({ id: 'q1' }),
    });
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.quote.assigned_lead_user_id).toBeNull();
  });
});
