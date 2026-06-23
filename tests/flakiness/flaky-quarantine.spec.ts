/* eslint-disable security/detect-non-literal-fs-filename */
import { test, expect } from '@playwright/test';
import { FlakyDetector } from '../../src/flakiness/flaky-detector';
import { QuarantineManager } from '../../src/flakiness/quarantine-manager';
import * as fs from 'fs';
import * as path from 'path';

test.describe('Flaky Test Detection & Quarantine @flakiness', () => {
  let detector: FlakyDetector;
  let quarantine: QuarantineManager;
  const tmpDir = path.resolve(__dirname, '../../.tmp/flakiness');

  test.beforeEach(() => {
    if (!fs.existsSync(tmpDir)) {
      fs.mkdirSync(tmpDir, { recursive: true });
    }

    detector = new FlakyDetector({
      historyFile: path.join(tmpDir, 'test-history.json'),
      flakynessThreshold: 0.1,
      minRunsForDetection: 5,
    });

    quarantine = new QuarantineManager({
      quarantineFile: path.join(tmpDir, 'quarantine.json'),
      autoUnquarantineThreshold: 3,
    });
  });

  test.afterEach(() => {
    if (fs.existsSync(tmpDir)) {
      fs.rmSync(tmpDir, { recursive: true, force: true });
    }
  });

  test('should create flaky detector', () => {
    expect(detector).toBeDefined();
  });

  test('should create quarantine manager', () => {
    expect(quarantine).toBeDefined();
  });

  test('should record test run', () => {
    detector.recordTestRun('Login Test', true, 1500);

    expect(detector).toBeDefined();
  });

  test('should calculate flakiness for single test', () => {
    detector.recordTestRun('Flaky Test', true, 1000);
    detector.recordTestRun('Flaky Test', true, 1000);
    detector.recordTestRun('Flaky Test', false, 1000);

    const flakiness = detector.calculateFlakiness('Flaky Test');

    expect(flakiness).toBeGreaterThan(0);
    expect(flakiness).toBeLessThanOrEqual(1);
  });

  test('should detect stable test', () => {
    for (let i = 0; i < 10; i++) {
      detector.recordTestRun('Stable Test', true, 1000);
    }

    const flakiness = detector.calculateFlakiness('Stable Test');

    expect(flakiness).toBe(0);
  });

  test('should detect flaky test with multiple failures', () => {
    for (let i = 0; i < 7; i++) {
      detector.recordTestRun('Flaky Test', true, 1000);
    }
    for (let i = 0; i < 3; i++) {
      detector.recordTestRun('Flaky Test', false, 1000);
    }

    const flakiness = detector.calculateFlakiness('Flaky Test');

    expect(flakiness).toBe(0.3);
  });

  test('should get flaky tests', () => {
    // Create multiple runs for detection threshold
    for (let i = 0; i < 10; i++) {
      detector.recordTestRun('Test A', i % 3 !== 0);
      detector.recordTestRun('Test B', true);
      detector.recordTestRun('Test C', i % 2 !== 0);
    }

    const flakyTests = detector.getFlakeyTests();

    expect(flakyTests.length).toBeGreaterThan(0);
  });

  test('should get test statistics', () => {
    detector.recordTestRun('Stats Test', true, 1000);
    detector.recordTestRun('Stats Test', true, 1200);
    detector.recordTestRun('Stats Test', false, 1100);

    const stats = detector.getTestStatistics('Stats Test');

    expect(stats.totalRuns).toBe(3);
    expect(stats.passes).toBe(2);
    expect(stats.failures).toBe(1);
    expect(stats.passRate).toBe((2 / 3) * 100);
    expect(stats.flakiness).toBe(1 / 3);
    expect(stats.averageDuration).toBeGreaterThan(0);
  });

  test('should check if test is flaky', () => {
    for (let i = 0; i < 10; i++) {
      detector.recordTestRun('Flaky Test', i % 2 === 0);
    }

    const isFlaky = detector.isTestFlaky('Flaky Test');

    expect(isFlaky).toBe(true);
  });

  test('should quarantine test', () => {
    quarantine.quarantineTest('test-001', 'Login Test', 'Fails intermittently');

    expect(quarantine.isQuarantined('test-001')).toBe(true);
  });

  test('should get quarantined test details', () => {
    quarantine.quarantineTest('test-002', 'Checkout Test', 'Network timeout');

    const test = quarantine.getQuarantinedTest('test-002');

    expect(test).toBeDefined();
    expect(test?.testName).toBe('Checkout Test');
    expect(test?.reason).toBe('Network timeout');
  });

  test('should unquarantine test', () => {
    quarantine.quarantineTest('test-003', 'Profile Test', 'Timing issue');
    quarantine.unquarantineTest('test-003');

    expect(quarantine.isQuarantined('test-003')).toBe(false);
  });

  test('should record test pass and increment counter', () => {
    quarantine.quarantineTest('test-004', 'API Test', 'Intermittent');
    quarantine.recordTestPass('test-004');

    const test = quarantine.getQuarantinedTest('test-004');

    expect(test?.consecutivePasses).toBe(1);
  });

  test('should auto-unquarantine after threshold passes', () => {
    quarantine.quarantineTest('test-005', 'Dashboard Test', 'Flaky');

    for (let i = 0; i < 3; i++) {
      quarantine.recordTestPass('test-005');
    }

    expect(quarantine.isQuarantined('test-005')).toBe(false);
  });

  test('should reset pass counter on failure', () => {
    quarantine.quarantineTest('test-006', 'Search Test', 'Intermittent');

    quarantine.recordTestPass('test-006');
    quarantine.recordTestPass('test-006');
    quarantine.recordTestFailure('test-006');

    const test = quarantine.getQuarantinedTest('test-006');

    expect(test?.consecutivePasses).toBe(0);
  });

  test('should get all quarantined tests', () => {
    quarantine.quarantineTest('test-007', 'Test A', 'Reason A');
    quarantine.quarantineTest('test-008', 'Test B', 'Reason B');
    quarantine.quarantineTest('test-009', 'Test C', 'Reason C');

    const tests = quarantine.getQuarantinedTests();

    expect(tests.length).toBe(3);
  });

  test('should get quarantine statistics', () => {
    quarantine.quarantineTest('test-010', 'Test 1', 'Reason 1');
    quarantine.quarantineTest('test-011', 'Test 2', 'Reason 2');

    quarantine.recordTestPass('test-010');
    quarantine.recordTestPass('test-010');
    quarantine.recordTestPass('test-011');

    const stats = quarantine.getQuarantineStats();

    expect(stats.totalQuarantined).toBeGreaterThanOrEqual(2);
    expect(stats.averageConsecutivePasses).toBeGreaterThan(0);
  });

  test('should detect flaky test and quarantine it', () => {
    // Record flaky pattern
    for (let i = 0; i < 10; i++) {
      detector.recordTestRun('Problematic Test', i % 4 !== 0);
    }

    const flakyTests = detector.getFlakeyTests();
    const problematic = flakyTests.find((t) => t.testName === 'Problematic Test');

    if (problematic) {
      quarantine.quarantineTest('prob-test-001', problematic.testName, 'High flakiness');
    }

    expect(quarantine.isQuarantined('prob-test-001')).toBe(true);
  });

  test('should track quarantine history', () => {
    quarantine.quarantineTest('test-012', 'History Test', 'Initial reason');

    const test = quarantine.getQuarantinedTest('test-012');

    expect(test?.quarantineDate).toBeDefined();
    expect(test?.reason).toBe('Initial reason');
  });

  test('should persist quarantine data to file', () => {
    quarantine.quarantineTest('test-013', 'Persist Test', 'Test persistence');

    const filePath = path.join(tmpDir, 'quarantine.json');

    expect(fs.existsSync(filePath)).toBe(true);
    const content = fs.readFileSync(filePath, 'utf-8');
    const data = JSON.parse(content);

    expect(data.length).toBeGreaterThan(0);
  });

  test('should persist test history to file', () => {
    detector.recordTestRun('Persist History Test', true, 1000);

    const filePath = path.join(tmpDir, 'test-history.json');

    expect(fs.existsSync(filePath)).toBe(true);
  });

  test('should clear all history', () => {
    detector.recordTestRun('Clear Test 1', true, 1000);
    detector.recordTestRun('Clear Test 2', false, 1000);

    detector.clear();

    const flakiness = detector.calculateFlakiness('Clear Test 1');

    expect(flakiness).toBe(0);
  });

  test('should clear all quarantined tests', () => {
    quarantine.quarantineTest('test-014', 'Clear Quarantine 1', 'Reason 1');
    quarantine.quarantineTest('test-015', 'Clear Quarantine 2', 'Reason 2');

    quarantine.clear();

    const tests = quarantine.getQuarantinedTests();

    expect(tests.length).toBe(0);
  });

  test('should handle empty detector gracefully', () => {
    const flakiness = detector.calculateFlakiness('Non-existent Test');

    expect(flakiness).toBe(0);
  });

  test('should handle zero runs in statistics', () => {
    const stats = detector.getTestStatistics('Non-existent Test');

    expect(stats.totalRuns).toBe(0);
    expect(stats.passRate).toBe(0);
    expect(stats.flakiness).toBe(0);
  });

  test('should track multiple tests independently', () => {
    detector.recordTestRun('Test X', true, 1000);
    detector.recordTestRun('Test X', true, 1000);
    detector.recordTestRun('Test Y', false, 1000);
    detector.recordTestRun('Test Y', false, 1000);

    const flakynessX = detector.calculateFlakiness('Test X');
    const flakynessY = detector.calculateFlakiness('Test Y');

    expect(flakynessX).toBe(0);
    expect(flakynessY).toBe(1);
  });

  test('should handle concurrent quarantine operations', () => {
    for (let i = 0; i < 5; i++) {
      quarantine.quarantineTest(`test-${i}`, `Test ${i}`, `Reason ${i}`);
    }

    const tests = quarantine.getQuarantinedTests();

    expect(tests.length).toBe(5);
  });
});
