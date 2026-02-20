import { NextResponse } from 'next/server';
import { sendEmail } from '@/lib/email/send';
import WelcomeClientEmail from '@/emails/templates/auth/welcome-client';
import PasswordResetEmail from '@/emails/templates/auth/password-reset';
import SubscriptionActivatedEmail from '@/emails/templates/billing/subscription-activated';
import PaymentFailedEmail from '@/emails/templates/billing/payment-failed';

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const template = searchParams.get('template') || 'welcome';
  const to = searchParams.get('to') || 'test@example.com';

  try {
    let emailTemplate;
    let subject;
    let templateId;

    switch (template) {
      case 'welcome':
        emailTemplate = WelcomeClientEmail({
          userName: 'John Doe',
          loginUrl: `${process.env.NEXT_PUBLIC_APP_URL}/login`,
        });
        subject = 'Welcome to Superwork — let\'s get started';
        templateId = 'AUTH-01';
        break;

      case 'password-reset':
        emailTemplate = PasswordResetEmail({
          resetUrl: `${process.env.NEXT_PUBLIC_APP_URL}/auth/reset-password?token=test123`,
          userName: 'John Doe',
        });
        subject = 'Reset your Superwork password';
        templateId = 'AUTH-03';
        break;

      case 'subscription-activated':
        emailTemplate = SubscriptionActivatedEmail({
          userName: 'John Doe',
          planName: 'Advanced',
          amount: '€8,000',
          billingInterval: 'monthly',
          nextBillingDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toLocaleDateString('en-US', {
            month: 'long',
            day: 'numeric',
            year: 'numeric',
          }),
          dashboardUrl: `${process.env.NEXT_PUBLIC_APP_URL}/account/plan`,
        });
        subject = 'You\'re subscribed — welcome to Advanced';
        templateId = 'BILL-01';
        break;

      case 'payment-failed':
        emailTemplate = PaymentFailedEmail({
          userName: 'John Doe',
          amount: '€8,000',
          planName: 'Advanced',
          retryDate: new Date(Date.now() + 3 * 24 * 60 * 60 * 1000).toLocaleDateString('en-US', {
            month: 'long',
            day: 'numeric',
            year: 'numeric',
          }),
          updatePaymentUrl: `${process.env.NEXT_PUBLIC_APP_URL}/account/plan`,
        });
        subject = 'Action required: your Superwork payment failed';
        templateId = 'BILL-03';
        break;

      default:
        return NextResponse.json(
          { error: 'Invalid template. Use: welcome, password-reset, subscription-activated, or payment-failed' },
          { status: 400 }
        );
    }

    const resendId = await sendEmail({
      to,
      subject,
      template: emailTemplate,
      templateId,
      metadata: {
        test: true,
        environment: process.env.NODE_ENV,
      },
    });

    return NextResponse.json({
      success: true,
      message: `Test email sent to ${to}`,
      resendId,
      template: templateId,
    });
  } catch (error) {
    console.error('Test email error:', error);
    return NextResponse.json(
      {
        error: 'Failed to send test email',
        details: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}
