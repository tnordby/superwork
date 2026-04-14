import { test, expect, type Page } from '@playwright/test';
import { fillE2ELoginForm, skipReasonForAuthenticatedE2E } from './auth-helpers';

async function expectAuthenticatedLanding(page: Page) {
  await expect(page).not.toHaveURL(/\/login/, { timeout: 25_000 });

  const url = page.url();
  if (url.includes('/team')) {
    await expect(page.getByRole('heading', { name: 'Team workspace' })).toBeVisible();
    return;
  }
  if (url.includes('/admin')) {
    await expect(page.getByRole('link', { name: 'Services' })).toBeVisible();
    return;
  }
  await expect(page.getByRole('heading', { name: 'Dashboard' })).toBeVisible();
}

test.describe('Sign-in landing', () => {
  test('customer or internal user reaches app shell after login', async ({ page }) => {
    const reason = skipReasonForAuthenticatedE2E();
    test.skip(!!reason, reason ?? '');

    await fillE2ELoginForm(page);

    await expectAuthenticatedLanding(page);
  });
});
