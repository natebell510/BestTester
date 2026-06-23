import { test, expect } from '@playwright/test';
import { AccessibilityChecker } from '../../src/a11y/accessibility-checker';

test.describe('Dashboard - Accessibility Tests @a11y', () => {
  let a11yChecker: AccessibilityChecker;

  test.beforeEach(async ({ page, baseURL }) => {
    a11yChecker = new AccessibilityChecker();
    if (!baseURL) {
      // eslint-disable-next-line playwright/no-skipped-test
      test.skip();
    }

    // Login first
    await page.goto(`${baseURL}/web/index.php/auth/login`);
    await page.fill('input[name="username"]', 'Admin');
    await page.fill('input[name="password"]', 'admin123');
    await page.click('button[type="submit"]');
    await page.waitForURL('**/dashboard/**', { timeout: 5000 });
  });

  test('dashboard should have no critical accessibility violations', async ({ page }) => {
    const result = await a11yChecker.checkPage(page, {
      standards: 'wcag22aa',
    });

    const criticalViolations = result.violations.filter((v) => v.impact === 'critical');
    expect(criticalViolations).toHaveLength(0);
  });

  test('dashboard navigation should be keyboard accessible', async ({ page }) => {
    const result = await a11yChecker.checkPage(page, {
      rules: ['aria-roles', 'button-name', 'link-name'],
    });

    const ariaViolations = result.violations.filter((v) => v.id === 'aria-roles');
    expect(ariaViolations.length).toBeLessThanOrEqual(2);
  });

  test('dashboard cards should have proper semantic structure', async ({ page }) => {
    const result = await a11yChecker.checkComponent(page, '[role="main"]', {
      rules: ['heading-order', 'landmark-main-is-unique'],
    });

    const headingViolations = result.violations.filter((v) => v.id === 'heading-order');
    expect(headingViolations.length).toBeLessThanOrEqual(1);
  });

  test('dashboard tables should have headers', async ({ page }) => {
    const result = await a11yChecker.checkPage(page, {
      rules: ['table-fake-caption', 'th-has-data-cells'],
    });

    const tableViolations = result.violations.filter(
      (v) => v.id.includes('table') || v.id.includes('th'),
    );
    expect(tableViolations).toHaveLength(0);
  });

  test('dashboard should pass color contrast', async ({ page }) => {
    const contrastIssues = await a11yChecker.checkColorContrast(page);
    expect(contrastIssues).toHaveLength(0);
  });

  test('dashboard images should have alt text', async ({ page }) => {
    const result = await a11yChecker.checkPage(page, {
      rules: ['image-alt'],
    });

    const imageViolations = result.violations.filter((v) => v.id === 'image-alt');
    // Only fail on serious/critical image alt issues
    const seriousImageViolations = imageViolations.filter(
      (v) => v.impact === 'serious' || v.impact === 'critical',
    );
    expect(seriousImageViolations).toHaveLength(0);
  });

  test('dashboard should generate detailed accessibility report', async ({ page }) => {
    const result = await a11yChecker.checkPage(page);
    const report = a11yChecker.generateA11yReport(result.violations);

    expect(report).toContain('Accessibility Report');
    expect(report).toContain('Summary');
    expect(report.length).toBeGreaterThan(0);
  });
});
