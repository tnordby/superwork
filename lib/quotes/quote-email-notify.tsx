import type { SupabaseClient } from '@supabase/supabase-js';
import ProjectCreatedEmail from '@/emails/ProjectCreatedEmail';
import QuoteAssignedLeadEmail from '@/emails/QuoteAssignedLeadEmail';
import QuoteNewRequestOpsEmail from '@/emails/QuoteNewRequestOpsEmail';
import QuoteReadyForReviewEmail from '@/emails/QuoteReadyForReviewEmail';
import QuoteRejectedOpsEmail from '@/emails/QuoteRejectedOpsEmail';
import { sendEmail } from '@/lib/email/send';
import { uniqueEmailsPreservingCase } from '@/lib/messaging/unique-emails';
import { tryCreateServiceRoleClient } from '@/lib/supabase/admin';

function appBaseUrl(): string {
  return process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';
}

function extraOpsEmailsFromEnv(): string[] {
  const raw = process.env.QUOTE_NOTIFY_EMAILS;
  if (!raw || typeof raw !== 'string') return [];
  return raw
    .split(',')
    .map((s) => s.trim())
    .filter(Boolean);
}

async function loadProfileFields(
  admin: SupabaseClient,
  userId: string
): Promise<{ email: string; firstName: string; lastName: string }> {
  const { data, error } = await admin
    .from('profiles')
    .select('email, first_name, last_name')
    .eq('id', userId)
    .maybeSingle();
  if (error) throw error;
  const email = typeof data?.email === 'string' ? data.email.trim() : '';
  const first = typeof data?.first_name === 'string' ? data.first_name.trim() : '';
  const last = typeof data?.last_name === 'string' ? data.last_name.trim() : '';
  return { email, firstName: first, lastName: last };
}

async function loadQuoteManagerEmails(admin: SupabaseClient): Promise<string[]> {
  const { data: roles, error } = await admin
    .from('user_platform_roles')
    .select('user_id')
    .in('role', ['project_manager', 'admin']);
  if (error) throw error;
  const ids = (roles ?? []).map((r) => r.user_id as string).filter(Boolean);
  if (ids.length === 0) {
    return uniqueEmailsPreservingCase(extraOpsEmailsFromEnv());
  }
  const { data: profiles, error: pError } = await admin
    .from('profiles')
    .select('email')
    .in('id', ids);
  if (pError) throw pError;
  const fromDb: string[] = [];
  for (const row of profiles ?? []) {
    const e = typeof row.email === 'string' ? row.email.trim() : '';
    if (e) fromDb.push(e);
  }
  return uniqueEmailsPreservingCase([...fromDb, ...extraOpsEmailsFromEnv()]);
}

async function loadAssigneeEmail(admin: SupabaseClient, userId: string): Promise<string | null> {
  const { email } = await loadProfileFields(admin, userId);
  return email || null;
}

/**
 * Email quote managers (and optional QUOTE_NOTIFY_EMAILS) about a new customer quote request.
 * Best-effort; does not throw.
 */
export async function notifyQuoteManagersNewQuoteRequest(params: {
  quoteId: string;
  quoteTitle: string;
  submittedByUserId: string;
}): Promise<void> {
  if (!process.env.RESEND_API_KEY) return;
  const admin = tryCreateServiceRoleClient();
  if (!admin) return;

  try {
    const recipients = await loadQuoteManagerEmails(admin);
    if (recipients.length === 0) return;

    const submitter = await loadProfileFields(admin, params.submittedByUserId);
    const submittedByLabel =
      `${submitter.firstName} ${submitter.lastName}`.trim() || submitter.email || 'Customer';

    const quoteUrl = `${appBaseUrl()}/team/quotes/${encodeURIComponent(params.quoteId)}`;
    const title =
      params.quoteTitle.trim() || 'Quote request';

    await Promise.all(
      recipients.map((to) =>
        sendEmail({
          to,
          subject: `New quote request: ${title}`,
          template: (
            <QuoteNewRequestOpsEmail
              quoteTitle={title}
              submittedByLabel={submittedByLabel}
              quoteUrl={quoteUrl}
            />
          ),
          templateId: 'quote_new_request_ops',
          metadata: {
            quoteId: params.quoteId,
            submittedByUserId: params.submittedByUserId,
          },
        })
      )
    );
  } catch (e) {
    console.error('[notifyQuoteManagersNewQuoteRequest] failed:', e);
  }
}

/**
 * Email the assigned consultant that they are lead on a quote.
 * Best-effort; does not throw.
 */
export async function notifyQuoteAssignee(params: {
  quoteId: string;
  quoteTitle: string;
  assigneeUserId: string;
}): Promise<void> {
  if (!process.env.RESEND_API_KEY) return;
  const admin = tryCreateServiceRoleClient();
  if (!admin) return;

  try {
    const to = await loadAssigneeEmail(admin, params.assigneeUserId);
    if (!to) return;

    const quoteUrl = `${appBaseUrl()}/team/quotes/${encodeURIComponent(params.quoteId)}`;
    const title = params.quoteTitle.trim() || 'Quote';

    await sendEmail({
      to,
      subject: `You are assigned as lead: ${title}`,
      template: <QuoteAssignedLeadEmail quoteTitle={title} quoteUrl={quoteUrl} />,
      templateId: 'quote_assigned_lead',
      metadata: {
        quoteId: params.quoteId,
        assigneeUserId: params.assigneeUserId,
      },
    });
  } catch (e) {
    console.error('[notifyQuoteAssignee] failed:', e);
  }
}

