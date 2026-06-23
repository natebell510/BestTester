import { test, expect } from '@playwright/test';
import { TestMetricsCollector } from '../../src/analytics/test-metrics-collector';
import * as fs from 'fs';
import * as path from 'path';

test.describe('Test Metrics Collection @analytics', () => {
  let collector: TestMetricsCollector;
  const metricsDir = path.resolve(__dirname, '../../.tmp/metrics');

  test.beforeEach(() => {
    collector = new TestMetricsCollector(metricsDir);
  });

  test.afterEach(() => {
    if (fs.existsSync(metricsDir)) {
      fs.rmSync(metricsDir, { recursive: true, force: true });
    }
  });

  test('should record single metric', () => {
    const metric = {
      testName: 'test-login',
      duration: 1000,
      memoryUsed: 50,
      cpuUsage: 25,
      timestamp: new Date().toISOString(),
      retryCount: 0,
      flakiness: 0,
    };

    collector.recordMetric(metric);
    const metrics = collector.getMetrics();

    expect(metrics.length).toBe(1);
    expect(metrics[0].testName).toBe('test-login');
  });

  test('should record multiple metrics', () => {
    const metrics = [
      {
        testName: 'test-1',
        duration: 1000,
        memoryUsed: 50,
        cpuUsage: 25,
        timestamp: new Date().toISOString(),
        retryCount: 0,
        flakiness: 0,
      },
      {
        testName: 'test-2',
        duration: 2000,
        memoryUsed: 60,
        cpuUsage: 35,
        timestamp: new Date().toISOString(),
        retryCount: 0,
        flakiness: 0,
      },
    ];

    collector.recordMultiple(metrics);
    const recorded = collector.getMetrics();

    expect(recorded.length).toBe(2);
  });

  test('should filter slow tests', () => {
    collector.recordMetric({
      testName: 'test-slow',
      duration: 10000,
      memoryUsed: 50,
      cpuUsage: 25,
      timestamp: new Date().toISOString(),
      retryCount: 0,
      flakiness: 0,
    });

    collector.recordMetric({
      testName: 'test-fast',
      duration: 500,
      memoryUsed: 50,
      cpuUsage: 25,
      timestamp: new Date().toISOString(),
      retryCount: 0,
      flakiness: 0,
    });

    const slow = collector.getSlowTests(5000);

    expect(slow.length).toBe(1);
    expect(slow[0].testName).toBe('test-slow');
  });

  test('should identify flaky tests', () => {
    collector.recordMetric({
      testName: 'test-flaky',
      duration: 1000,
      memoryUsed: 50,
      cpuUsage: 25,
      timestamp: new Date().toISOString(),
      retryCount: 2,
      flakiness: 0.5,
    });

    collector.recordMetric({
      testName: 'test-stable',
      duration: 1000,
      memoryUsed: 50,
      cpuUsage: 25,
      timestamp: new Date().toISOString(),
      retryCount: 0,
      flakiness: 0,
    });

    const flaky = collector.getFlakyTests(0.2);

    expect(flaky.length).toBeGreaterThan(0);
  });

  test('should calculate performance metrics', () => {
    collector.recordMetric({
      testName: 'test-1',
      duration: 1000,
      memoryUsed: 50,
      cpuUsage: 25,
      timestamp: new Date().toISOString(),
      retryCount: 0,
      flakiness: 0,
    });

    collector.recordMetric({
      testName: 'test-2',
      duration: 3000,
      memoryUsed: 60,
      cpuUsage: 35,
      timestamp: new Date().toISOString(),
      retryCount: 0,
      flakiness: 0,
    });

    const perf = collector.getPerformanceMetrics();

    expect(perf.averageTestDuration).toBeGreaterThan(0);
    expect(perf.medianDuration).toBeGreaterThan(0);
    expect(perf.slowestTests.length).toBeGreaterThan(0);
  });

  test('should track slowest tests', () => {
    collector.recordMetric({
      testName: 'test-slow-1',
      duration: 5000,
      memoryUsed: 50,
      cpuUsage: 25,
      timestamp: new Date().toISOString(),
      retryCount: 0,
      flakiness: 0,
    });

    collector.recordMetric({
      testName: 'test-slow-2',
      duration: 3000,
      memoryUsed: 50,
      cpuUsage: 25,
      timestamp: new Date().toISOString(),
      retryCount: 0,
      flakiness: 0,
    });

    const perf = collector.getPerformanceMetrics();
    const slowest = perf.slowestTests[0];

    expect(slowest.duration).toBe(5000);
  });

  test('should track fastest tests', () => {
    collector.recordMetric({
      testName: 'test-fast-1',
      duration: 100,
      memoryUsed: 50,
      cpuUsage: 25,
      timestamp: new Date().toISOString(),
      retryCount: 0,
      flakiness: 0,
    });

    collector.recordMetric({
      testName: 'test-fast-2',
      duration: 500,
      memoryUsed: 50,
      cpuUsage: 25,
      timestamp: new Date().toISOString(),
      retryCount: 0,
      flakiness: 0,
    });

    const perf = collector.getPerformanceMetrics();
    const fastest = perf.fastestTests[0];

    expect(fastest.duration).toBe(100);
  });

  test('should calculate average test duration', () => {
    collector.recordMetric({
      testName: 'test-1',
      duration: 1000,
      memoryUsed: 50,
      cpuUsage: 25,
      timestamp: new Date().toISOString(),
      retryCount: 0,
      flakiness: 0,
    });

    collector.recordMetric({
      testName: 'test-1',
      duration: 3000,
      memoryUsed: 50,
      cpuUsage: 25,
      timestamp: new Date().toISOString(),
      retryCount: 0,
      flakiness: 0,
    });

    const avg = collector.getAverageTestDuration('test-1');

    expect(avg).toBe(2000);
  });

  test('should get retry statistics', () => {
    collector.recordMetric({
      testName: 'test-1',
      duration: 1000,
      memoryUsed: 50,
      cpuUsage: 25,
      timestamp: new Date().toISOString(),
      retryCount: 2,
      flakiness: 0,
    });

    collector.recordMetric({
      testName: 'test-2',
      duration: 1000,
      memoryUsed: 50,
      cpuUsage: 25,
      timestamp: new Date().toISOString(),
      retryCount: 1,
      flakiness: 0,
    });

    const stats = collector.getRetryStats();

    expect(stats.totalRetries).toBe(3);
    expect(stats.averageRetriesPerTest).toBe(1.5);
  });

  test('should get memory statistics', () => {
    collector.recordMetric({
      testName: 'test-1',
      duration: 1000,
      memoryUsed: 50,
      cpuUsage: 25,
      timestamp: new Date().toISOString(),
      retryCount: 0,
      flakiness: 0,
    });

    collector.recordMetric({
      testName: 'test-2',
      duration: 1000,
      memoryUsed: 100,
      cpuUsage: 25,
      timestamp: new Date().toISOString(),
      retryCount: 0,
      flakiness: 0,
    });

    const stats = collector.getMemoryStats();

    expect(stats.totalMemory).toBe(150);
    expect(stats.averageMemory).toBe(75);
    expect(stats.peakMemory).toBe(100);
  });

  test('should get trend data', () => {
    collector.recordMetric({
      testName: 'test-1',
      duration: 1000,
      memoryUsed: 50,
      cpuUsage: 25,
      timestamp: new Date().toISOString(),
      retryCount: 0,
      flakiness: 0,
    });

    const trends = collector.getTrendData(30);

    expect(trends.length).toBeGreaterThan(0);
    expect(trends[0]).toHaveProperty('date');
    expect(trends[0]).toHaveProperty('totalTests');
  });

  test('should save and load metrics', () => {
    const metric = {
      testName: 'test-1',
      duration: 1000,
      memoryUsed: 50,
      cpuUsage: 25,
      timestamp: new Date().toISOString(),
      retryCount: 0,
      flakiness: 0,
    };

    collector.recordMetric(metric);
    collector.saveMetrics('test-metrics.json');

    const collector2 = new TestMetricsCollector(metricsDir);
    collector2.loadMetrics('test-metrics.json');

    const loaded = collector2.getMetrics();

    expect(loaded.length).toBe(1);
    expect(loaded[0].testName).toBe('test-1');
  });

  test('should generate metrics report', () => {
    collector.recordMetric({
      testName: 'test-1',
      duration: 1000,
      memoryUsed: 50,
      cpuUsage: 25,
      timestamp: new Date().toISOString(),
      retryCount: 0,
      flakiness: 0,
    });

    const report = collector.generateReport();

    expect(report).toContain('Test Metrics Report');
    expect(report).toContain('Performance Metrics');
    expect(report).toContain('Average Test Duration');
  });

  test('should get metrics by specific test', () => {
    collector.recordMetric({
      testName: 'test-1',
      duration: 1000,
      memoryUsed: 50,
      cpuUsage: 25,
      timestamp: new Date().toISOString(),
      retryCount: 0,
      flakiness: 0,
    });

    collector.recordMetric({
      testName: 'test-2',
      duration: 2000,
      memoryUsed: 60,
      cpuUsage: 35,
      timestamp: new Date().toISOString(),
      retryCount: 0,
      flakiness: 0,
    });

    const test1Metrics = collector.getMetricsByTest('test-1');

    expect(test1Metrics.length).toBe(1);
    expect(test1Metrics[0].testName).toBe('test-1');
  });

  test('should calculate standard deviation', () => {
    collector.recordMetric({
      testName: 'test-1',
      duration: 100,
      memoryUsed: 50,
      cpuUsage: 25,
      timestamp: new Date().toISOString(),
      retryCount: 0,
      flakiness: 0,
    });

    collector.recordMetric({
      testName: 'test-2',
      duration: 200,
      memoryUsed: 50,
      cpuUsage: 25,
      timestamp: new Date().toISOString(),
      retryCount: 0,
      flakiness: 0,
    });

    const perf = collector.getPerformanceMetrics();

    expect(perf.standardDeviation).toBeGreaterThan(0);
  });
});
