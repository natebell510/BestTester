import { test, expect } from '@playwright/test';
import { TestResultAggregator, TestResult } from '../../src/reporting/test-result-aggregator';
import * as fs from 'fs';
import * as path from 'path';

test.describe('Test Result Aggregation @reporting', () => {
  let aggregator: TestResultAggregator;
  const testReportDir = path.resolve(__dirname, '../../.tmp/test-reports');

  test.beforeEach(() => {
    aggregator = new TestResultAggregator(testReportDir);
  });

  test.afterEach(() => {
    if (fs.existsSync(testReportDir)) {
      fs.rmSync(testReportDir, { recursive: true, force: true });
    }
  });

  test('should add test results', () => {
    const result: TestResult = {
      testName: 'test-login',
      status: 'passed',
      duration: 1000,
      category: 'ui',
      timestamp: new Date().toISOString(),
    };

    aggregator.addResult(result);
    const results = aggregator.getResults();

    expect(results.length).toBe(1);
    expect(results[0].testName).toBe('test-login');
  });

  test('should track test categories', () => {
    aggregator.addResult({
      testName: 'test-login',
      status: 'passed',
      duration: 1000,
      category: 'ui',
      timestamp: new Date().toISOString(),
    });

    aggregator.addResult({
      testName: 'test-api',
      status: 'failed',
      duration: 2000,
      category: 'api',
      errorMessage: 'API error',
      timestamp: new Date().toISOString(),
    });

    const report = aggregator.getAggregatedReport();

    expect(report.categories.ui).toBeDefined();
    expect(report.categories.api).toBeDefined();
    expect(report.categories.ui.passed).toBe(1);
    expect(report.categories.api.failed).toBe(1);
  });

  test('should calculate pass rate', () => {
    aggregator.addResult({
      testName: 'test-1',
      status: 'passed',
      duration: 500,
      category: 'ui',
      timestamp: new Date().toISOString(),
    });

    aggregator.addResult({
      testName: 'test-2',
      status: 'passed',
      duration: 500,
      category: 'ui',
      timestamp: new Date().toISOString(),
    });

    aggregator.addResult({
      testName: 'test-3',
      status: 'failed',
      duration: 500,
      category: 'ui',
      timestamp: new Date().toISOString(),
    });

    const report = aggregator.getAggregatedReport();

    expect(report.passRate).toBe((2 / 3) * 100);
  });

  test('should track test suites', () => {
    aggregator.addResult({
      testName: 'test-login',
      status: 'passed',
      duration: 1000,
      category: 'auth',
      timestamp: new Date().toISOString(),
    });

    aggregator.addResult({
      testName: 'test-logout',
      status: 'passed',
      duration: 800,
      category: 'auth',
      timestamp: new Date().toISOString(),
    });

    const suite = aggregator.getSuite('auth');

    expect(suite).toBeDefined();
    expect(suite?.totalTests).toBe(2);
    expect(suite?.passed).toBe(2);
    expect(suite?.duration).toBe(1800);
  });

  test('should generate HTML report', () => {
    aggregator.addResult({
      testName: 'test-1',
      status: 'passed',
      duration: 500,
      category: 'ui',
      timestamp: new Date().toISOString(),
    });

    aggregator.generateHTMLReport('test-report.html');

    const reportPath = path.join(testReportDir, 'test-report.html');
    expect(fs.existsSync(reportPath)).toBe(true);

    const content = fs.readFileSync(reportPath, 'utf-8');
    expect(content).toContain('Test Execution Report');
    expect(content).toContain('test-1');
  });

  test('should generate JSON report', () => {
    aggregator.addResult({
      testName: 'test-1',
      status: 'passed',
      duration: 500,
      category: 'ui',
      timestamp: new Date().toISOString(),
    });

    aggregator.generateJSONReport('test-report.json');

    const reportPath = path.join(testReportDir, 'test-report.json');
    expect(fs.existsSync(reportPath)).toBe(true);

    const content = JSON.parse(fs.readFileSync(reportPath, 'utf-8'));
    expect(content.totalTests).toBe(1);
    expect(content.passed).toBe(1);
  });

  test('should filter failed tests', () => {
    aggregator.addResult({
      testName: 'test-1',
      status: 'passed',
      duration: 500,
      category: 'ui',
      timestamp: new Date().toISOString(),
    });

    aggregator.addResult({
      testName: 'test-2',
      status: 'failed',
      duration: 500,
      category: 'ui',
      errorMessage: 'Assertion failed',
      timestamp: new Date().toISOString(),
    });

    const failed = aggregator.getFailedTests();

    expect(failed.length).toBe(1);
    expect(failed[0].testName).toBe('test-2');
  });

  test('should filter passed tests', () => {
    aggregator.addResult({
      testName: 'test-1',
      status: 'passed',
      duration: 500,
      category: 'ui',
      timestamp: new Date().toISOString(),
    });

    aggregator.addResult({
      testName: 'test-2',
      status: 'failed',
      duration: 500,
      category: 'ui',
      timestamp: new Date().toISOString(),
    });

    const passed = aggregator.getPassedTests();

    expect(passed.length).toBe(1);
    expect(passed[0].testName).toBe('test-1');
  });

  test('should filter skipped tests', () => {
    aggregator.addResult({
      testName: 'test-1',
      status: 'passed',
      duration: 500,
      category: 'ui',
      timestamp: new Date().toISOString(),
    });

    aggregator.addResult({
      testName: 'test-2',
      status: 'skipped',
      duration: 0,
      category: 'ui',
      timestamp: new Date().toISOString(),
    });

    const skipped = aggregator.getSkippedTests();

    expect(skipped.length).toBe(1);
    expect(skipped[0].testName).toBe('test-2');
  });

  test('should get slowest tests', () => {
    aggregator.addResult({
      testName: 'test-1',
      status: 'passed',
      duration: 1000,
      category: 'ui',
      timestamp: new Date().toISOString(),
    });

    aggregator.addResult({
      testName: 'test-2',
      status: 'passed',
      duration: 5000,
      category: 'ui',
      timestamp: new Date().toISOString(),
    });

    aggregator.addResult({
      testName: 'test-3',
      status: 'passed',
      duration: 2000,
      category: 'ui',
      timestamp: new Date().toISOString(),
    });

    const slowest = aggregator.getSlowestTests(2);

    expect(slowest.length).toBe(2);
    expect(slowest[0].testName).toBe('test-2');
    expect(slowest[1].testName).toBe('test-3');
  });

  test('should save raw results', () => {
    aggregator.addResult({
      testName: 'test-1',
      status: 'passed',
      duration: 500,
      category: 'ui',
      timestamp: new Date().toISOString(),
    });

    aggregator.saveResults('raw-results.json');

    const filepath = path.join(testReportDir, 'raw-results.json');
    expect(fs.existsSync(filepath)).toBe(true);

    const results = JSON.parse(fs.readFileSync(filepath, 'utf-8'));
    expect(results.length).toBe(1);
    expect(results[0].testName).toBe('test-1');
  });

  test('should load raw results', () => {
    const testData: TestResult = {
      testName: 'test-loaded',
      status: 'passed',
      duration: 500,
      category: 'ui',
      timestamp: new Date().toISOString(),
    };

    aggregator.addResult(testData);
    aggregator.saveResults('raw-results.json');

    const aggregator2 = new TestResultAggregator(testReportDir);
    aggregator2.loadResults('raw-results.json');

    const results = aggregator2.getResults();
    expect(results.length).toBe(1);
    expect(results[0].testName).toBe('test-loaded');
  });

  test('should calculate total duration', () => {
    aggregator.addResult({
      testName: 'test-1',
      status: 'passed',
      duration: 1000,
      category: 'ui',
      timestamp: new Date().toISOString(),
    });

    aggregator.addResult({
      testName: 'test-2',
      status: 'passed',
      duration: 2000,
      category: 'ui',
      timestamp: new Date().toISOString(),
    });

    const report = aggregator.getAggregatedReport();

    expect(report.totalDuration).toBe(3000);
  });

  test('should aggregate multiple suites', () => {
    aggregator.addResult({
      testName: 'test-1',
      status: 'passed',
      duration: 500,
      category: 'ui',
      timestamp: new Date().toISOString(),
    });

    aggregator.addResult({
      testName: 'test-2',
      status: 'passed',
      duration: 300,
      category: 'api',
      timestamp: new Date().toISOString(),
    });

    aggregator.addResult({
      testName: 'test-3',
      status: 'passed',
      duration: 200,
      category: 'performance',
      timestamp: new Date().toISOString(),
    });

    const suites = aggregator.getAllSuites();

    expect(suites.length).toBe(3);
    expect(suites.map((s) => s.name)).toContain('ui');
    expect(suites.map((s) => s.name)).toContain('api');
    expect(suites.map((s) => s.name)).toContain('performance');
  });
});
