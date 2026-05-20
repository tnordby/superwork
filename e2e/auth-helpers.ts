import type { Page } from '@playwright/test';

function ciUsesPlaceholderSupabase(): boolean {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL ?? '';
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? '';
  return url.includes('example.supabase.co') || key === 'placeholder-anon-key-for-ci';
}

/** Same rules as sign-in smoke: real Supabase + E2E user in local/staging CI. */
export function skipReasonForAuthenticatedE2E(): string | null {
  if (process.env.CI && ciUsesPlaceholderSupabase()) {
    return 'CI build uses placeholder Supabase; authenticated E2E needs real NEXT_PUBLIC_SUPABASE_* and E2E_* on the e2e job (see e2e/env.example).';
  }

  const email = process.env.E2E_TEST_USER_EMAIL?.trim();
  const password = process.env.E2E_TEST_USER_PASSWORD;
  if (!email || !password) {
    return 'Set E2E_TEST_USER_EMAIL and E2E_TEST_USER_PASSWORD in .env.e2e.local or under E2E_* in .env.local (see e2e/env.example).';
  }

  return null;
}

/** Assumes skipReasonForAuthenticatedE2E() was checked (credentials present). */
export async function fillE2ELoginForm(page: Page): Promise<void> {
  const email = process.env.E2E_TEST_USER_EMAIL!.trim();
  const password = process.env.E2E_TEST_USER_PASSWORD!;

  await page.goto('/login');
  await page.getByRole('heading', { name: 'Welcome back' }).waitFor();

  await page.getByLabel('Email').fill(email);
  await page.getByLabel('Password').fill(password);
  await page.getByRole('button', { name: 'Sign in' }).click();
  await page.waitForURL((url) => !url.pathname.startsWith('/login'), { timeout: 25_000 });
}
