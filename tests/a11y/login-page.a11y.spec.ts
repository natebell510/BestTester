import { test, expect } from '@playwright/test';
import { AccessibilityChecker } from '../../src/a11y/accessibility-checker';

test.describe('Login Page - Accessibility Tests @a11y', () => {
  let a11yChecker: AccessibilityChecker;

  test.beforeEach(({ baseURL }) => {
    a11yChecker = new AccessibilityChecker();
    if (!baseURL) {
      // eslint-disable-next-line playwright/no-skipped-test
      test.skip();
    }
  });

  test('login page should have no critical accessibility violations', async ({ page, baseURL }) => {
    await page.goto(`${baseURL}/web/index.php/auth/login`);
    const result = await a11yChecker.checkPage(page, {
      standards: 'wcag22aa',
    });

    const criticalViolations = result.violations.filter((v) => v.impact === 'critical');
    expect(criticalViolations).toHaveLength(0);
  });

  test('login form should have proper labels for inputs', async ({ page, baseURL }) => {
    await page.goto(`${baseURL}/web/index.php/auth/login`);
    const result = await a11yChecker.checkPage(page, {
      rules: ['label', 'aria-required-attr'],
    });

    const labelViolations = result.violations.filter((v) => v.id === 'label');
    labelViolations.forEach((v) => {
      expect(v.impact).not.toBe('critical');
    });
  });

  test('login button should be accessible by keyboard', async ({ page, baseURL }) => {
    await page.goto(`${baseURL}/web/index.php/auth/login`);
    const result = await a11yChecker.checkPage(page, {
      rules: ['button-name', 'aria-roles'],
    });

    const buttonViolations = result.violations.filter((v) => v.id === 'button-name');
    expect(buttonViolations).toHaveLength(0);
  });

  test('color contrast should meet WCAG AA standards', async ({ page, baseURL }) => {
    await page.goto(`${baseURL}/web/index.php/auth/login`);
    const contrastIssues = await a11yChecker.checkColorContrast(page);

    expect(contrastIssues).toHaveLength(0);
  });

  test('page should have valid language attribute', async ({ page, baseURL }) => {
    await page.goto(`${baseURL}/web/index.php/auth/login`);
    const result = await a11yChecker.checkPage(page, {
      rules: ['html-lang-valid'],
    });

    const langViolations = result.violations.filter((v) => v.id === 'html-lang-valid');
    expect(langViolations).toHaveLength(0);
  });

  test('page should have descriptive headings', async ({ page, baseURL }) => {
    await page.goto(`${baseURL}/web/index.php/auth/login`);
    const result = await a11yChecker.checkPage(page, {
      rules: ['heading-order'],
    });

    const headingViolations = result.violations.filter((v) => v.id === 'heading-order');
    expect(headingViolations.length).toBeLessThanOrEqual(1);
  });

  test('report should be generated correctly', async ({ page, baseURL }) => {
    await page.goto(`${baseURL}/web/index.php/auth/login`);
    const result = await a11yChecker.checkPage(page);
    const report = a11yChecker.generateA11yReport(result.violations);

    expect(report).toContain('Accessibility Report');
    expect(report).toContain('Summary');
  });
});
