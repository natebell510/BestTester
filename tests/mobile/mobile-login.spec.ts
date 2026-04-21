/**
 * @file mobile-login.spec.ts
 * @description Mobile login tests for SauceDemo on emulated mobile devices
 * @tags @mobile @smoke
 */
import { test, expect } from '../../src/fixtures/mobile.fixture';

test.describe('Mobile Login @mobile @smoke', () => {
  test.beforeEach(async ({ mobileLoginPage }) => {
    await mobileLoginPage.goto();
  });

  test('should display login form on mobile viewport', async ({ mobileLoginPage, page }) => {
    await expect(page.locator('[data-test="username"]')).toBeVisible();
    await expect(page.locator('[data-test="password"]')).toBeVisible();
    await expect(page.locator('[data-test="login-button"]')).toBeVisible();
    expect(await mobileLoginPage.isResponsive()).toBe(true);
  });

  test('should login successfully with valid credentials', async ({ mobileLoginPage, page }) => {
    await mobileLoginPage.login('standard_user', 'secret_sauce');
    await expect(page).toHaveURL(/inventory/);
  });

  test('should show error for invalid credentials', async ({ mobileLoginPage }) => {
    await mobileLoginPage.login('invalid_user', 'wrong_pass');
    const error = await mobileLoginPage.getError();
    expect(error).toContain('Username and password do not match');
  });

  test('should show error for locked out user', async ({ mobileLoginPage }) => {
    await mobileLoginPage.login('locked_out_user', 'secret_sauce');
    const error = await mobileLoginPage.getError();
    expect(error).toContain('locked out');
  });
});
