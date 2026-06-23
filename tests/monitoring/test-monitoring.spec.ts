import { test, expect } from '@playwright/test';
import { TestMonitor } from '../../src/monitoring/test-monitor';

test.describe('Real-Time Test Monitoring @monitoring', () => {
  let monitor: TestMonitor;

  test.beforeEach(() => {
    monitor = new TestMonitor();
  });

  test('should record test start event', () => {
    monitor.recordEvent({
      timestamp: new Date().toISOString(),
      eventType: 'test-start',
      testName: 'test-login',
    });

    const events = monitor.getEvents({ testName: 'test-login' });
    expect(events.length).toBe(1);
    expect(events[0].eventType).toBe('test-start');
  });

  test('should record test end event', () => {
    monitor.recordEvent({
      timestamp: new Date().toISOString(),
      eventType: 'test-end',
      testName: 'test-login',
      duration: 1000,
    });

    const events = monitor.getEvents({ eventType: 'test-end' });
    expect(events.length).toBe(1);
    expect(events[0].duration).toBe(1000);
  });

  test('should track running tests', () => {
    monitor.recordEvent({
      timestamp: new Date().toISOString(),
      eventType: 'test-start',
      testName: 'test-1',
    });

    monitor.recordEvent({
      timestamp: new Date().toISOString(),
      eventType: 'test-start',
      testName: 'test-2',
    });

    const running = monitor.getRunningTests();
    expect(running.length).toBe(2);
    expect(running).toContain('test-1');
    expect(running).toContain('test-2');
  });

  test('should remove test from running when it ends', () => {
    monitor.recordEvent({
      timestamp: new Date().toISOString(),
      eventType: 'test-start',
      testName: 'test-1',
    });

    monitor.recordEvent({
      timestamp: new Date().toISOString(),
      eventType: 'test-end',
      testName: 'test-1',
      duration: 500,
    });

    const running = monitor.getRunningTests();
    expect(running.length).toBe(0);
  });

  test('should calculate test health', () => {
    monitor.recordEvent({
      timestamp: new Date().toISOString(),
      eventType: 'test-end',
      testName: 'test-1',
      duration: 500,
    });

    monitor.recordEvent({
      timestamp: new Date().toISOString(),
      eventType: 'test-end',
      testName: 'test-2',
      duration: 600,
    });

    const health = monitor.getHealth();
    expect(health.totalTests).toBe(2);
    expect(health.passedTests).toBe(2);
    expect(health.healthScore).toBe(100);
  });

  test('should track retry events', () => {
    monitor.recordEvent({
      timestamp: new Date().toISOString(),
      eventType: 'test-retry',
      testName: 'test-flaky',
      retryCount: 1,
    });

    const retries = monitor.getRetryCount('test-flaky');
    expect(retries).toBe(1);
  });

  test('should identify flaky tests', () => {
    monitor.recordEvent({
      timestamp: new Date().toISOString(),
      eventType: 'test-retry',
      testName: 'test-flaky-1',
      retryCount: 1,
    });

    monitor.recordEvent({
      timestamp: new Date().toISOString(),
      eventType: 'test-retry',
      testName: 'test-flaky-1',
      retryCount: 2,
    });

    const flaky = monitor.getFlakyTests();
    expect(flaky).toContain('test-flaky-1');
  });

  test('should track failed tests', () => {
    monitor.recordEvent({
      timestamp: new Date().toISOString(),
      eventType: 'test-fail',
      testName: 'test-failed',
      error: 'Assertion failed',
    });

    const failed = monitor.getFailedTests();
    expect(failed.length).toBe(1);
    expect(failed[0].error).toBe('Assertion failed');
  });

  test('should identify slow tests', () => {
    monitor.recordEvent({
      timestamp: new Date().toISOString(),
      eventType: 'test-end',
      testName: 'test-slow',
      duration: 10000,
    });

    monitor.recordEvent({
      timestamp: new Date().toISOString(),
      eventType: 'test-end',
      testName: 'test-fast',
      duration: 500,
    });

    const slow = monitor.getSlowTests(5000);
    expect(slow.length).toBe(1);
    expect(slow[0].name).toBe('test-slow');
  });

  test('should calculate average test duration', () => {
    monitor.recordEvent({
      timestamp: new Date().toISOString(),
      eventType: 'test-end',
      testName: 'test-1',
      duration: 1000,
    });

    monitor.recordEvent({
      timestamp: new Date().toISOString(),
      eventType: 'test-end',
      testName: 'test-1',
      duration: 3000,
    });

    const avg = monitor.getAverageTestDuration('test-1');
    expect(avg).toBe(2000);
  });

  test('should get realtime metrics', () => {
    monitor.recordEvent({
      timestamp: new Date().toISOString(),
      eventType: 'test-end',
      testName: 'test-1',
      duration: 1000,
    });

    monitor.recordEvent({
      timestamp: new Date().toISOString(),
      eventType: 'test-end',
      testName: 'test-2',
      duration: 1500,
    });

    const metrics = monitor.getRealtimeMetrics();
    expect(metrics.testCount).toBe(2);
    expect(metrics.passRate).toBe(100);
  });

  test('should track metrics history', () => {
    monitor.recordEvent({
      timestamp: new Date().toISOString(),
      eventType: 'test-end',
      testName: 'test-1',
      duration: 1000,
    });

    monitor.getRealtimeMetrics();

    monitor.recordEvent({
      timestamp: new Date().toISOString(),
      eventType: 'test-end',
      testName: 'test-2',
      duration: 1500,
    });

    monitor.getRealtimeMetrics();

    const history = monitor.getMetricsHistory();
    expect(history.length).toBe(2);
  });

  test('should determine if test suite is healthy', () => {
    monitor.recordEvent({
      timestamp: new Date().toISOString(),
      eventType: 'test-end',
      testName: 'test-1',
      duration: 1000,
    });

    const isHealthy = monitor.isTestHealthy(80);
    expect(isHealthy).toBe(true);
  });

  test('should filter events by type', () => {
    monitor.recordEvent({
      timestamp: new Date().toISOString(),
      eventType: 'test-start',
      testName: 'test-1',
    });

    monitor.recordEvent({
      timestamp: new Date().toISOString(),
      eventType: 'test-end',
      testName: 'test-1',
      duration: 1000,
    });

    const startEvents = monitor.getEvents({ eventType: 'test-start' });
    expect(startEvents.length).toBe(1);
  });

  test('should filter events by test name', () => {
    monitor.recordEvent({
      timestamp: new Date().toISOString(),
      eventType: 'test-start',
      testName: 'test-1',
    });

    monitor.recordEvent({
      timestamp: new Date().toISOString(),
      eventType: 'test-start',
      testName: 'test-2',
    });

    const test1Events = monitor.getEvents({ testName: 'test-1' });
    expect(test1Events.length).toBe(1);
    expect(test1Events[0].testName).toBe('test-1');
  });

  test('should clear all monitoring data', () => {
    monitor.recordEvent({
      timestamp: new Date().toISOString(),
      eventType: 'test-end',
      testName: 'test-1',
      duration: 1000,
    });

    monitor.clear();

    const events = monitor.getEvents();
    const health = monitor.getHealth();

    expect(events.length).toBe(0);
    expect(health.totalTests).toBe(0);
  });

  test('should emit events', (done) => {
    monitor.on('event', (event) => {
      expect(event.eventType).toBe('test-start');
      done();
    });

    monitor.recordEvent({
      timestamp: new Date().toISOString(),
      eventType: 'test-start',
      testName: 'test-1',
    });
  });

  test('should generate monitoring summary', () => {
    monitor.recordEvent({
      timestamp: new Date().toISOString(),
      eventType: 'test-end',
      testName: 'test-1',
      duration: 1000,
    });

    monitor.recordEvent({
      timestamp: new Date().toISOString(),
      eventType: 'test-retry',
      testName: 'test-flaky',
    });

    const summary = monitor.generateSummary();

    expect(summary).toContain('Test Monitoring Summary');
    expect(summary).toContain('Health Score');
    expect(summary).toContain('Realtime Metrics');
  });

  test('should calculate health with failed tests', () => {
    monitor.recordEvent({
      timestamp: new Date().toISOString(),
      eventType: 'test-end',
      testName: 'test-pass',
      duration: 1000,
    });

    monitor.recordEvent({
      timestamp: new Date().toISOString(),
      eventType: 'test-fail',
      testName: 'test-fail',
      error: 'Error',
    });

    const health = monitor.getHealth();

    expect(health.totalTests).toBe(2);
    expect(health.passedTests).toBe(1);
    expect(health.failedTests).toBe(1);
    expect(health.healthScore).toBe(50);
  });

  test('should calculate failure rate in metrics', () => {
    monitor.recordEvent({
      timestamp: new Date().toISOString(),
      eventType: 'test-end',
      testName: 'test-1',
      duration: 1000,
    });

    monitor.recordEvent({
      timestamp: new Date().toISOString(),
      eventType: 'test-fail',
      testName: 'test-2',
      error: 'Error',
    });

    const metrics = monitor.getRealtimeMetrics();

    expect(metrics.failureRate).toBe(50);
    expect(metrics.passRate).toBe(50);
  });
});
