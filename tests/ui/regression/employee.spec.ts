/**
 * @file employee.spec.ts
 * @description Regression tests for OrangeHRM Employee Management UI.
 * @tags @ui @regression
 */
import { test, expect } from '../../../src/fixtures/base.fixture';
import { generateEmployee } from '../../../src/utils/faker-data';
import { URLS, MESSAGES } from '../../../src/constants';

test.use({ storageState: '.auth/admin.json' });

test.describe('Employee Management @ui @regression', () => {
  test('should display employee list page', async ({ employeePage, page }) => {
    await employeePage.goto();
    await expect(page.getByRole('heading', { name: 'Employee Information' })).toBeVisible();
  });

  test('should display employee table with records', async ({ employeePage, page }) => {
    await employeePage.goto();
    await page.getByRole('button', { name: 'Search' }).click();
    await employeePage.waitForLoad();
    await expect(page.locator('.oxd-table-body')).toBeVisible();
  });

  test('should search for existing employee', async ({ employeePage, page }) => {
    await employeePage.goto();
    await page.getByPlaceholder('Type for hints...').first().fill('a');
    await page.getByRole('button', { name: 'Search' }).click();
    await page.waitForLoadState('domcontentloaded');
    await expect(page.locator('.oxd-table-body')).toBeVisible();
  });

  test('should show no records for unknown employee', async ({ employeePage, page }) => {
    await employeePage.goto();
    await page.getByPlaceholder('Type for hints...').first().fill('zzz_nonexistent_xyz_999');
    await page.getByRole('button', { name: 'Search' }).click();
    await page.waitForLoadState('domcontentloaded');
    // Either shows "No Records Found" or the toast/table updates
    await expect(
      page.locator('.orangehrm-horizontal-padding').getByText('No Records Found'),
    ).toBeVisible({ timeout: 10_000 });
  });

  test('should add a new employee via UI', async ({ employeePage, page }) => {
    const emp = generateEmployee();
    await employeePage.goto();
    await employeePage.addEmployee(emp.firstName, emp.lastName);
    // After save, either success toast or redirect to personal details page
    await expect(page.getByText(MESSAGES.SAVED).or(page.getByText('Personal Details'))).toBeVisible(
      { timeout: 15_000 },
    );
  });

  test('should navigate to add employee page', async ({ page }) => {
    await page.goto(URLS.ADD_EMPLOYEE);
    await expect(page.getByRole('heading', { name: 'Add Employee' })).toBeVisible();
  });

  test('should show required validation on empty save', async ({ page }) => {
    await page.goto(URLS.ADD_EMPLOYEE);
    await page.getByRole('button', { name: 'Save' }).click();
    await expect(page.getByText(MESSAGES.REQUIRED).first()).toBeVisible();
  });

  test('should display employee ID field on add page', async ({ page }) => {
    await page.goto(URLS.ADD_EMPLOYEE);
    await expect(page.locator('.orangehrm-employee-form input').first()).toBeVisible();
  });

  test('should filter employees by employee ID', async ({ employeePage, page }) => {
    await employeePage.goto();
    // Employee ID is the second input field in the search form
    const inputs = page.locator('.oxd-form .oxd-input');
    await inputs.nth(1).fill('0001');
    await page.getByRole('button', { name: 'Search' }).click();
    await page.waitForLoadState('domcontentloaded');
    await expect(page.locator('.oxd-table-body, .orangehrm-horizontal-padding')).toBeVisible();
  });
});
