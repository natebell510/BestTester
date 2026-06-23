import { test, expect } from '@playwright/test';
import { PerformanceCollector } from '../../src/performance/performance-collector';
import { PerformanceBudget } from '../../src/performance/performance-budget';
import { PerformanceReporter } from '../../src/performance/performance-reporter';

test.describe('Login Page - Performance Tests @performance', () => {
  let collector: PerformanceCollector;
  let budget: PerformanceBudget;
  let reporter: PerformanceReporter;
  const env = process.env.TEST_ENV || 'dev';

  test.beforeAll(() => {
    collector = new PerformanceCollector();
    budget = new PerformanceBudget();
    reporter = new PerformanceReporter();
  });

  test.afterAll(() => {
    reporter.saveHTMLReport();
  });

  test('login page should load within performance budget', async ({ page, baseURL }) => {
    if (!baseURL) {
      // eslint-disable-next-line playwright/no-skipped-test
      test.skip();
    }

    await page.goto(`${baseURL}/web/index.php/auth/login`);
    await collector.waitForMetricsStability(page);

    const metrics = await collector.collectMetrics(page);
    const violations = budget.checkMetrics(metrics, env);

    if (violations.length > 0) {
      const report = budget.generateReport(violations);
      // eslint-disable-next-line no-console
      console.log(report);

      const failViolations = violations.filter((v) => v.status === 'fail');
      expect(failViolations, 'Performance budget violations').toHaveLength(0);
    }

    reporter.recordMetrics([metrics]);
  });

  test('LCP should be under 4 seconds', async ({ page, baseURL }) => {
    if (!baseURL) {
      // eslint-disable-next-line playwright/no-skipped-test
      test.skip();
    }

    await page.goto(`${baseURL}/web/index.php/auth/login`);
    await collector.waitForMetricsStability(page);

    const metrics = await collector.collectMetrics(page);
    expect(metrics.lcp).toBeLessThan(4000);
  });

  test('TTFB should be under 2 seconds', async ({ page, baseURL }) => {
    if (!baseURL) {
      // eslint-disable-next-line playwright/no-skipped-test
      test.skip();
    }

    await page.goto(`${baseURL}/web/index.php/auth/login`);
    const metrics = await collector.collectMetrics(page);

    expect(metrics.ttfb).toBeLessThan(2000);
  });

  test('CLS should be minimal', async ({ page, baseURL }) => {
    if (!baseURL) {
      // eslint-disable-next-line playwright/no-skipped-test
      test.skip();
    }

    await page.goto(`${baseURL}/web/index.php/auth/login`);
    await collector.waitForMetricsStability(page);

    const metrics = await collector.collectMetrics(page);
    expect(metrics.cls).toBeLessThan(0.25);
  });

  test('web vitals should be reported', async ({ page, baseURL }) => {
    if (!baseURL) {
      // eslint-disable-next-line playwright/no-skipped-test
      test.skip();
    }

    await page.goto(`${baseURL}/web/index.php/auth/login`);
    await collector.waitForMetricsStability(page);

    const metrics = await collector.collectMetrics(page);
    const vitals = collector.calculateWebVitals(metrics);

    expect(vitals.LCP).toBeDefined();
    expect(vitals.TTFB).toBeDefined();
    // eslint-disable-next-line no-console
    console.log('Web Vitals:', vitals);
  });
});
