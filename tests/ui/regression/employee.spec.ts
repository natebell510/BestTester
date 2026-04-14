/**
 * @file employee.spec.ts
 * @description Regression tests for OrangeHRM Employee Management UI.
 * @tags @regression
 */
import { test, expect } from '../../../src/fixtures/base.fixture';
import { generateEmployee } from '../../../src/utils/faker-data';
import { URLS, MESSAGES } from '../../../src/constants';

test.use({ storageState: 'auth-state/admin.json' });

test.describe('Employee Management @regression', () => {

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

  test('should search for existing employee', async ({ employeePage }) => {
    await employeePage.goto();
    await employeePage.searchEmployee('Admin');
    await employeePage.assertEmployeeVisible('Admin');
  });

  test('should show no records for unknown employee', async ({ employeePage }) => {
    await employeePage.goto();
    await employeePage.searchEmployee('zzz_nonexistent_xyz_999');
    await employeePage.assertNoRecordsFound();
  });

  test('should add a new employee via UI', async ({ employeePage }) => {
    const emp = generateEmployee();
    await employeePage.goto();
    await employeePage.addEmployee(emp.firstName, emp.lastName);
    await employeePage.assertSaveSuccess();
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
    await expect(page.locator('input[name="employeeId"]')).toBeVisible();
  });

  test('should filter employees by employee ID', async ({ employeePage, page }) => {
    await employeePage.goto();
    await page.locator('input[placeholder="Employee Id"]').fill('0001');
    await page.getByRole('button', { name: 'Search' }).click();
    await employeePage.waitForLoad();
    await expect(page.locator('.oxd-table-body')).toBeVisible();
  });
});
