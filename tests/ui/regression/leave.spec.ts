/**
 * @file leave.spec.ts
 * @description Regression tests for OrangeHRM Leave module UI.
 * @tags @ui @regression
 */
import { test, expect } from '../../../src/fixtures/base.fixture';
import { futureDateFormatted } from '../../../src/utils/date-utils';
import { URLS, LEAVE_TYPES } from '../../../src/constants';

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

  test('should show validation when applying leave without dates', async ({ page }) => {
    await page.goto(URLS.APPLY_LEAVE);
    await page.locator('.oxd-select-text').first().click();
    await page
      .locator('[role="option"], .oxd-select-option')
      .first()
      .waitFor({ state: 'visible', timeout: 5000 });
    await page.locator('[role="option"], .oxd-select-option').first().click();
    await page.getByRole('button', { name: 'Apply' }).click();
    await expect(page.getByText('Required').first()).toBeVisible();
  });

  test('should apply for annual leave successfully', async ({ leavePage }) => {
    await leavePage.goto();
    await leavePage.applyLeave(
      LEAVE_TYPES.ANNUAL,
      futureDateFormatted(10),
      futureDateFormatted(11),
    );
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
