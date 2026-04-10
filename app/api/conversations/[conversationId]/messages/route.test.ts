import { describe, it, expect, vi, beforeEach } from 'vitest';
import { NextRequest } from 'next/server';
import { POST } from './route';

const hoisted = vi.hoisted(() => ({
  mockRequireUser: vi.fn(),
  mockResolvePlatformRole: vi.fn(),
  mockReadSelected: vi.fn(),
  mockNotify: vi.fn(),
  mockAfter: vi.fn((fn: () => void) => {
    fn();
  }),
}));

vi.mock('next/server', async (importOriginal) => {
  const actual = await importOriginal<typeof import('next/server')>();
  return {
    ...actual,
    after: hoisted.mockAfter,
  };
});

vi.mock('@/lib/auth/api', () => ({
  requireAuthenticatedUser: hoisted.mockRequireUser,
}));

vi.mock('@/lib/auth/resolve-platform-role', () => ({
  resolvePlatformRole: hoisted.mockResolvePlatformRole,
}));

vi.mock('@/lib/internal/client-context', () => ({
  readSelectedWorkspaceIdFromRequest: hoisted.mockReadSelected,
}));

vi.mock('@/lib/messaging/notify-new-message', () => ({
  notifyNewInboxMessage: hoisted.mockNotify,
}));

const mockFrom = vi.fn();

vi.mock('@/lib/supabase/server', () => ({
  createClient: vi.fn(async () => ({
    from: mockFrom,
  })),
}));

describe('POST /api/conversations/[conversationId]/messages', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    hoisted.mockReadSelected.mockReturnValue(null);
    hoisted.mockResolvePlatformRole.mockResolvedValue('customer');
    hoisted.mockNotify.mockResolvedValue(undefined);
    hoisted.mockRequireUser.mockResolvedValue({
      user: { id: 'cust-1', email: 'c@test.com', user_metadata: {} },
      errorResponse: null,
    });
    mockFrom.mockImplementation((table: string) => {
      if (table === 'conversations') {
        return {
          select: () => ({
            eq: () => ({
              single: () =>
                Promise.resolve({
                  data: { id: 'conv1', user_id: 'cust-1', project_id: 'p1' },
                  error: null,
                }),
            }),
          }),
          update: () => ({
            eq: () => Promise.resolve({ error: null }),
          }),
        };
      }
      if (table === 'messages') {
        return {
          insert: () => ({
            select: () => ({
              single: () =>
                Promise.resolve({
                  data: {
                    id: 'msg-99',
                    conversation_id: 'conv1',
                    sender_id: 'cust-1',
                    sender_name: 'c@test.com',
                    content: 'Hello',
                    is_from_user: true,
                    read: false,
                    created_at: '2026-01-01T00:00:00Z',
                  },
                  error: null,
                }),
            }),
          }),
        };
      }
      throw new Error(`unexpected table ${table}`);
    });
  });

  it('returns 400 when content is missing', async () => {
    mockFrom.mockClear();
    const req = new NextRequest('http://localhost/api/conversations/conv1/messages', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({}),
    });
    const res = await POST(req, { params: Promise.resolve({ conversationId: 'conv1' }) });
    expect(res.status).toBe(400);
    expect(mockFrom).not.toHaveBeenCalled();
  });

  it('returns 201 and schedules notify with messageId', async () => {
    const req = new NextRequest('http://localhost/api/conversations/conv1/messages', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ content: 'Hello' }),
    });

    const res = await POST(req, { params: Promise.resolve({ conversationId: 'conv1' }) });
    expect(res.status).toBe(201);
    expect(hoisted.mockNotify).toHaveBeenCalledWith(
      expect.objectContaining({
        messageId: 'msg-99',
        conversationId: 'conv1',
        projectId: 'p1',
        preview: 'Hello',
      })
    );
    expect(hoisted.mockAfter).toHaveBeenCalled();
  });
});
