import { test, expect } from '@playwright/test';

test('create project with templateId redirects to login when unauthenticated', async ({ page }) => {
  await page.goto(
    '/projects/create?templateId=00000000-0000-0000-0000-000000000001'
  );
  await expect(page).toHaveURL(/login/);
});
