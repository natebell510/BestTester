import { test, expect } from '@playwright/test';
import { PerformanceCollector } from '../../src/performance/performance-collector';
import { PerformanceBudget } from '../../src/performance/performance-budget';

test.describe('Dashboard - Performance Tests @performance', () => {
  let collector: PerformanceCollector;
  let budget: PerformanceBudget;
  const env = process.env.TEST_ENV || 'dev';

  test.beforeEach(() => {
    collector = new PerformanceCollector();
    budget = new PerformanceBudget();
  });

  test.beforeEach(async ({ page, baseURL }) => {
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

  test('dashboard should load within performance budget', async ({ page }) => {
    await collector.waitForMetricsStability(page);
    const metrics = await collector.collectMetrics(page);

    const violations = budget.checkMetrics(metrics, env);
    const failViolations = violations.filter((v) => v.status === 'fail');

    expect(failViolations, 'Performance budget violations').toHaveLength(0);
  });

  test('dashboard LCP should be under 3 seconds', async ({ page }) => {
    await collector.waitForMetricsStability(page);
    const metrics = await collector.collectMetrics(page);

    expect(metrics.lcp).toBeLessThan(3000);
  });

  test('dashboard should maintain good CLS', async ({ page }) => {
    await collector.waitForMetricsStability(page);
    const metrics = await collector.collectMetrics(page);

    expect(metrics.cls).toBeLessThan(0.25);
  });

  test('dashboard TTFB should be reasonable', async ({ page }) => {
    const metrics = await collector.collectMetrics(page);

    expect(metrics.ttfb).toBeLessThan(2000);
  });
});
