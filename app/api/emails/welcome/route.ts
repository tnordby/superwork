import { NextRequest, NextResponse } from 'next/server';
import { sendEmail } from '@/lib/email/send';
import WelcomeEmail from '@/emails/WelcomeEmail';

export async function POST(request: NextRequest) {
  try {
    const { email, firstName } = await request.json();

    if (!email || !firstName) {
      return NextResponse.json(
        { error: 'Email and firstName are required' },
        { status: 400 }
      );
    }

    const emailId = await sendEmail({
      to: email,
      subject: 'Welcome to Superwork',
      template: WelcomeEmail({ firstName, email }),
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
