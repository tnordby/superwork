import { resend, EMAIL_CONFIG } from './config';
import { createClient } from '@/lib/supabase/server';

interface SendEmailParams {
  to: string;
  subject: string;
  template: React.ReactElement;
  templateId: string;
  metadata?: Record<string, any>;
  retries?: number;
}

const MAX_RETRIES = 3;
const RETRY_DELAY = 1000;

async function wait(ms: number) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

export async function sendEmail({
  to,
  subject,
  template,
  templateId,
  metadata = {},
  retries = 0,
}: SendEmailParams): Promise<string | null> {
  const supabase = await createClient();

  try {
    const { data, error } = await resend.emails.send({
      from: EMAIL_CONFIG.from,
      replyTo: EMAIL_CONFIG.replyTo,
      to,
      subject,
      react: template,
    });

    if (error) {
      console.error('Resend error:', error);

      if (retries < MAX_RETRIES) {
        const delay = RETRY_DELAY * Math.pow(2, retries);
        console.log(`Retrying email send in ${delay}ms (attempt ${retries + 1}/${MAX_RETRIES})`);
        await wait(delay);
        return sendEmail({ to, subject, template, templateId, metadata, retries: retries + 1 });
      }

      await supabase
        .from('email_logs')
        .insert({
          recipient_email: to,
          template_id: templateId,
          subject,
          status: 'failed',
          metadata: {
            ...metadata,
            error: error.message,
          },
        });

      throw new Error(`Failed to send email after ${MAX_RETRIES} retries: ${error.message}`);
    }

    const resendId = data?.id || null;
    await supabase
      .from('email_logs')
      .insert({
        recipient_email: to,
        template_id: templateId,
        subject,
        status: 'sent',
        resend_id: resendId,
        metadata,
      });

    console.log(`Email sent successfully: ${templateId} to ${to} (Resend ID: ${resendId})`);
    return resendId;
  } catch (error) {
    console.error('Error in sendEmail:', error);

    await supabase
      .from('email_logs')
      .insert({
        recipient_email: to,
        template_id: templateId,
        subject,
        status: 'failed',
        metadata: {
          ...metadata,
          error: error instanceof Error ? error.message : 'Unknown error',
        },
      });

    throw error;
  }
}
