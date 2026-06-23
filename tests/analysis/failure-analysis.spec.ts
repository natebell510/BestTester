import { test, expect } from '@playwright/test';
import {
  FailureAnalyzer,
  TestFailure,
  RecoveryStrategy,
} from '../../src/analysis/failure-analyzer';

test.describe('Test Failure Analysis @analysis', () => {
  let analyzer: FailureAnalyzer;

  test.beforeEach(() => {
    analyzer = new FailureAnalyzer();
  });

  test('should record a single failure', () => {
    const failure: TestFailure = {
      testName: 'Login Test',
      errorMessage: 'Connection timeout after 5000ms',
      timestamp: new Date().toISOString(),
      duration: 5000,
      retryCount: 0,
      environment: 'staging',
    };

    analyzer.recordFailure(failure);
    const patterns = analyzer.getFailurePatterns();

    expect(patterns.length).toBeGreaterThan(0);
  });

  test('should categorize timeout errors', () => {
    const failure: TestFailure = {
      testName: 'API Test',
      errorMessage: 'Request timeout - no response',
      timestamp: new Date().toISOString(),
      duration: 3000,
      retryCount: 0,
      environment: 'production',
    };

    analyzer.recordFailure(failure);
    const byCategory = analyzer.getFailuresByCategory('timeout');

    expect(byCategory.length).toBe(1);
    expect(byCategory[0].testName).toBe('API Test');
  });

  test('should categorize not-found errors', () => {
    const failure: TestFailure = {
      testName: 'Page Test',
      errorMessage: 'Element not found on page',
      timestamp: new Date().toISOString(),
      duration: 1000,
      retryCount: 1,
      environment: 'staging',
    };

    analyzer.recordFailure(failure);
    const byCategory = analyzer.getFailuresByCategory('not-found');

    expect(byCategory.length).toBe(1);
  });

  test('should categorize permission errors', () => {
    const failure: TestFailure = {
      testName: 'Auth Test',
      errorMessage: 'Permission denied - 403 Forbidden',
      timestamp: new Date().toISOString(),
      duration: 500,
      retryCount: 0,
      environment: 'production',
    };

    analyzer.recordFailure(failure);
    const byCategory = analyzer.getFailuresByCategory('permission');

    expect(byCategory.length).toBe(1);
  });

  test('should categorize network errors', () => {
    const failure: TestFailure = {
      testName: 'Network Test',
      errorMessage: 'Network connection failed',
      timestamp: new Date().toISOString(),
      duration: 2000,
      retryCount: 2,
      environment: 'staging',
    };

    analyzer.recordFailure(failure);
    const byCategory = analyzer.getFailuresByCategory('network');

    expect(byCategory.length).toBe(1);
  });

  test('should categorize assertion errors', () => {
    const failure: TestFailure = {
      testName: 'Assertion Test',
      errorMessage: 'Assertion failed: expected true but got false',
      timestamp: new Date().toISOString(),
      duration: 500,
      retryCount: 0,
      environment: 'staging',
    };

    analyzer.recordFailure(failure);
    const byCategory = analyzer.getFailuresByCategory('assertion');

    expect(byCategory.length).toBe(1);
  });

  test('should categorize memory errors', () => {
    const failure: TestFailure = {
      testName: 'Memory Test',
      errorMessage: 'Out of memory error',
      timestamp: new Date().toISOString(),
      duration: 1500,
      retryCount: 0,
      environment: 'production',
    };

    analyzer.recordFailure(failure);
    const byCategory = analyzer.getFailuresByCategory('memory');

    expect(byCategory.length).toBe(1);
  });

  test('should categorize unknown errors', () => {
    const failure: TestFailure = {
      testName: 'Unknown Test',
      errorMessage: 'Something went wrong',
      timestamp: new Date().toISOString(),
      duration: 1000,
      retryCount: 0,
      environment: 'staging',
    };

    analyzer.recordFailure(failure);
    const byCategory = analyzer.getFailuresByCategory('unknown');

    expect(byCategory.length).toBe(1);
  });

  test('should analyze failure patterns', () => {
    const failure1: TestFailure = {
      testName: 'Login Test',
      errorMessage: 'Connection timeout after 5000ms',
      timestamp: new Date().toISOString(),
      duration: 5000,
      retryCount: 0,
      environment: 'staging',
    };

    const failure2: TestFailure = {
      testName: 'Profile Test',
      errorMessage: 'Connection timeout after 5000ms',
      timestamp: new Date().toISOString(),
      duration: 5000,
      retryCount: 1,
      environment: 'staging',
    };

    analyzer.recordFailure(failure1);
    analyzer.recordFailure(failure2);

    const patterns = analyzer.getFailurePatterns();
    expect(patterns.length).toBeGreaterThan(0);

    const frequentPatterns = patterns.filter((p) => p.frequency > 1);
    expect(frequentPatterns.length).toBeGreaterThan(0);
  });

  test('should get frequent patterns', () => {
    analyzer.recordFailure({
      testName: 'Test 1',
      errorMessage: 'Timeout error',
      timestamp: new Date().toISOString(),
      duration: 1000,
      retryCount: 0,
      environment: 'staging',
    });

    analyzer.recordFailure({
      testName: 'Test 2',
      errorMessage: 'Timeout error',
      timestamp: new Date().toISOString(),
      duration: 1000,
      retryCount: 0,
      environment: 'staging',
    });

    analyzer.recordFailure({
      testName: 'Test 3',
      errorMessage: 'Timeout error',
      timestamp: new Date().toISOString(),
      duration: 1000,
      retryCount: 0,
      environment: 'staging',
    });

    const frequent = analyzer.getFrequentPatterns(2);
    expect(frequent.length).toBeGreaterThan(0);
    expect(frequent[0].frequency).toBeGreaterThanOrEqual(2);
  });

  test('should get failures by test name', () => {
    analyzer.recordFailure({
      testName: 'Login Test',
      errorMessage: 'Timeout',
      timestamp: new Date().toISOString(),
      duration: 1000,
      retryCount: 0,
      environment: 'staging',
    });

    analyzer.recordFailure({
      testName: 'Login Test',
      errorMessage: 'Network error',
      timestamp: new Date().toISOString(),
      duration: 2000,
      retryCount: 1,
      environment: 'staging',
    });

    const failures = analyzer.getFailuresByTest('Login Test');
    expect(failures.length).toBe(2);
  });

  test('should detect flaky tests', () => {
    analyzer.recordFailure({
      testName: 'Flaky Test',
      errorMessage: 'Failed',
      timestamp: new Date().toISOString(),
      duration: 1000,
      retryCount: 0,
      environment: 'staging',
    });

    analyzer.recordFailure({
      testName: 'Flaky Test',
      errorMessage: 'Failed',
      timestamp: new Date().toISOString(),
      duration: 1000,
      retryCount: 1,
      environment: 'staging',
    });

    const flaky = analyzer.getFlakeyTests(0.5);
    expect(flaky.length).toBeGreaterThan(0);
    expect(flaky).toContain('Flaky Test');
  });

  test('should suggest retry strategy for timeout', () => {
    const failure: TestFailure = {
      testName: 'Timeout Test',
      errorMessage: 'Connection timeout',
      timestamp: new Date().toISOString(),
      duration: 5000,
      retryCount: 0,
      environment: 'staging',
    };

    const strategy = analyzer.suggestRecoveryStrategy(failure);

    expect(strategy).toBeDefined();
    expect(strategy?.strategy).toBe('retry');
    expect(strategy?.maxRetries).toBe(3);
    expect(strategy?.delayMs).toBe(1000);
  });

  test('should suggest retry strategy for network errors', () => {
    const failure: TestFailure = {
      testName: 'Network Test',
      errorMessage: 'Network connection failed',
      timestamp: new Date().toISOString(),
      duration: 2000,
      retryCount: 0,
      environment: 'staging',
    };

    const strategy = analyzer.suggestRecoveryStrategy(failure);

    expect(strategy).toBeDefined();
    expect(strategy?.strategy).toBe('retry');
    expect(strategy?.maxRetries).toBe(5);
    expect(strategy?.delayMs).toBe(2000);
  });

  test('should suggest notify strategy for permission errors', () => {
    const failure: TestFailure = {
      testName: 'Permission Test',
      errorMessage: 'Permission denied',
      timestamp: new Date().toISOString(),
      duration: 500,
      retryCount: 0,
      environment: 'production',
    };

    const strategy = analyzer.suggestRecoveryStrategy(failure);

    expect(strategy).toBeDefined();
    expect(strategy?.strategy).toBe('notify');
  });

  test('should suggest skip strategy for memory errors', () => {
    const failure: TestFailure = {
      testName: 'Memory Test',
      errorMessage: 'Out of memory',
      timestamp: new Date().toISOString(),
      duration: 1500,
      retryCount: 0,
      environment: 'production',
    };

    const strategy = analyzer.suggestRecoveryStrategy(failure);

    expect(strategy).toBeDefined();
    expect(strategy?.strategy).toBe('skip');
  });

  test('should suggest ignore strategy for assertion errors', () => {
    const failure: TestFailure = {
      testName: 'Assertion Test',
      errorMessage: 'Assertion failed',
      timestamp: new Date().toISOString(),
      duration: 500,
      retryCount: 0,
      environment: 'staging',
    };

    const strategy = analyzer.suggestRecoveryStrategy(failure);

    expect(strategy).toBeDefined();
    expect(strategy?.strategy).toBe('ignore');
  });

  test('should register recovery strategy', () => {
    const strategy: RecoveryStrategy = {
      failurePattern: 'custom-timeout',
      strategy: 'retry',
      maxRetries: 2,
      delayMs: 500,
    };

    analyzer.registerRecoveryStrategy(strategy);
    const strategies = analyzer.getRecoveryStrategies();

    expect(strategies.length).toBe(1);
    expect(strategies[0].failurePattern).toBe('custom-timeout');
  });

  test('should generate analysis report', () => {
    analyzer.recordFailure({
      testName: 'Test 1',
      errorMessage: 'Timeout',
      timestamp: new Date().toISOString(),
      duration: 1000,
      retryCount: 0,
      environment: 'staging',
    });

    analyzer.recordFailure({
      testName: 'Test 2',
      errorMessage: 'Network error',
      timestamp: new Date().toISOString(),
      duration: 2000,
      retryCount: 1,
      environment: 'staging',
    });

    const report = analyzer.generateAnalysisReport();

    expect(report).toContain('Test Failure Analysis Report');
    expect(report).toContain('Total Failures: 2');
  });

  test('should get recovery recommendations', () => {
    analyzer.recordFailure({
      testName: 'Test 1',
      errorMessage: 'Timeout',
      timestamp: new Date().toISOString(),
      duration: 1000,
      retryCount: 0,
      environment: 'staging',
    });

    analyzer.recordFailure({
      testName: 'Test 2',
      errorMessage: 'Timeout',
      timestamp: new Date().toISOString(),
      duration: 1000,
      retryCount: 0,
      environment: 'staging',
    });

    const recommendations = analyzer.getRecoveryRecommendations();

    expect(recommendations.size).toBeGreaterThan(0);
  });

  test('should calculate average failure duration', () => {
    analyzer.recordFailure({
      testName: 'Test 1',
      errorMessage: 'Failed',
      timestamp: new Date().toISOString(),
      duration: 1000,
      retryCount: 0,
      environment: 'staging',
    });

    analyzer.recordFailure({
      testName: 'Test 2',
      errorMessage: 'Failed',
      timestamp: new Date().toISOString(),
      duration: 3000,
      retryCount: 0,
      environment: 'staging',
    });

    const avg = analyzer.getAverageFailureDuration();

    expect(avg).toBe(2000);
  });

  test('should get critical failures', () => {
    analyzer.recordFailure({
      testName: 'Critical Test',
      errorMessage: 'Permission denied',
      timestamp: new Date().toISOString(),
      duration: 500,
      retryCount: 0,
      environment: 'production',
    });

    analyzer.recordFailure({
      testName: 'Network Test',
      errorMessage: 'Connection failed',
      timestamp: new Date().toISOString(),
      duration: 2000,
      retryCount: 0,
      environment: 'production',
    });

    analyzer.recordFailure({
      testName: 'Memory Test',
      errorMessage: 'Out of memory',
      timestamp: new Date().toISOString(),
      duration: 1500,
      retryCount: 0,
      environment: 'production',
    });

    const critical = analyzer.getCriticalFailures();

    expect(critical.length).toBeGreaterThan(0);
  });

  test('should clear all data', () => {
    analyzer.recordFailure({
      testName: 'Test 1',
      errorMessage: 'Failed',
      timestamp: new Date().toISOString(),
      duration: 1000,
      retryCount: 0,
      environment: 'staging',
    });

    analyzer.clear();

    const patterns = analyzer.getFailurePatterns();
    expect(patterns.length).toBe(0);
  });

  test('should handle empty analyzer', () => {
    const patterns = analyzer.getFailurePatterns();
    const frequent = analyzer.getFrequentPatterns();
    const flaky = analyzer.getFlakeyTests();
    const avg = analyzer.getAverageFailureDuration();

    expect(patterns.length).toBe(0);
    expect(frequent.length).toBe(0);
    expect(flaky.length).toBe(0);
    expect(avg).toBe(0);
  });

  test('should track pattern details', () => {
    analyzer.recordFailure({
      testName: 'Test A',
      errorMessage: 'Connection timeout',
      timestamp: new Date().toISOString(),
      duration: 5000,
      retryCount: 0,
      environment: 'staging',
    });

    analyzer.recordFailure({
      testName: 'Test B',
      errorMessage: 'Connection timeout',
      timestamp: new Date().toISOString(),
      duration: 5000,
      retryCount: 1,
      environment: 'staging',
    });

    const patterns = analyzer.getFailurePatterns();
    const pattern = patterns[0];

    expect(pattern.frequency).toBe(2);
    expect(pattern.affectedTests).toContain('Test A');
    expect(pattern.affectedTests).toContain('Test B');
    expect(pattern.category).toBe('timeout');
  });

  test('should filter by category 404 error', () => {
    analyzer.recordFailure({
      testName: 'NotFound Test',
      errorMessage: 'Error 404 - Page not found',
      timestamp: new Date().toISOString(),
      duration: 1000,
      retryCount: 0,
      environment: 'staging',
    });

    const byCategory = analyzer.getFailuresByCategory('not-found');
    expect(byCategory.length).toBe(1);
  });

  test('should filter by category 403 error', () => {
    analyzer.recordFailure({
      testName: 'Forbidden Test',
      errorMessage: 'Error 403 - Forbidden',
      timestamp: new Date().toISOString(),
      duration: 500,
      retryCount: 0,
      environment: 'production',
    });

    const byCategory = analyzer.getFailuresByCategory('permission');
    expect(byCategory.length).toBe(1);
  });

  test('should track multiple failure categories', () => {
    analyzer.recordFailure({
      testName: 'Test 1',
      errorMessage: 'Timeout error',
      timestamp: new Date().toISOString(),
      duration: 5000,
      retryCount: 0,
      environment: 'staging',
    });

    analyzer.recordFailure({
      testName: 'Test 2',
      errorMessage: 'Network error',
      timestamp: new Date().toISOString(),
      duration: 2000,
      retryCount: 0,
      environment: 'staging',
    });

    const report = analyzer.generateAnalysisReport();

    expect(report).toContain('timeout');
    expect(report).toContain('network');
  });
});
