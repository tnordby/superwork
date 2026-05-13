import { test, expect } from '@playwright/test';
import { fillE2ELoginForm, skipReasonForAuthenticatedE2E } from './auth-helpers';

test.describe('Account settings', () => {
  test('shows notifications and profile sections after sign-in', async ({ page }) => {
    const reason = skipReasonForAuthenticatedE2E();
    test.skip(!!reason, reason ?? '');

    await fillE2ELoginForm(page);
    await expect(page).not.toHaveURL(/\/login/, { timeout: 25_000 });

    await page.goto('/account/settings');
    await expect(page.getByRole('heading', { name: 'Settings', level: 1 })).toBeVisible();

    await expect(page.getByRole('heading', { name: 'Notifications' })).toBeVisible();
    await expect(
      page.getByRole('checkbox', { name: /New project message emails/i })
    ).toBeVisible({ timeout: 15_000 });

    await expect(page.getByRole('heading', { name: 'Person of reference' })).toBeVisible();
    await expect(page.getByRole('button', { name: 'Save details' })).toBeVisible();
  });
});
