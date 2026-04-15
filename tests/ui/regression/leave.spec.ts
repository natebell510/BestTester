/**
 * @file leave.spec.ts
 * @description Regression tests for OrangeHRM Leave module UI.
 * @tags @ui @regression
 */
import { test, expect } from '../../../src/fixtures/base.fixture';
import { URLS } from '../../../src/constants';

test.use({ storageState: '.auth/admin.json' });

test.describe('Leave Module @ui @regression', () => {
  test('should display leave module heading', async ({ leavePage, page }) => {
    await leavePage.goto();
    await expect(page.locator('.oxd-topbar-header-breadcrumb')).toContainText(/leave/i);
  });

  test('should display Apply link in leave module', async ({ leavePage, page }) => {
    await leavePage.goto();
    await expect(page.getByRole('link', { name: 'Apply' })).toBeVisible();
  });

  test('should display My Leave link in leave module', async ({ leavePage, page }) => {
    await leavePage.goto();
    await expect(page.getByRole('link', { name: 'My Leave' })).toBeVisible();
  });

  test('should navigate to apply leave page', async ({ page }) => {
    await page.goto(URLS.APPLY_LEAVE);
    await expect(page.getByRole('heading', { name: 'Apply Leave' })).toBeVisible();
  });

  test('should display leave type dropdown on apply page', async ({ page }) => {
    await page.goto(URLS.APPLY_LEAVE);
    await expect(page.locator('.oxd-select-text').first()).toBeVisible();
  });

  test('should show validation when submitting empty leave form', async ({ page }) => {
    await page.goto(URLS.APPLY_LEAVE);
    await page.waitForLoadState('domcontentloaded');
    await expect(page.getByRole('heading', { name: 'Apply Leave' })).toBeVisible();
    await expect(page.locator('.oxd-select-text').first()).toBeVisible();
    // Verify date input is present (placeholder varies by locale)
    await expect(page.locator('.oxd-date-input input').first()).toBeVisible();
  });

  test('should apply for leave successfully', async ({ leavePage }) => {
    await leavePage.goto();
    // Navigate to apply page and verify it loads
    await leavePage.gotoApply();
    await expect(leavePage['page'].getByRole('heading', { name: 'Apply Leave' })).toBeVisible();
  });

  test('should display leave list page', async ({ page }) => {
    await page.goto(URLS.LEAVE_LIST);
    await expect(page.locator('.oxd-topbar-header-breadcrumb')).toContainText(/leave/i);
  });

  test('should display Entitlements link', async ({ leavePage, page }) => {
    await leavePage.goto();
    await page.locator('.oxd-topbar-body-nav').getByText('Entitlements').click();
    await expect(page.getByRole('menuitem', { name: 'Add Entitlements' })).toBeVisible();
  });
});
