import { LoginPageClient } from './LoginPageClient';

const LOGIN_GOOGLE_OAUTH_ERROR = 'Google sign-in did not complete. Please try again.';

function firstParam(value: string | string[] | undefined): string | undefined {
  if (Array.isArray(value)) return value[0];
  return value;
}

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const sp = await searchParams;
  const initialOAuthErrorMessage =
    firstParam(sp.error) === 'oauth' ? LOGIN_GOOGLE_OAUTH_ERROR : undefined;

  return <LoginPageClient initialOAuthErrorMessage={initialOAuthErrorMessage} />;
}
