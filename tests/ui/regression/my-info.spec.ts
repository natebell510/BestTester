/**
 * @file my-info.spec.ts
 * @description Regression tests for OrangeHRM My Info module.
 * @tags @ui @regression
 */
import { test, expect } from '../../../src/fixtures/base.fixture';
import { URLS } from '../../../src/constants';

test.use({ storageState: '.auth/admin.json' });

test.describe('My Info @ui @regression', () => {
  test('should display My Info page', async ({ page }) => {
    await page.goto(URLS.MY_INFO);
    await expect(page.getByRole('heading', { name: 'Personal Details' })).toBeVisible();
  });

  test('should display first name field', async ({ page }) => {
    await page.goto(URLS.MY_INFO);
    await expect(page.locator('input[name="firstName"]')).toBeVisible();
  });

  test('should display last name field', async ({ page }) => {
    await page.goto(URLS.MY_INFO);
    await expect(page.locator('input[name="lastName"]')).toBeVisible();
  });

  test('should display Contact Details tab', async ({ page }) => {
    await page.goto(URLS.MY_INFO);
    await expect(page.getByRole('link', { name: 'Contact Details' })).toBeVisible();
  });

  test('should navigate to Emergency Contacts tab', async ({ page }) => {
    await page.goto(URLS.MY_INFO);
    await page.getByRole('link', { name: 'Emergency Contacts' }).click();
    await page.waitForLoadState('networkidle');
    await expect(page.getByRole('heading', { name: 'Emergency Contacts' })).toBeVisible();
  });

  test('should display Save button on personal details', async ({ page }) => {
    await page.goto(URLS.MY_INFO);
    await expect(page.getByRole('button', { name: 'Save' }).first()).toBeVisible();
  });
});
