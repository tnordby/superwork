import { describe, it, expect, vi, beforeEach } from 'vitest';
import { NextRequest } from 'next/server';
import { GET, PATCH } from './route';

const hoisted = vi.hoisted(() => ({
  mockCreateClient: vi.fn(),
}));

vi.mock('@/lib/supabase/server', () => ({
  createClient: hoisted.mockCreateClient,
}));

const testUser = { id: 'user-1' };

function supabaseWithProfile(opts: {
  user: typeof testUser | null;
  profileRow: { email_notify_inbox_messages: boolean | null } | null;
  profileError?: { message: string } | null;
  updateError?: { message: string } | null;
}) {
  return {
    auth: {
      getUser: () =>
        Promise.resolve({
          data: { user: opts.user },
          error: opts.user ? null : new Error('no session'),
        }),
    },
    from(table: string) {
      expect(table).toBe('profiles');
      return {
        select: () => ({
          eq: () => ({
            maybeSingle: () =>
              Promise.resolve({
                data: opts.profileRow,
                error: opts.profileError ?? null,
              }),
          }),
        }),
        update: (payload: { email_notify_inbox_messages: boolean }) => ({
          eq: () => {
            expect(payload).toBeDefined();
            return Promise.resolve({ error: opts.updateError ?? null });
          },
        }),
      };
    },
  };
}

describe('GET /api/account/notification-preferences', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('returns 401 when not authenticated', async () => {
    hoisted.mockCreateClient.mockResolvedValue(
      supabaseWithProfile({ user: null, profileRow: null })
    );

    const res = await GET();
    expect(res.status).toBe(401);
  });

  it('returns emailNotifyInboxMessages true when column is true', async () => {
    hoisted.mockCreateClient.mockResolvedValue(
      supabaseWithProfile({
        user: testUser,
        profileRow: { email_notify_inbox_messages: true },
      })
    );

    const res = await GET();
    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({ emailNotifyInboxMessages: true });
  });

  it('returns emailNotifyInboxMessages false when column is false', async () => {
    hoisted.mockCreateClient.mockResolvedValue(
      supabaseWithProfile({
        user: testUser,
        profileRow: { email_notify_inbox_messages: false },
      })
    );

    const res = await GET();
    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({ emailNotifyInboxMessages: false });
  });

  it('treats null profile row as opted in', async () => {
    hoisted.mockCreateClient.mockResolvedValue(
      supabaseWithProfile({
        user: testUser,
        profileRow: null,
      })
    );

    const res = await GET();
    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({ emailNotifyInboxMessages: true });
  });

  it('returns 500 when profile query fails', async () => {
    hoisted.mockCreateClient.mockResolvedValue(
      supabaseWithProfile({
        user: testUser,
        profileRow: null,
        profileError: { message: 'db down' },
      })
    );

    const res = await GET();
    expect(res.status).toBe(500);
  });
});

describe('PATCH /api/account/notification-preferences', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('returns 401 when not authenticated', async () => {
    hoisted.mockCreateClient.mockResolvedValue(
      supabaseWithProfile({ user: null, profileRow: null })
    );

    const res = await PATCH(
      new NextRequest('http://localhost/api/account/notification-preferences', {
        method: 'PATCH',
        body: JSON.stringify({ emailNotifyInboxMessages: false }),
      })
    );
    expect(res.status).toBe(401);
  });

  it('returns 400 for invalid JSON', async () => {
    hoisted.mockCreateClient.mockResolvedValue(
      supabaseWithProfile({ user: testUser, profileRow: { email_notify_inbox_messages: true } })
    );

    const res = await PATCH(
      new NextRequest('http://localhost/api/account/notification-preferences', {
        method: 'PATCH',
        body: 'not-json',
      })
    );
    expect(res.status).toBe(400);
  });

  it('returns 400 when emailNotifyInboxMessages is not a boolean', async () => {
    hoisted.mockCreateClient.mockResolvedValue(
      supabaseWithProfile({ user: testUser, profileRow: { email_notify_inbox_messages: true } })
    );

    const res = await PATCH(
      new NextRequest('http://localhost/api/account/notification-preferences', {
        method: 'PATCH',
        body: JSON.stringify({ emailNotifyInboxMessages: 'yes' }),
      })
    );
    expect(res.status).toBe(400);
  });

  it('returns 200 and echoes value on success', async () => {
    hoisted.mockCreateClient.mockResolvedValue(
      supabaseWithProfile({ user: testUser, profileRow: { email_notify_inbox_messages: true } })
    );

    const res = await PATCH(
      new NextRequest('http://localhost/api/account/notification-preferences', {
        method: 'PATCH',
        body: JSON.stringify({ emailNotifyInboxMessages: false }),
      })
    );
    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({ emailNotifyInboxMessages: false });
  });

  it('returns 500 when update fails', async () => {
    hoisted.mockCreateClient.mockResolvedValue(
      supabaseWithProfile({
        user: testUser,
        profileRow: { email_notify_inbox_messages: true },
        updateError: { message: 'rls' },
      })
    );

    const res = await PATCH(
      new NextRequest('http://localhost/api/account/notification-preferences', {
        method: 'PATCH',
        body: JSON.stringify({ emailNotifyInboxMessages: true }),
      })
    );
    expect(res.status).toBe(500);
  });
});
