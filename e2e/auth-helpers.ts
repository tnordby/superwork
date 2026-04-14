import type { Page } from '@playwright/test';

/** Same rules as sign-in smoke: real Supabase + E2E user in local/staging CI. */
export function skipReasonForAuthenticatedE2E(): string | null {
  const email = process.env.E2E_TEST_USER_EMAIL?.trim();
  const password = process.env.E2E_TEST_USER_PASSWORD;
  if (!email || !password) {
    return 'Set E2E_TEST_USER_EMAIL and E2E_TEST_USER_PASSWORD in .env.e2e.local or under E2E_* in .env.local (see e2e/env.example).';
  }
  if (
    process.env.CI &&
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY === 'placeholder-anon-key-for-ci'
  ) {
    return 'CI uses placeholder Supabase; run this spec locally with real .env.local + .env.e2e.local, or wire real NEXT_PUBLIC_* and E2E_* secrets on the e2e job.';
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
}
