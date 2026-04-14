import { describe, it, expect, vi, beforeEach } from 'vitest';
import { NextRequest } from 'next/server';
import { POST } from './route';

const hoisted = vi.hoisted(() => ({
  mockCreateClient: vi.fn(),
}));

vi.mock('@/lib/supabase/server', () => ({
  createClient: hoisted.mockCreateClient,
}));

describe('POST /api/assets/upload', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('returns 401 when not authenticated', async () => {
    hoisted.mockCreateClient.mockResolvedValue({
      auth: {
        getUser: () => Promise.resolve({ data: { user: null }, error: new Error('no session') }),
      },
    });

    const formData = new FormData();
    formData.append('file', new Blob([Uint8Array.from([137, 80, 78, 71])], { type: 'image/png' }), 'x.png');

    const res = await POST(
      new NextRequest('http://localhost/api/assets/upload', {
        method: 'POST',
        body: formData,
      })
    );

    expect(res.status).toBe(401);
  });
});
