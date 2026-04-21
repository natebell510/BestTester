/**
 * @file mobile-responsive.spec.ts
 * @description Mobile viewport and responsive behavior tests
 * @tags @mobile @smoke
 */
import { test, expect } from '../../src/fixtures/mobile.fixture';

test.describe('Mobile Responsive @mobile @smoke', () => {
  test.beforeEach(async ({ mobileLoginPage }) => {
    await mobileLoginPage.goto();
    await mobileLoginPage.login('standard_user', 'secret_sauce');
  });

  test('should render in mobile viewport', async ({ mobileProductsPage }) => {
    const viewport = await mobileProductsPage.getViewportSize();
    expect(viewport!.width).toBeLessThan(500);
    expect(await mobileProductsPage.isResponsive()).toBe(true);
  });

  test('should open and close burger menu', async ({ page }) => {
    await page.locator('#react-burger-menu-btn').click();
    await expect(page.locator('.bm-menu')).toBeVisible();
    await page.locator('#react-burger-cross-btn').click();
    await expect(page.locator('.bm-menu')).not.toBeVisible();
  });

  test('should logout via burger menu', async ({ mobileProductsPage, page }) => {
    await mobileProductsPage.logout();
    await expect(page).toHaveURL(/.*saucedemo\.com\/$/);
  });

  test('should scroll through products', async ({ mobileProductsPage, page }) => {
    await mobileProductsPage.swipe('up', 500);
    const lastItem = page.locator('[data-test="inventory-item"]').last();
    await expect(lastItem).toBeVisible();
  });
});
