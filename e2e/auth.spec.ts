import { test, expect } from '@playwright/test';

test.describe('Public Accessibility', () => {
  test('should load the homepage and check branding', async ({ page }) => {
    // Navigate to homepage
    await page.goto('/ar');
    
    // Check that we see DAHAB PERFUMES branding
    await expect(page.locator('text=دهب للعطور').first()).toBeVisible();
  });

  test('should load the admin login page', async ({ page }) => {
    await page.goto('/admin/login');
    
    // Check login form title
    await expect(page.locator('text=Dahab Perfumes Admin')).toBeVisible();
  });
});
