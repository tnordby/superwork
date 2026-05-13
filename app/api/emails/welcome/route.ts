import { NextRequest, NextResponse } from 'next/server';
import { sendEmail } from '@/lib/email/send';
import WelcomeEmail from '@/emails/WelcomeEmail';
import { createClient } from '@/lib/supabase/server';
import { isBlockedSignupEmailDomain } from '@/lib/auth/blocked-signup-email-domains';

function noopWelcomeResponse() {
  return NextResponse.json({ ok: true });
}

export async function POST(request: NextRequest) {
  try {
    const { email, firstName } = await request.json();

    if (!email || !firstName) {
      return NextResponse.json(
        { error: 'Email and firstName are required' },
        { status: 400 }
      );
    }

    const normalizedEmail = String(email).trim().toLowerCase();

    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user?.email) {
      return noopWelcomeResponse();
    }

    if (user.email.toLowerCase() !== normalizedEmail) {
      return noopWelcomeResponse();
    }

    if (isBlockedSignupEmailDomain(normalizedEmail)) {
      return noopWelcomeResponse();
    }

    const emailId = await sendEmail({
      to: normalizedEmail,
      subject: 'Welcome to Superwork',
      template: WelcomeEmail({ firstName, email: normalizedEmail }),
      templateId: 'AUTH-WELCOME-01',
      metadata: { first_name: firstName },
    });

    return NextResponse.json({ success: true, id: emailId });
  } catch (error) {
    console.error('Error in welcome email API:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
