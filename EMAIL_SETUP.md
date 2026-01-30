# Email Communications Setup Guide (Resend)

This guide explains how the Superwork portal sends transactional emails using **Resend**.

---

## Overview

The email system provides:
- **Welcome emails** when users sign up
- **Password reset emails** for account recovery
- **Project notifications** when projects are created or updated
- **Email logging** to track all sent emails in the database

---

## 1. Email Provider Configuration

### Resend Setup

1. **Sign up for Resend**: https://resend.com
2. **Get your API key**: Dashboard → API Keys → Create API Key
3. **Add to environment variables**:

```bash
# .env.local
RESEND_API_KEY=re_xxxxxxxxxxxxx
```

4. **Verify your domain** (for production):
   - Go to Resend Dashboard → Domains
   - Add your domain `superwork.co`
   - Configure DNS records (SPF, DKIM, DMARC)

---

## 2. Sender Configuration

Currently configured sender:

```typescript
FROM: "Superwork <no-reply@superwork.co>"
```

**For development**: Resend allows sending to any email without domain verification.

**For production**: You must verify your domain (`superwork.co`) and configure:
- SPF record
- DKIM record
- DMARC policy

Update sender in `lib/email/resend.ts` if needed.

---

## 3. Email Templates

All email templates are in the `/emails` directory using React Email:

### Available Templates

1. **WelcomeEmail.tsx** - Sent when user creates account
2. **PasswordResetEmail.tsx** - Sent when user requests password reset
3. **ProjectCreatedEmail.tsx** - Sent when new project is created
4. **ProjectStatusUpdateEmail.tsx** - Sent when project status changes

Each template is a React component with inline styles for email compatibility.

---

## 4. Email Functions

Located in `lib/email/send.ts`:

### sendWelcomeEmail()
```typescript
await sendWelcomeEmail(
  email: string,
  firstName: string,
  userId?: string
)
```

### sendPasswordResetEmail()
```typescript
await sendPasswordResetEmail(
  email: string,
  firstName: string,
  resetLink: string,
  userId?: string
)
```

### sendProjectCreatedEmail()
```typescript
await sendProjectCreatedEmail(
  email: string,
  firstName: string,
  projectName: string,
  projectDescription: string,
  assignee: string,
  projectId: string,
  userId?: string
)
```

### sendProjectStatusUpdateEmail()
```typescript
await sendProjectStatusUpdateEmail(
  email: string,
  firstName: string,
  projectName: string,
  oldStatus: string,
  newStatus: string,
  projectId: string,
  userId?: string,
  message?: string
)
```

---

## 5. Email Logging

All emails are logged to the `email_logs` table in Supabase.

### Database Setup

Run the email logs schema:

```bash
# In Supabase SQL Editor, run:
supabase/email-logs-schema.sql
```

This creates the `email_logs` table with:
- `user_id` - User who the email was sent to
- `recipient_email` - Email address
- `email_type` - Type of email (welcome, password_reset, etc.)
- `subject` - Email subject line
- `status` - sent, failed, or bounced
- `external_id` - Resend email ID
- `error_message` - Error if failed
- `metadata` - Additional context (JSON)
- `sent_at` - Timestamp

### Viewing Email Logs

Email logs are only accessible via service role (admin) for security.

To view logs, run in Supabase SQL Editor:

```sql
SELECT * FROM email_logs
ORDER BY sent_at DESC
LIMIT 50;
```

---

## 6. Current Integration

### Signup Flow

When a user signs up:

1. User submits signup form (`app/signup/page.tsx`)
2. Supabase creates the user account
3. Profile is auto-created via database trigger
4. **Welcome email is sent** via API route (`app/api/emails/welcome/route.ts`)
5. Email is logged to database
6. User is redirected to dashboard

**Important**: Welcome email sending is non-blocking - signup succeeds even if email fails.

---

## 7. Adding New Email Types

To add a new email notification:

### Step 1: Create Email Template

Create new file in `/emails/`:

```tsx
// emails/NewNotificationEmail.tsx
import { Body, Container, Heading, Html, Text } from '@react-email/components';

export default function NewNotificationEmail({ name }: { name: string }) {
  return (
    <Html>
      <Body>
        <Container>
          <Heading>Hello {name}!</Heading>
          <Text>Your notification content here</Text>
        </Container>
      </Body>
    </Html>
  );
}
```

### Step 2: Add Send Function

In `lib/email/send.ts`:

```typescript
export async function sendNewNotification(
  email: string,
  name: string,
  userId?: string
): Promise<EmailResult> {
  const subject = 'Your Notification Subject';
  const emailType = 'new_notification';

  try {
    const emailHtml = await render(NewNotificationEmail({ name }));

    const { data, error } = await resend.emails.send({
      from: FROM,
      to: email,
      subject,
      html: emailHtml,
    });

    if (error) {
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
```

### Step 3: Call from Your Code

```typescript
import { sendNewNotification } from '@/lib/email/send';

// In your server action or API route:
await sendNewNotification(user.email, user.name, user.id);
```

---

## 8. Testing Emails

### Development Testing

1. **Test welcome email**: Sign up with a real email address
2. **Check inbox**: Email should arrive within seconds
3. **Check logs**: Query `email_logs` table in Supabase

### Using Resend Dashboard

1. Go to Resend Dashboard → Emails
2. View all sent emails, opens, clicks
3. See delivery status and any errors

---

## 9. Error Handling

All email functions:
- ✅ Return `{ success: boolean, id?: string, error?: string }`
- ✅ Log failures to database with error messages
- ✅ Use try/catch for unexpected errors
- ✅ Never throw - always return result object

Example usage:

```typescript
const result = await sendWelcomeEmail(email, firstName, userId);

if (!result.success) {
  console.error('Failed to send welcome email:', result.error);
  // Continue execution - don't block user signup
}
```

---

## 10. Security Notes

- ✅ Resend API key is server-side only (never exposed to client)
- ✅ Email logs use RLS (service role only)
- ✅ Tokens in reset links must be single-use and expire
- ✅ No sensitive data in email body
- ✅ All emails include unsubscribe option (future)

---

## 11. Production Checklist

Before going to production:

- [ ] Verify domain in Resend
- [ ] Configure SPF, DKIM, DMARC DNS records
- [ ] Update `FROM` email to use verified domain
- [ ] Set `NEXT_PUBLIC_APP_URL` in environment
- [ ] Test all email types end-to-end
- [ ] Monitor email delivery rates
- [ ] Set up Resend webhooks for bounces (optional)
- [ ] Implement user notification preferences

---

## 12. Future Enhancements (Not in v1)

- User notification preferences (opt-out per category)
- Batch/digest emails (group similar events)
- Email open/click tracking
- Resend webhook integration for bounces
- Marketing emails (newsletters)
- Template customization per organization

---

## 13. Troubleshooting

### Email not arriving

1. Check `email_logs` table for status
2. Check Resend Dashboard for delivery status
3. Verify recipient email is correct
4. Check spam folder
5. Verify Resend API key is valid

### "Domain not verified" error

- Only occurs in production with unverified domain
- Either verify domain or use development mode

### Email sends but logs show failed

- Check Supabase service role key is set
- Check `email_logs` table exists
- Check RLS policies allow service role access

---

## You're All Set! 🎉

Your email system is now configured and ready to send transactional emails via Resend. All emails are logged, tracked, and properly error-handled.

Next steps:
- Test the signup flow to receive a welcome email
- Add project creation emails when projects are created
- Set up password reset email flow
