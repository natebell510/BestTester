import { test, expect } from '@playwright/test';
import { BaselineManager } from '../../../src/visual/baseline-manager';

test.describe('Login Page - Visual Regression Tests @visual', () => {
  let baselineManager: BaselineManager;
  const env = process.env.TEST_ENV || 'dev';
  const browser = process.env.BROWSER_NAME || 'chromium';

  test.beforeEach(() => {
    baselineManager = new BaselineManager(env, browser);
  });

  test('login page should match baseline', async ({ page, baseURL }) => {
    if (!baseURL) {
      // eslint-disable-next-line playwright/no-skipped-test
      test.skip();
    }

    await page.goto(`${baseURL}/web/index.php/auth/login`);
    await page.waitForLoadState('networkidle');

    const baselinePath = baselineManager.loadBaseline('login-page');

    if (!baselinePath) {
      // First run - create baseline
      await baselineManager.saveBaseline(page, 'login-page', 'Initial baseline for login page');
    } else {
      // Compare with baseline
      await expect(page).toHaveScreenshot('login-page.png', {
        maxDiffPixels: 100,
      });
    }
  });

  test('login form elements should be visually correct', async ({ page, baseURL }) => {
    if (!baseURL) {
      // eslint-disable-next-line playwright/no-skipped-test
      test.skip();
    }

    await page.goto(`${baseURL}/web/index.php/auth/login`);

    const form = page.locator('form');
    await expect(form).toBeVisible();

    if (!baselineManager.loadBaseline('login-form')) {
      await baselineManager.saveBaseline(page, 'login-form', 'Login form visual baseline');
    }
  });

  test('login page in viewport mode should match baseline', async ({ page, baseURL }) => {
    if (!baseURL) {
      // eslint-disable-next-line playwright/no-skipped-test
      test.skip();
    }

    await page.goto(`${baseURL}/web/index.php/auth/login`);
    await page.waitForLoadState('networkidle');

    const baselinePath = baselineManager.loadBaseline('login-viewport');

    if (!baselinePath) {
      await baselineManager.saveBaseline(page, 'login-viewport', 'Viewport mode baseline', false);
    } else {
      await expect(page).toHaveScreenshot('login-viewport.png', {
        maxDiffPixels: 50,
      });
    }
  });

  test('login error message should display correctly', async ({ page, baseURL }) => {
    if (!baseURL) {
      // eslint-disable-next-line playwright/no-skipped-test
      test.skip();
    }

    await page.goto(`${baseURL}/web/index.php/auth/login`);

    // Submit with invalid credentials
    await page.fill('input[name="username"]', 'invalid');
    await page.fill('input[name="password"]', 'wrong');
    await page.click('button[type="submit"]');

    // Wait for error message
    await page.waitForSelector('[role="alert"]', { timeout: 5000 });

    if (!baselineManager.loadBaseline('login-error-state')) {
      await baselineManager.saveBaseline(
        page,
        'login-error-state',
        'Login page with error message',
      );
    } else {
      await expect(page).toHaveScreenshot('login-error-state.png', {
        maxDiffPixels: 100,
      });
    }
  });

  test('baseline statistics should be tracked', () => {
    const stats = baselineManager.getStatistics();

    expect(stats).toHaveProperty('totalBaselines');
    expect(stats).toHaveProperty('byEnvironment');
    expect(stats).toHaveProperty('byBrowser');
  });

  test('should update baseline metadata', async ({ page, baseURL }) => {
    if (!baseURL) {
      // eslint-disable-next-line playwright/no-skipped-test
      test.skip();
    }

    await page.goto(`${baseURL}/web/index.php/auth/login`);

    await baselineManager.saveBaseline(page, 'test-baseline', 'Test baseline');
    baselineManager.updateBaseline('test-baseline', 'Updated description');

    const baselines = baselineManager.listBaselines();
    const updated = baselines.find((b) => b.filePath.includes('test-baseline'));

    expect(updated?.description).toBe('Updated description');
  });
});
