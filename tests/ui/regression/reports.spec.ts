/**
 * @file reports.spec.ts
 * @description Regression tests for OrangeHRM Reports module UI.
 * @tags @ui @regression
 */
import { test, expect } from '../../../src/fixtures/base.fixture';

test.use({ storageState: '.auth/admin.json' });

test.describe('Reports Module @ui @regression', () => {
  test('should display reports page', async ({ reportsPage, page }) => {
    await reportsPage.goto();
    await expect(page.getByRole('heading', { name: /report/i })).toBeVisible();
  });
});
