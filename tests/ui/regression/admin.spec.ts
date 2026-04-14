/**
 * @file admin.spec.ts
 * @description Regression tests for OrangeHRM Admin module.
 * @tags @ui @regression
 */
import { test, expect } from '../../../src/fixtures/base.fixture';
import { URLS } from '../../../src/constants';

test.use({ storageState: '.auth/admin.json' });

test.describe('Admin Module @ui @regression', () => {
  test('should display admin module heading', async ({ page }) => {
    await page.goto(URLS.ADMIN);
    await expect(page.getByRole('heading', { name: 'User Management' })).toBeVisible();
  });

  test('should display user list table', async ({ page }) => {
    await page.goto(URLS.ADMIN);
    await expect(page.locator('.oxd-table-body')).toBeVisible();
  });

  test('should search users by username', async ({ page }) => {
    await page.goto(URLS.ADMIN);
    await page.locator('.oxd-input').first().fill('Admin');
    await page.getByRole('button', { name: 'Search' }).click();
    await page.waitForLoadState('domcontentloaded');
    await expect(page.locator('.oxd-table-body')).toBeVisible();
  });

  test('should display Add User button', async ({ page }) => {
    await page.goto(URLS.ADMIN);
    await expect(page.getByRole('button', { name: 'Add' })).toBeVisible();
  });

  test('should display Job Titles under Job menu', async ({ page }) => {
    await page.goto(URLS.ADMIN);
    await page.locator('.oxd-topbar-body-nav').getByText('Job', { exact: true }).click();
    await expect(page.getByRole('menuitem', { name: 'Job Titles' })).toBeVisible();
  });

  test('should navigate to Job Titles page', async ({ page }) => {
    await page.goto('/web/index.php/admin/viewJobTitleList');
    await expect(page.getByRole('heading', { name: 'Job Titles' })).toBeVisible();
  });

  test('should display Organization menu', async ({ page }) => {
    await page.goto(URLS.ADMIN);
    await expect(page.locator('.oxd-topbar-body-nav').getByText('Organization')).toBeVisible();
  });

  test('should navigate to Locations page', async ({ page }) => {
    await page.goto('/web/index.php/admin/viewLocations');
    await expect(page.getByRole('heading', { name: 'Locations' })).toBeVisible();
  });
});
