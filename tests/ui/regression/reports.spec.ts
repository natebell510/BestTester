/**
 * @file reports.spec.ts
 * @description Regression tests for OrangeHRM Reports module UI.
 * @tags @regression
 */
import { test, expect } from '../../../src/fixtures/base.fixture';

test.use({ storageState: 'auth-state/admin.json' });

test.describe('Reports Module @regression', () => {
  test('should display reports page', async ({ reportsPage, page }) => {
    await reportsPage.goto();
    await expect(page.getByRole('heading', { name: /report/i })).toBeVisible();
  });
});
