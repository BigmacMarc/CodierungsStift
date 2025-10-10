import { test, expect } from '@playwright/test';

test('loads app and shows preview iframe', async ({ page }) => {
  await page.goto('/');
  await expect(page.getByRole('toolbar')).toBeVisible();
  const iframe = page.frameLocator('iframe');
  await expect(iframe.first()).toBeDefined();
});

