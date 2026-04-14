import { describe, it, expect, vi, beforeEach } from 'vitest';
import { NextRequest } from 'next/server';
import { GET, PATCH } from './route';

const hoisted = vi.hoisted(() => ({
  mockCreateClient: vi.fn(),
}));

vi.mock('@/lib/supabase/server', () => ({
  createClient: hoisted.mockCreateClient,
}));

const testUser = { id: 'user-1', email: 'a@example.com' };

function supabaseWithProfile(opts: {
  user: typeof testUser | null;
  profileRow: { first_name: string | null; last_name: string | null } | null;
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
        update: (payload: { first_name: string | null; last_name: string | null }) => ({
          eq: () => {
            expect(payload).toBeDefined();
            return Promise.resolve({ error: opts.updateError ?? null });
          },
        }),
      };
    },
  };
}

describe('GET /api/account/profile', () => {
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

  it('returns names and email from profile and session', async () => {
    hoisted.mockCreateClient.mockResolvedValue(
      supabaseWithProfile({
        user: testUser,
        profileRow: { first_name: 'Ada', last_name: 'Lovelace' },
      })
    );

    const res = await GET();
    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({
      email: 'a@example.com',
      firstName: 'Ada',
      lastName: 'Lovelace',
    });
  });

  it('returns empty strings when profile row is missing', async () => {
    hoisted.mockCreateClient.mockResolvedValue(
      supabaseWithProfile({
        user: testUser,
        profileRow: null,
      })
    );

    const res = await GET();
    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({
      email: 'a@example.com',
      firstName: '',
      lastName: '',
    });
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

describe('PATCH /api/account/profile', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('returns 401 when not authenticated', async () => {
    hoisted.mockCreateClient.mockResolvedValue(
      supabaseWithProfile({ user: null, profileRow: null })
    );

    const res = await PATCH(
      new NextRequest('http://localhost/api/account/profile', {
        method: 'PATCH',
        body: JSON.stringify({ firstName: 'A', lastName: 'B' }),
      })
    );
    expect(res.status).toBe(401);
  });

  it('returns 400 for invalid JSON', async () => {
    hoisted.mockCreateClient.mockResolvedValue(
      supabaseWithProfile({ user: testUser, profileRow: { first_name: null, last_name: null } })
    );

    const res = await PATCH(
      new NextRequest('http://localhost/api/account/profile', {
        method: 'PATCH',
        body: 'not-json',
      })
    );
    expect(res.status).toBe(400);
  });

  it('returns 400 when firstName is not a string', async () => {
    hoisted.mockCreateClient.mockResolvedValue(
      supabaseWithProfile({ user: testUser, profileRow: { first_name: null, last_name: null } })
    );

    const res = await PATCH(
      new NextRequest('http://localhost/api/account/profile', {
        method: 'PATCH',
        body: JSON.stringify({ firstName: 1, lastName: 'B' }),
      })
    );
    expect(res.status).toBe(400);
  });

  it('truncates and trims names', async () => {
    const capture: { row?: { first_name: string | null; last_name: string | null } } = {};
    hoisted.mockCreateClient.mockResolvedValue({
      auth: {
        getUser: () =>
          Promise.resolve({
            data: { user: testUser },
            error: null,
          }),
      },
      from(table: string) {
        expect(table).toBe('profiles');
        return {
          update: (payload: { first_name: string | null; last_name: string | null }) => {
            capture.row = payload;
            return {
              eq: () => Promise.resolve({ error: null }),
            };
          },
        };
      },
    });

    const long = 'x'.repeat(200);
    const res = await PATCH(
      new NextRequest('http://localhost/api/account/profile', {
        method: 'PATCH',
        body: JSON.stringify({ firstName: `  ${long}  `, lastName: '  Y  ' }),
      })
    );
    expect(res.status).toBe(200);
    expect(capture.row?.first_name?.length).toBe(120);
    expect(capture.row?.last_name).toBe('Y');
  });

  it('stores null for blank names', async () => {
    const capture: { row?: { first_name: string | null; last_name: string | null } } = {};
    hoisted.mockCreateClient.mockResolvedValue({
      auth: {
        getUser: () =>
          Promise.resolve({
            data: { user: testUser },
            error: null,
          }),
      },
      from() {
        return {
          update: (payload: { first_name: string | null; last_name: string | null }) => {
            capture.row = payload;
            return {
              eq: () => Promise.resolve({ error: null }),
            };
          },
        };
      },
    });

    const res = await PATCH(
      new NextRequest('http://localhost/api/account/profile', {
        method: 'PATCH',
        body: JSON.stringify({ firstName: '   ', lastName: '' }),
      })
    );
    expect(res.status).toBe(200);
    expect(capture.row).toEqual({ first_name: null, last_name: null });
  });

  it('returns 500 when update fails', async () => {
    hoisted.mockCreateClient.mockResolvedValue(
      supabaseWithProfile({
        user: testUser,
        profileRow: { first_name: null, last_name: null },
        updateError: { message: 'rls' },
      })
    );

    const res = await PATCH(
      new NextRequest('http://localhost/api/account/profile', {
        method: 'PATCH',
        body: JSON.stringify({ firstName: 'A', lastName: 'B' }),
      })
    );
    expect(res.status).toBe(500);
  });
});
