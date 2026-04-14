/**
 * @file login.smoke.spec.ts
 * @description Smoke tests for OrangeHRM login functionality.
 * @tags @ui @smoke
 */
import { test, expect } from '../../../src/fixtures/base.fixture';
import { CREDENTIALS, URLS, MESSAGES } from '../../../src/constants';

test.describe('Login @ui @smoke', () => {
  // Login tests must start unauthenticated — force a clean browser context
  test.use({ storageState: { cookies: [], origins: [] } });

  test('should login successfully with valid credentials', async ({ loginPage, dashboardPage }) => {
    await loginPage.goto();
    await loginPage.login(CREDENTIALS.ADMIN.username, CREDENTIALS.ADMIN.password);
    await dashboardPage.assertLoaded();
  });

  test('should show error with invalid credentials', async ({ loginPage }) => {
    await loginPage.goto();
    const error = await loginPage.loginExpectError('invalid_user', 'wrong_pass');
    expect(error).toContain(MESSAGES.INVALID_CREDENTIALS);
  });

  test('should show error with empty credentials', async ({ loginPage, page }) => {
    await loginPage.goto();
    await page.getByRole('button', { name: 'Login' }).click();
    await expect(page.getByText(MESSAGES.REQUIRED).first()).toBeVisible();
  });

  test('should redirect to login when accessing protected page unauthenticated', async ({
    page,
  }) => {
    await page.goto(URLS.EMPLOYEE_LIST);
    await expect(page).toHaveURL(/auth\/login/);
  });

  test('should show login page title', async ({ page }) => {
    await page.goto(URLS.LOGIN);
    await expect(page).toHaveTitle(/OrangeHRM/);
  });

  test('should logout successfully', async ({ loginPage, dashboardPage, page }) => {
    await loginPage.goto();
    await loginPage.login(CREDENTIALS.ADMIN.username, CREDENTIALS.ADMIN.password);
    await dashboardPage.assertLoaded();
    await dashboardPage.logout();
    await expect(page).toHaveURL(/auth\/login/);
  });
});