/**
 * Email the customer that PM review is complete and the quote is ready to approve.
 * Best-effort; does not throw.
 */
export async function notifyCustomerQuoteReadyForReview(params: {
  quoteId: string;
  quoteTitle: string;
  customerUserId: string;
}): Promise<void> {
  if (!process.env.RESEND_API_KEY) return;
  const admin = tryCreateServiceRoleClient();
  if (!admin) return;

  try {
    const profile = await loadProfileFields(admin, params.customerUserId);
    if (!profile.email) return;

    const quoteUrl = `${appBaseUrl()}/quotes/${encodeURIComponent(params.quoteId)}`;
    const title = params.quoteTitle.trim() || 'Your quote';

    await sendEmail({
      to: profile.email,
      subject: `Your quote is ready: ${title}`,
      template: (
        <QuoteReadyForReviewEmail
          firstName={profile.firstName}
          quoteTitle={title}
          quoteUrl={quoteUrl}
        />
      ),
      templateId: 'quote_ready_customer',
      metadata: {
        quoteId: params.quoteId,
        customerUserId: params.customerUserId,
      },
    });
  } catch (e) {
    console.error('[notifyCustomerQuoteReadyForReview] failed:', e);
  }
}

/**
 * Email the customer after quote approval when a project exists (reuses project-created template).
 * Best-effort; does not throw.
 */
export async function notifyCustomerAfterQuoteApproval(params: {
  customerUserId: string;
  projectId: string;
}): Promise<void> {
  if (!process.env.RESEND_API_KEY) return;
  const admin = tryCreateServiceRoleClient();
  if (!admin) return;

  try {
    const profile = await loadProfileFields(admin, params.customerUserId);
    if (!profile.email) return;

    const { data: project, error } = await admin
      .from('projects')
      .select('name, description, assignee')
      .eq('id', params.projectId)
      .maybeSingle();
    if (error) throw error;

    const projectName =
      typeof project?.name === 'string' && project.name.trim() ? project.name.trim() : 'Project';
    const projectDescription =
      typeof project?.description === 'string' && project.description.trim()
        ? project.description.trim()
        : 'Your project is set up in Superwork.';
    const assignee =
      typeof project?.assignee === 'string' && project.assignee.trim()
        ? project.assignee.trim()
        : '';

    const projectLink = `${appBaseUrl()}/projects/${encodeURIComponent(params.projectId)}`;
    const firstName = profile.firstName.trim() || 'there';

    await sendEmail({
      to: profile.email,
      subject: `Project created: ${projectName}`,
      template: (
        <ProjectCreatedEmail
          firstName={firstName}
          projectName={projectName}
          projectDescription={projectDescription}
          assignee={assignee}
          projectLink={projectLink}
        />
      ),
      templateId: 'quote_approved_project_customer',
      metadata: {
        projectId: params.projectId,
        customerUserId: params.customerUserId,
      },
    });
  } catch (e) {
    console.error('[notifyCustomerAfterQuoteApproval] failed:', e);
  }
}

/**
 * Email quote managers when a customer declines a quote.
 * Best-effort; does not throw.
 */
export async function notifyQuoteManagersCustomerRejected(params: {
  quoteId: string;
  quoteTitle: string;
  customerUserId: string;
  rejectionReason: string | null;
}): Promise<void> {
  if (!process.env.RESEND_API_KEY) return;
  const admin = tryCreateServiceRoleClient();
  if (!admin) return;

  try {
    const recipients = await loadQuoteManagerEmails(admin);
    if (recipients.length === 0) return;

    const customer = await loadProfileFields(admin, params.customerUserId);
    const customerLabel =
      `${customer.firstName} ${customer.lastName}`.trim() || customer.email || 'Customer';

    let reasonPreview = typeof params.rejectionReason === 'string' ? params.rejectionReason.trim() : '';
    if (reasonPreview.length > 500) {
      reasonPreview = `${reasonPreview.slice(0, 497)}…`;
    }

    const quoteUrl = `${appBaseUrl()}/team/quotes/${encodeURIComponent(params.quoteId)}`;
    const title = params.quoteTitle.trim() || 'Quote';

    await Promise.all(
      recipients.map((to) =>
        sendEmail({
          to,
          subject: `Quote declined: ${title}`,
          template: (
            <QuoteRejectedOpsEmail
              quoteTitle={title}
              customerLabel={customerLabel}
              reasonPreview={reasonPreview}
              quoteUrl={quoteUrl}
            />
          ),
          templateId: 'quote_rejected_ops',
          metadata: {
            quoteId: params.quoteId,
            customerUserId: params.customerUserId,
          },
        })
      )
    );
  } catch (e) {
    console.error('[notifyQuoteManagersCustomerRejected] failed:', e);
  }
}
