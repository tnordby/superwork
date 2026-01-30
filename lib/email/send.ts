import { resend, FROM } from './resend';
import { render } from '@react-email/components';
import { logEmail } from './logger';
import WelcomeEmail from '@/emails/WelcomeEmail';
import PasswordResetEmail from '@/emails/PasswordResetEmail';
import ProjectCreatedEmail from '@/emails/ProjectCreatedEmail';
import ProjectStatusUpdateEmail from '@/emails/ProjectStatusUpdateEmail';

export type EmailResult = {
  success: boolean;
  id?: string;
  error?: string;
};

/**
 * Send welcome email to new user
 */
export async function sendWelcomeEmail(
  email: string,
  firstName: string,
  userId?: string
): Promise<EmailResult> {
  const subject = 'Welcome to Superwork!';
  const emailType = 'welcome';

  try {
    const emailHtml = await render(WelcomeEmail({ firstName, email }));

    const { data, error } = await resend.emails.send({
      from: FROM,
      to: email,
      subject,
      html: emailHtml,
    });

    if (error) {
      console.error('Failed to send welcome email:', error);

      // Log failed email
      await logEmail({
        userId,
        recipientEmail: email,
        emailType,
        subject,
        status: 'failed',
        errorMessage: error.message,
      });

      return { success: false, error: error.message };
    }

    // Log successful email
    await logEmail({
      userId,
      recipientEmail: email,
      emailType,
      subject,
      status: 'sent',
      externalId: data?.id,
    });

    return { success: true, id: data?.id };
  } catch (error) {
    console.error('Error sending welcome email:', error);

    // Log failed email
    await logEmail({
      userId,
      recipientEmail: email,
      emailType,
      subject,
      status: 'failed',
      errorMessage: 'Failed to send email',
    });

    return { success: false, error: 'Failed to send email' };
  }
}

/**
 * Send password reset email
 */
export async function sendPasswordResetEmail(
  email: string,
  firstName: string,
  resetLink: string,
  userId?: string
): Promise<EmailResult> {
  const subject = 'Reset Your Superwork Password';
  const emailType = 'password_reset';

  try {
    const emailHtml = await render(PasswordResetEmail({ firstName, resetLink }));

    const { data, error } = await resend.emails.send({
      from: FROM,
      to: email,
      subject,
      html: emailHtml,
    });

    if (error) {
      console.error('Failed to send password reset email:', error);

      await logEmail({
        userId,
        recipientEmail: email,
        emailType,
        subject,
        status: 'failed',
        errorMessage: error.message,
      });

      return { success: false, error: error.message };
    }

    await logEmail({
      userId,
      recipientEmail: email,
      emailType,
      subject,
      status: 'sent',
      externalId: data?.id,
    });

    return { success: true, id: data?.id };
  } catch (error) {
    console.error('Error sending password reset email:', error);

    await logEmail({
      userId,
      recipientEmail: email,
      emailType,
      subject,
      status: 'failed',
      errorMessage: 'Failed to send email',
    });

    return { success: false, error: 'Failed to send email' };
  }
}

/**
 * Send project created notification
 */
export async function sendProjectCreatedEmail(
  email: string,
  firstName: string,
  projectName: string,
  projectDescription: string,
  assignee: string,
  projectId: string,
  userId?: string
): Promise<EmailResult> {
  const subject = `New Project Created: ${projectName}`;
  const emailType = 'project_created';

  try {
    const projectLink = `${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3001'}/projects/${projectId}`;

    const emailHtml = await render(
      ProjectCreatedEmail({
        firstName,
        projectName,
        projectDescription,
        assignee,
        projectLink,
      })
    );

    const { data, error } = await resend.emails.send({
      from: FROM,
      to: email,
      subject,
      html: emailHtml,
    });

    if (error) {
      console.error('Failed to send project created email:', error);

      await logEmail({
        userId,
        recipientEmail: email,
        emailType,
        subject,
        status: 'failed',
        errorMessage: error.message,
        metadata: { projectId, projectName },
      });

      return { success: false, error: error.message };
    }

    await logEmail({
      userId,
      recipientEmail: email,
      emailType,
      subject,
      status: 'sent',
      externalId: data?.id,
      metadata: { projectId, projectName },
    });

    return { success: true, id: data?.id };
  } catch (error) {
    console.error('Error sending project created email:', error);

    await logEmail({
      userId,
      recipientEmail: email,
      emailType,
      subject,
      status: 'failed',
      errorMessage: 'Failed to send email',
      metadata: { projectId, projectName },
    });

    return { success: false, error: 'Failed to send email' };
  }
}

/**
 * Send project status update notification
 */
export async function sendProjectStatusUpdateEmail(
  email: string,
  firstName: string,
  projectName: string,
  oldStatus: string,
  newStatus: string,
  projectId: string,
  userId?: string,
  message?: string
): Promise<EmailResult> {
  const subject = `Status Update: ${projectName}`;
  const emailType = 'project_status_update';

  try {
    const projectLink = `${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3001'}/projects/${projectId}`;

    const emailHtml = await render(
      ProjectStatusUpdateEmail({
        firstName,
        projectName,
        oldStatus,
        newStatus,
        message,
        projectLink,
      })
    );

    const { data, error } = await resend.emails.send({
      from: FROM,
      to: email,
      subject,
      html: emailHtml,
    });

    if (error) {
      console.error('Failed to send project status update email:', error);

      await logEmail({
        userId,
        recipientEmail: email,
        emailType,
        subject,
        status: 'failed',
        errorMessage: error.message,
        metadata: { projectId, projectName, oldStatus, newStatus },
      });

      return { success: false, error: error.message };
    }

    await logEmail({
      userId,
      recipientEmail: email,
      emailType,
      subject,
      status: 'sent',
      externalId: data?.id,
      metadata: { projectId, projectName, oldStatus, newStatus },
    });

    return { success: true, id: data?.id };
  } catch (error) {
    console.error('Error sending project status update email:', error);

    await logEmail({
      userId,
      recipientEmail: email,
      emailType,
      subject,
      status: 'failed',
      errorMessage: 'Failed to send email',
      metadata: { projectId, projectName, oldStatus, newStatus },
    });

    return { success: false, error: 'Failed to send email' };
  }
}
