import { createClient } from '@supabase/supabase-js';

// Create a service role client for logging (bypasses RLS)
const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
  {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  }
);

export type EmailLogData = {
  userId?: string;
  recipientEmail: string;
  emailType: string;
  subject: string;
  status: 'sent' | 'failed' | 'bounced';
  externalId?: string;
  errorMessage?: string;
  metadata?: Record<string, any>;
};

/**
 * Log an email send event to the database
 */
export async function logEmail(data: EmailLogData): Promise<void> {
  try {
    const { error } = await supabaseAdmin.from('email_logs').insert({
      user_id: data.userId || null,
      recipient_email: data.recipientEmail,
      email_type: data.emailType,
      subject: data.subject,
      status: data.status,
      external_id: data.externalId || null,
      error_message: data.errorMessage || null,
      metadata: data.metadata || null,
    });

    if (error) {
      console.error('Failed to log email:', error);
    }
  } catch (error) {
    console.error('Error logging email:', error);
  }
}
