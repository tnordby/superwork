import type { SupabaseClient } from '@supabase/supabase-js';
import NewInboxMessageEmail from '@/emails/NewInboxMessageEmail';
import { sendEmail } from '@/lib/email/send';
import { uniqueEmailsPreservingCase } from '@/lib/messaging/unique-emails';
import {
  fingerprintInboxPreview,
  inboxNotifyAlreadyLoggedForMessage,
  inboxNotifyDuplicateContentRecently,
} from '@/lib/messaging/inbox-email-dedup';
import { tryCreateServiceRoleClient } from '@/lib/supabase/admin';

function appBaseUrl(): string {
  return process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';
}

async function loadProfileEmails(admin: SupabaseClient, userIds: string[]) {
  const unique = Array.from(new Set(userIds.filter(Boolean)));
  if (unique.length === 0) return [];

  const { data, error } = await admin.from('profiles').select('id, email').in('id', unique);
  if (error) throw error;

  const emails: string[] = [];
  for (const row of data ?? []) {
    const email = typeof row.email === 'string' ? row.email.trim() : '';
    if (email) emails.push(email);
  }
  return emails;
}

/** Respects `profiles.email_notify_inbox_messages` (false = opted out). */
async function loadInboxNotifyRecipientEmails(admin: SupabaseClient, userIds: string[]) {
  const unique = Array.from(new Set(userIds.filter(Boolean)));
  if (unique.length === 0) return [];

  const { data, error } = await admin
    .from('profiles')
    .select('id, email, email_notify_inbox_messages')
    .in('id', unique);
  if (error) throw error;

  const emails: string[] = [];
  for (const row of data ?? []) {
    const email = typeof row.email === 'string' ? row.email.trim() : '';
    if (!email) continue;
    const optedIn = row.email_notify_inbox_messages !== false;
    if (optedIn) emails.push(email);
  }
  return emails;
}

export type NotifyNewInboxMessageParams = {
  messageId: string;
  conversationId: string;
  projectId: string;
  customerUserId: string;
  senderUserId: string;
  senderName: string;
  isFromCustomer: boolean;
  preview: string;
};

/**
 * Best-effort email to the other party on the thread. Does not throw to callers.
 * Requires RESEND_API_KEY; uses the service role client when SUPABASE_SERVICE_ROLE_KEY is configured.
 * Skips duplicate sends for the same messageId (logged in email_logs) and suppresses rapid
 * duplicate content from the same sender to the same recipient in one thread (double submit).
 */
export async function notifyNewInboxMessage(params: NotifyNewInboxMessageParams): Promise<void> {
  if (!process.env.RESEND_API_KEY) return;

  const admin = tryCreateServiceRoleClient();
  if (!admin) return;

  try {
    const { data: project, error: projectError } = await admin
      .from('projects')
      .select('name')
      .eq('id', params.projectId)
      .maybeSingle();

    if (projectError) throw projectError;
    const projectName = typeof project?.name === 'string' && project.name.trim() ? project.name.trim() : 'Project';

    const projectUrl = `${appBaseUrl()}/projects/${encodeURIComponent(params.projectId)}`;
    const preview =
      params.preview.length > 280 ? `${params.preview.slice(0, 277).trimEnd()}…` : params.preview;
    const previewFingerprint = fingerprintInboxPreview(preview);

    const senderEmails = await loadProfileEmails(admin, [params.senderUserId]);
    const senderEmail = senderEmails[0] ?? null;

    let recipientEmails: string[] = [];

    if (params.isFromCustomer) {
      const { data: assignments, error: assignError } = await admin
        .from('project_assignments')
        .select('user_id')
        .eq('project_id', params.projectId)
        .is('removed_at', null);

      if (assignError) throw assignError;
      const ids = (assignments ?? []).map((a) => a.user_id as string).filter(Boolean);
      recipientEmails = await loadInboxNotifyRecipientEmails(admin, ids);
    } else {
      recipientEmails = await loadInboxNotifyRecipientEmails(admin, [params.customerUserId]);
    }

    const deduped = uniqueEmailsPreservingCase(recipientEmails);
    const filtered = deduped.filter(
      (e) => !senderEmail || e.toLowerCase() !== senderEmail.toLowerCase()
    );

    await Promise.all(
      filtered.map(async (to) => {
        if (await inboxNotifyAlreadyLoggedForMessage(admin, params.messageId, to)) {
          return;
        }
        if (
          await inboxNotifyDuplicateContentRecently(
            admin,
            params.conversationId,
            to,
            params.senderUserId,
            previewFingerprint
          )
        ) {
          return;
        }
        await sendEmail({
          to,
          subject: `New message: ${projectName}`,
          template: (
            <NewInboxMessageEmail
              recipientLabel="there"
              projectName={projectName}
              senderName={params.senderName}
              preview={preview}
              projectUrl={projectUrl}
            />
          ),
          templateId: 'new_inbox_message',
          metadata: {
            messageId: params.messageId,
            conversationId: params.conversationId,
            projectId: params.projectId,
            senderUserId: params.senderUserId,
            isFromCustomer: params.isFromCustomer,
            previewFingerprint,
          },
        });
      })
    );
  } catch (e) {
    console.error('[notifyNewInboxMessage] failed:', e);
  }
}
