import { SIGNUP_WORK_EMAIL_REQUIRED_MESSAGE } from '@/lib/auth/blocked-signup-email-domains';
import { SignupPageClient } from './SignupPageClient';

function firstParam(value: string | string[] | undefined): string | undefined {
  if (Array.isArray(value)) return value[0];
  return value;
}

export default async function SignupPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const sp = await searchParams;
  const initialOAuthErrorMessage =
    firstParam(sp.error) === 'work-email' ? SIGNUP_WORK_EMAIL_REQUIRED_MESSAGE : undefined;

  return <SignupPageClient initialOAuthErrorMessage={initialOAuthErrorMessage} />;
}
