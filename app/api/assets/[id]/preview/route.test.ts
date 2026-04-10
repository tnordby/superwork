import { describe, it, expect, vi, beforeEach } from 'vitest';
import { NextRequest } from 'next/server';
import { GET } from './route';

const hoisted = vi.hoisted(() => ({
  mockGetUser: vi.fn(),
  mockCreateClient: vi.fn(),
  mockCreateSignedUrl: vi.fn(),
}));

vi.mock('@/lib/supabase/server', () => ({
  createClient: hoisted.mockCreateClient,
}));

function buildSupabaseForPreview(opts: {
  asset: { storage_path: string; file_type: string; workspace_id: string | null } | null;
  assetError?: unknown;
}) {
  return {
    auth: {
      getUser: hoisted.mockGetUser,
    },
    from(table: string) {
      if (table !== 'assets') throw new Error(table);
      return {
        select: () => ({
          eq: () => ({
            single: () =>
              Promise.resolve({
                data: opts.asset,
                error: opts.assetError ?? (opts.asset ? null : { message: 'not found' }),
              }),
          }),
        }),
      };
    },
    storage: {
      from: () => ({
        createSignedUrl: hoisted.mockCreateSignedUrl,
      }),
    },
  };
}

describe('GET /api/assets/[id]/preview', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('returns 401 when not authenticated', async () => {
    hoisted.mockCreateClient.mockResolvedValue(
      buildSupabaseForPreview({
        asset: { storage_path: 'p', file_type: 'image', workspace_id: 'ws' },
      })
    );
    hoisted.mockGetUser.mockResolvedValue({ data: { user: null }, error: new Error('no') });

    const res = await GET(new NextRequest('http://localhost/api/assets/x/preview'), {
      params: Promise.resolve({ id: 'a1' }),
    });
    expect(res.status).toBe(401);
  });

  it('returns 404 when asset row is missing', async () => {
    hoisted.mockCreateClient.mockResolvedValue(buildSupabaseForPreview({ asset: null }));
    hoisted.mockGetUser.mockResolvedValue({
      data: { user: { id: 'u1', user_metadata: {} } },
      error: null,
    });

    const res = await GET(new NextRequest('http://localhost/api/assets/x/preview'), {
      params: Promise.resolve({ id: 'missing' }),
    });
    expect(res.status).toBe(404);
  });

  it('returns 400 when file is not an image', async () => {
    hoisted.mockCreateClient.mockResolvedValue(
      buildSupabaseForPreview({
        asset: { storage_path: 'w/doc.pdf', file_type: 'pdf', workspace_id: 'ws' },
      })
    );
    hoisted.mockGetUser.mockResolvedValue({
      data: { user: { id: 'u1', user_metadata: {} } },
      error: null,
    });

    const res = await GET(new NextRequest('http://localhost/api/assets/x/preview'), {
      params: Promise.resolve({ id: 'a1' }),
    });
    expect(res.status).toBe(400);
    expect(hoisted.mockCreateSignedUrl).not.toHaveBeenCalled();
  });

  it('returns 500 when signed URL generation fails', async () => {
    hoisted.mockCreateClient.mockResolvedValue(
      buildSupabaseForPreview({
        asset: { storage_path: 'w/f.png', file_type: 'image', workspace_id: 'ws' },
      })
    );
    hoisted.mockGetUser.mockResolvedValue({
      data: { user: { id: 'u1', user_metadata: {} } },
      error: null,
    });
    hoisted.mockCreateSignedUrl.mockResolvedValue({
      data: null,
      error: { message: 'policy denied' },
    });

    const res = await GET(new NextRequest('http://localhost/api/assets/x/preview'), {
      params: Promise.resolve({ id: 'a1' }),
    });
    expect(res.status).toBe(500);
    const body = await res.json();
    expect(body.error).toBe('Failed to generate preview URL');
  });

  it('returns 200 with preview_url when signed URL succeeds', async () => {
    hoisted.mockCreateClient.mockResolvedValue(
      buildSupabaseForPreview({
        asset: { storage_path: 'w/f.png', file_type: 'image', workspace_id: 'ws' },
      })
    );
    hoisted.mockGetUser.mockResolvedValue({
      data: { user: { id: 'u1', user_metadata: {} } },
      error: null,
    });
    hoisted.mockCreateSignedUrl.mockResolvedValue({
      data: { signedUrl: 'https://example.com/signed' },
      error: null,
    });

    const res = await GET(new NextRequest('http://localhost/api/assets/x/preview'), {
      params: Promise.resolve({ id: 'a1' }),
    });
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.preview_url).toBe('https://example.com/signed');
    expect(body.expires_in).toBe(3600);
  });
});
