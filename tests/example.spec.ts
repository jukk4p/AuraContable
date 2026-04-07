import { test, expect } from '@playwright/test';

test('has title', async ({ page }) => {
  await page.goto('/');
  await expect(page).toHaveTitle(/AuraContable/);
});

test('login link works', async ({ page }) => {
  await page.goto('/');
  await page.click('text=Acceder');
  await expect(page).toHaveURL(/.*login/);
});
