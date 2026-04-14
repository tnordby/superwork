import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import {
  notifyQuoteAssignee,
  notifyQuoteManagersNewQuoteRequest,
} from './quote-email-notify';

const hoisted = vi.hoisted(() => ({
  mockSendEmail: vi.fn(),
  mockTryAdmin: vi.fn(),
}));

vi.mock('@/lib/email/send', () => ({
  sendEmail: hoisted.mockSendEmail,
}));

vi.mock('@/lib/supabase/admin', () => ({
  tryCreateServiceRoleClient: hoisted.mockTryAdmin,
}));

describe('quote-email-notify', () => {
  const prevResend = process.env.RESEND_API_KEY;

  beforeEach(() => {
    vi.clearAllMocks();
    process.env.RESEND_API_KEY = 'test-key';
  });

  afterEach(() => {
    if (prevResend === undefined) {
      delete process.env.RESEND_API_KEY;
    } else {
      process.env.RESEND_API_KEY = prevResend;
    }
  });

  it('does not send when service role client is unavailable', async () => {
    hoisted.mockTryAdmin.mockReturnValue(null);

    await notifyQuoteManagersNewQuoteRequest({
      quoteId: 'q1',
      quoteTitle: 'T',
      submittedByUserId: 'u1',
    });

    expect(hoisted.mockSendEmail).not.toHaveBeenCalled();
  });

  it('does not send when RESEND_API_KEY is unset', async () => {
    delete process.env.RESEND_API_KEY;
    hoisted.mockTryAdmin.mockReturnValue({} as import('@supabase/supabase-js').SupabaseClient);

    await notifyQuoteManagersNewQuoteRequest({
      quoteId: 'q1',
      quoteTitle: 'T',
      submittedByUserId: 'u1',
    });

    expect(hoisted.mockSendEmail).not.toHaveBeenCalled();
  });

  it('notifyQuoteAssignee does not send when service role client is unavailable', async () => {
    hoisted.mockTryAdmin.mockReturnValue(null);

    await notifyQuoteAssignee({
      quoteId: 'q1',
      quoteTitle: 'T',
      assigneeUserId: 'u1',
    });

    expect(hoisted.mockSendEmail).not.toHaveBeenCalled();
  });
});
