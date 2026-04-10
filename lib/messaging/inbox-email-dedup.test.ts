import { describe, it, expect, vi } from 'vitest';
import type { SupabaseClient } from '@supabase/supabase-js';
import {
  fingerprintInboxPreview,
  inboxNotifyAlreadyLoggedForMessage,
  inboxNotifyDuplicateContentRecently,
} from './inbox-email-dedup';

function adminForMessageIdDedup(result: { data: unknown; error: unknown | null }): SupabaseClient {
  return {
    from: vi.fn().mockReturnValue({
      select: () => ({
        eq: () => ({
          eq: () => ({
            contains: () => ({
              limit: () => Promise.resolve(result),
            }),
          }),
        }),
      }),
    }),
  } as unknown as SupabaseClient;
}

function adminForDuplicateContentLookup(result: {
  data: unknown;
  error: unknown | null;
}): SupabaseClient {
  return {
    from: vi.fn().mockReturnValue({
      select: () => ({
        eq: () => ({
          eq: () => ({
            gte: () => ({
              limit: () => Promise.resolve(result),
            }),
          }),
        }),
      }),
    }),
  } as unknown as SupabaseClient;
}

describe('fingerprintInboxPreview', () => {
  it('is stable for the same input', () => {
    expect(fingerprintInboxPreview('hello')).toBe(fingerprintInboxPreview('hello'));
  });

  it('differs for different bodies', () => {
    expect(fingerprintInboxPreview('a')).not.toBe(fingerprintInboxPreview('b'));
  });
});

describe('inboxNotifyAlreadyLoggedForMessage', () => {
  it('returns false when lookup errors (fail open)', async () => {
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {});
    const admin = adminForMessageIdDedup({ data: null, error: { message: 'nope' } });
    try {
      await expect(
        inboxNotifyAlreadyLoggedForMessage(admin, 'm1', 'a@b.com')
      ).resolves.toBe(false);
    } finally {
      warn.mockRestore();
    }
  });

  it('returns true when a row exists', async () => {
    const admin = adminForMessageIdDedup({ data: [{ id: 'log-1' }], error: null });
    await expect(
      inboxNotifyAlreadyLoggedForMessage(admin, 'm1', 'a@b.com')
    ).resolves.toBe(true);
  });

  it('returns false for empty messageId without querying', async () => {
    const admin = adminForMessageIdDedup({ data: [], error: null });
    await expect(inboxNotifyAlreadyLoggedForMessage(admin, '', 'a@b.com')).resolves.toBe(false);
    expect(admin.from).not.toHaveBeenCalled();
  });
});

describe('inboxNotifyDuplicateContentRecently', () => {
  it('returns false on error', async () => {
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {});
    const admin = adminForDuplicateContentLookup({ data: null, error: { message: 'db' } });
    try {
      await expect(
        inboxNotifyDuplicateContentRecently(admin, 'c1', 'a@b.com', 's1', 'fp1')
      ).resolves.toBe(false);
    } finally {
      warn.mockRestore();
    }
  });

  it('returns true when metadata matches conversation, sender, and fingerprint', async () => {
    const fp = fingerprintInboxPreview('same text');
    const admin = adminForDuplicateContentLookup({
      data: [
        {
          id: '1',
          metadata: {
            conversationId: 'c1',
            senderUserId: 's1',
            previewFingerprint: fp,
          },
        },
      ],
      error: null,
    });
    await expect(
      inboxNotifyDuplicateContentRecently(admin, 'c1', 'a@b.com', 's1', fp, 60_000)
    ).resolves.toBe(true);
  });

  it('returns false when fingerprint differs', async () => {
    const admin = adminForDuplicateContentLookup({
      data: [
        {
          id: '1',
          metadata: {
            conversationId: 'c1',
            senderUserId: 's1',
            previewFingerprint: 'other',
          },
        },
      ],
      error: null,
    });
    await expect(
      inboxNotifyDuplicateContentRecently(admin, 'c1', 'a@b.com', 's1', 'fp-new')
    ).resolves.toBe(false);
  });
});
