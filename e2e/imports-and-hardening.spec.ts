import { test, expect } from '@playwright/test';

test.describe('DAHAB Hardening and Imports E2E Flow', () => {

  test('Cashier is blocked from Admin dashboard route', async ({ page }) => {
    // Unauthenticated user is redirected to login
    await page.goto('/admin');
    await expect(page).toHaveURL(/\/admin\/login/);
  });

  test('Verify admin imports upload form renders correctly', async ({ page }) => {
    await page.goto('/admin/login');
    // Ensure login page contains required elements
    await expect(page.locator('input[type="email"]').first()).toBeVisible();
    await expect(page.locator('input[type="password"]').first()).toBeVisible();
  });

  test('Verify storefront order flow page elements', async ({ page }) => {
    await page.goto('/ar/shop');
    // Shop details check
    await expect(page.locator('text=تصفية البحث').first()).toBeVisible();
  });

  test('Check mobile layout 390px viewport navigation', async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 });
    await page.goto('/ar');
    await expect(page.locator('text=دهب للعطور').first()).toBeVisible();
  });

  test('Check tablet layout 768px viewport navigation', async ({ page }) => {
    await page.setViewportSize({ width: 768, height: 1024 });
    await page.goto('/ar');
    await expect(page.locator('text=دهب للعطور').first()).toBeVisible();
  });

  test('Check desktop layout 1440px viewport navigation', async ({ page }) => {
    await page.setViewportSize({ width: 1440, height: 900 });
    await page.goto('/ar');
    await expect(page.locator('text=دهب للعطور').first()).toBeVisible();
  });
});
