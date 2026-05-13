/**
 * Personal / webmail domains we reject for self-service signup to reduce bot noise
 * and protect transactional email reputation. Invites and admin flows are separate.
 *
 * Database enforcement: keep in sync with
 * `supabase/migrations/054_enforce_work_email_on_auth_user_insert.sql` (blocked list + trigger).
 */
const BLOCKED_SIGNUP_EMAIL_DOMAINS = new Set([
  'gmail.com',
  'googlemail.com',
  'hotmail.com',
  'hotmail.co.uk',
  'outlook.com',
  'outlook.co.uk',
  'live.com',
  'msn.com',
  'yahoo.com',
  'yahoo.co.uk',
  'yahoo.co.jp',
  'ymail.com',
  'rocketmail.com',
  'icloud.com',
  'me.com',
  'mac.com',
  'aol.com',
  'protonmail.com',
  'proton.me',
  'pm.me',
  'gmx.com',
  'gmx.net',
  'web.de',
  't-online.de',
  'mail.com',
  'email.com',
  'inbox.com',
  'tutanota.com',
  'tuta.io',
  'hey.com',
  'fastmail.com',
  'fastmail.fm',
  'mail.ru',
  'yandex.com',
  'yandex.ru',
  'qq.com',
  '163.com',
  '126.com',
  'sina.com',
  'naver.com',
  'daum.net',
  'duck.com',
  'skiff.com',
  'skiff.org',
]);

export function signupEmailDomain(email: string): string | null {
  const trimmed = email.trim().toLowerCase();
  const at = trimmed.lastIndexOf('@');
  if (at <= 0 || at === trimmed.length - 1) return null;
  return trimmed.slice(at + 1);
}

export function isBlockedSignupEmailDomain(email: string): boolean {
  const domain = signupEmailDomain(email);
  if (!domain) return true;

  if (BLOCKED_SIGNUP_EMAIL_DOMAINS.has(domain)) return true;

  for (const blocked of BLOCKED_SIGNUP_EMAIL_DOMAINS) {
    if (domain.endsWith(`.${blocked}`)) return true;
  }

  return false;
}

export const SIGNUP_WORK_EMAIL_REQUIRED_MESSAGE =
  'Please use your work email address. Signups from personal providers (Gmail, Outlook, Yahoo, iCloud, and similar) are not accepted.';
