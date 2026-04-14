/**
 * @file dashboard.visual.spec.ts
 * @description Visual regression tests for OrangeHRM Dashboard.
 * @tags @ui @visual @regression
 */
import { test, expect } from '@playwright/test';

test.use({ storageState: '.auth/admin.json' });

test.describe('Dashboard Visual @ui @visual @regression', () => {
  test('dashboard matches snapshot', async ({ page }) => {
    await page.goto('/web/index.php/dashboard/index');
    await page.waitForLoadState('networkidle');
    await expect(page).toHaveScreenshot('dashboard.png', { maxDiffPixelRatio: 0.02 });
  });
});
