import { createHash } from 'node:crypto';
import type { SupabaseClient } from '@supabase/supabase-js';

const TEMPLATE_ID = 'new_inbox_message';

/**
 * Suppress duplicate notifications when the same sender fires the same body to the same recipient
 * in one thread within this window (e.g. double submit). Distinct messages still notify.
 */
export const INBOX_NOTIFY_DUPLICATE_CONTENT_MS = 45_000;

type EmailLogRow = {
  metadata?: {
    conversationId?: string;
    messageId?: string;
    senderUserId?: string;
    previewFingerprint?: string;
  } | null;
};

export function fingerprintInboxPreview(preview: string): string {
  return createHash('sha256').update(preview, 'utf8').digest('hex').slice(0, 24);
}

/**
 * True if we already logged a sent inbox email for this exact message and recipient (idempotent retries).
 */
export async function inboxNotifyAlreadyLoggedForMessage(
  admin: SupabaseClient,
  messageId: string,
  recipientEmail: string
): Promise<boolean> {
  const normalized = recipientEmail.trim().toLowerCase();
  if (!normalized || !messageId) return false;

  const { data, error } = await admin
    .from('email_logs')
    .select('id')
    .eq('template_id', TEMPLATE_ID)
    .eq('recipient_email', normalized)
    .contains('metadata', { messageId })
    .limit(1);

  if (error) {
    console.warn('[inbox-email-dedup] messageId lookup failed (sending anyway):', error.message);
    return false;
  }
  return (data?.length ?? 0) > 0;
}

/**
 * True if we already sent the same preview from the same sender to this recipient in this
 * conversation within the window (double-submit style), using email_logs metadata.
 */
export async function inboxNotifyDuplicateContentRecently(
  admin: SupabaseClient,
  conversationId: string,
  recipientEmail: string,
  senderUserId: string,
  previewFingerprint: string,
  windowMs: number = INBOX_NOTIFY_DUPLICATE_CONTENT_MS
): Promise<boolean> {
  const normalized = recipientEmail.trim().toLowerCase();
  if (!normalized || !conversationId || !senderUserId || !previewFingerprint) return false;

  const since = new Date(Date.now() - windowMs).toISOString();
  const { data, error } = await admin
    .from('email_logs')
    .select('id, metadata')
    .eq('template_id', TEMPLATE_ID)
    .eq('recipient_email', normalized)
    .gte('created_at', since)
    .limit(40);

  if (error) {
    console.warn('[inbox-email-dedup] duplicate-content lookup failed (sending anyway):', error.message);
    return false;
  }

  return (
    (data as EmailLogRow[] | null)?.some((row) => {
      const m = row.metadata;
      return (
        m?.conversationId === conversationId &&
        m?.senderUserId === senderUserId &&
        m?.previewFingerprint === previewFingerprint
      );
    }) ?? false
  );
}
