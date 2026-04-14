/**
 * @file dashboard.spec.ts
 * @description Regression tests for OrangeHRM Dashboard.
 * @tags @regression
 */
import { test, expect } from '../../../src/fixtures/base.fixture';
import { NAV, URLS } from '../../../src/constants';

test.use({ storageState: 'auth-state/admin.json' });

test.describe('Dashboard @regression', () => {

  test('should display dashboard heading', async ({ dashboardPage }) => {
    await dashboardPage.navigate(URLS.DASHBOARD);
    await dashboardPage.assertLoaded();
  });

  test('should display sidebar navigation', async ({ dashboardPage }) => {
    await dashboardPage.navigate(URLS.DASHBOARD);
    await dashboardPage.assertSidebarVisible();
  });

  test('should display quick launch section', async ({ dashboardPage }) => {
    await dashboardPage.navigate(URLS.DASHBOARD);
    await dashboardPage.assertQuickLaunchVisible();
  });

  test('should have all main nav items visible', async ({ dashboardPage }) => {
    await dashboardPage.navigate(URLS.DASHBOARD);
    for (const item of [NAV.ADMIN, NAV.PIM, NAV.LEAVE, NAV.TIME, NAV.RECRUITMENT]) {
      await dashboardPage.assertNavItemExists(item);
    }
  });

  test('should navigate to PIM from sidebar', async ({ dashboardPage, page }) => {
    await dashboardPage.navigate(URLS.DASHBOARD);
    await dashboardPage.navigateTo(NAV.PIM);
    await expect(page).toHaveURL(/pim/);
  });

  test('should navigate to Leave from sidebar', async ({ dashboardPage, page }) => {
    await dashboardPage.navigate(URLS.DASHBOARD);
    await dashboardPage.navigateTo(NAV.LEAVE);
    await expect(page).toHaveURL(/leave/);
  });

  test('should navigate to Admin from sidebar', async ({ dashboardPage, page }) => {
    await dashboardPage.navigate(URLS.DASHBOARD);
    await dashboardPage.navigateTo(NAV.ADMIN);
    await expect(page).toHaveURL(/admin/);
  });

  test('should display user dropdown', async ({ page }) => {
    await page.goto(URLS.DASHBOARD);
    await page.locator('.oxd-userdropdown-tab').click();
    await expect(page.getByRole('menuitem', { name: 'Logout' })).toBeVisible();
  });

  test('should display About in user dropdown', async ({ page }) => {
    await page.goto(URLS.DASHBOARD);
    await page.locator('.oxd-userdropdown-tab').click();
    await expect(page.getByRole('menuitem', { name: 'About' })).toBeVisible();
  });
});
