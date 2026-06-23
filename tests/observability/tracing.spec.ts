import { test, expect } from '@playwright/test';
import { TestTracer, initializeGlobalTracer } from '../../src/observability/tracer';
import { TestMetrics, initializeGlobalMetrics } from '../../src/observability/metrics';

test.describe('OpenTelemetry Tracing @observability', () => {
  let tracer: TestTracer;
  let metrics: TestMetrics;

  test.beforeEach(() => {
    tracer = initializeGlobalTracer({
      serviceName: 'besttester-tests',
      environment: 'test',
      enableConsoleExport: false,
    });

    metrics = initializeGlobalMetrics({
      serviceName: 'besttester-tests',
      environment: 'test',
    });
  });

  test('should initialize tracer', () => {
    expect(tracer).toBeDefined();
  });

  test('should initialize metrics', () => {
    expect(metrics).toBeDefined();
  });

  test('should start test span', () => {
    const span = tracer.startTestSpan('Login Test', {
      suite: 'auth',
      priority: 'high',
    });

    expect(span).toBeDefined();
    span.end();
  });

  test('should end test span with success', () => {
    const span = tracer.startTestSpan('Success Test');
    tracer.endTestSpan('Success Test', true);

    expect(span).toBeDefined();
  });

  test('should end test span with failure', () => {
    tracer.startTestSpan('Failed Test');
    tracer.endTestSpan('Failed Test', false, 'Assertion failed');

    expect(tracer).toBeDefined();
  });

  test('should start page action span', () => {
    const testSpan = tracer.startTestSpan('Click Test');
    const actionSpan = tracer.startPageActionSpan(testSpan, 'click', '#submit-button');

    expect(actionSpan).toBeDefined();
    actionSpan.end();
    testSpan.end();
  });

  test('should start API call span', () => {
    const testSpan = tracer.startTestSpan('API Test');
    const apiSpan = tracer.startAPICallSpan(testSpan, 'GET', '/api/users');

    expect(apiSpan).toBeDefined();
    apiSpan.end();
    testSpan.end();
  });

  test('should record API response with success status', () => {
    const testSpan = tracer.startTestSpan('API Success Test');
    const apiSpan = tracer.startAPICallSpan(testSpan, 'POST', '/api/data');

    tracer.recordAPIResponse(apiSpan, 200, 125);

    expect(apiSpan).toBeDefined();
    apiSpan.end();
    testSpan.end();
  });

  test('should record API response with error status', () => {
    const testSpan = tracer.startTestSpan('API Error Test');
    const apiSpan = tracer.startAPICallSpan(testSpan, 'GET', '/api/notfound');

    tracer.recordAPIResponse(apiSpan, 404, 50);

    expect(apiSpan).toBeDefined();
    apiSpan.end();
    testSpan.end();
  });

  test('should record assertion success', () => {
    const testSpan = tracer.startTestSpan('Assertion Test');
    tracer.recordAssertion(testSpan, 'page title equals "Home"', true);

    expect(testSpan).toBeDefined();
    testSpan.end();
  });

  test('should record assertion failure', () => {
    const testSpan = tracer.startTestSpan('Assertion Failure Test');
    tracer.recordAssertion(testSpan, 'element visible', false);

    expect(testSpan).toBeDefined();
    testSpan.end();
  });

  test('should record locator resolution success', () => {
    const testSpan = tracer.startTestSpan('Locator Resolution Test');
    tracer.recordLocatorResolution(testSpan, '#login-button', 45, true);

    expect(testSpan).toBeDefined();
    testSpan.end();
  });

  test('should record locator resolution failure', () => {
    const testSpan = tracer.startTestSpan('Locator Not Found Test');
    tracer.recordLocatorResolution(testSpan, '#nonexistent-element', 250, false);

    expect(testSpan).toBeDefined();
    testSpan.end();
  });

  test('should record LLM call', () => {
    const testSpan = tracer.startTestSpan('LLM Test');
    tracer.recordLLMCall(testSpan, 'claude-opus', 'Verify element exists', 800);

    expect(testSpan).toBeDefined();
    testSpan.end();
  });

  test('should record test duration', () => {
    metrics.recordTestDuration(5000, {
      test: 'Duration Test',
      browser: 'chromium',
    });

    expect(metrics).toBeDefined();
  });

  test('should record assertion count', () => {
    metrics.recordAssertion(true, { test: 'Assertion Count Test' });
    metrics.recordAssertion(true, { test: 'Assertion Count Test' });
    metrics.recordAssertion(false, { test: 'Assertion Count Test' });

    expect(metrics).toBeDefined();
  });

  test('should record locator resolution time', () => {
    metrics.recordLocatorResolution(150, true);
    metrics.recordLocatorResolution(500, false);

    expect(metrics).toBeDefined();
  });

  test('should record LLM latency', () => {
    metrics.recordLLMLatency(1200, 'claude-opus');
    metrics.recordLLMLatency(900, 'claude-haiku');

    expect(metrics).toBeDefined();
  });

  test('should set test pass rate', () => {
    metrics.setTestPassRate(95.5);

    expect(metrics).toBeDefined();
  });

  test('should set active test count', () => {
    metrics.setActiveTestCount(5);

    expect(metrics).toBeDefined();
  });

  test('should track multiple test spans', () => {
    tracer.startTestSpan('Test 1');
    tracer.startTestSpan('Test 2');
    tracer.startTestSpan('Test 3');

    tracer.endTestSpan('Test 1', true);
    tracer.endTestSpan('Test 2', false, 'Failed');
    tracer.endTestSpan('Test 3', true);

    expect(tracer).toBeDefined();
  });

  test('should handle concurrent spans', () => {
    const mainTest = tracer.startTestSpan('Main Test');
    const pageAction = tracer.startPageActionSpan(mainTest, 'navigate', '/home');
    const assertion = tracer.startPageActionSpan(mainTest, 'verify', '#header');

    pageAction.end();
    assertion.end();
    mainTest.end();

    expect(tracer).toBeDefined();
  });

  test('should record complex test flow', () => {
    const testSpan = tracer.startTestSpan('Complex Flow', {
      suite: 'e2e',
      priority: 'high',
    });

    // Simulate navigation
    const navSpan = tracer.startPageActionSpan(testSpan, 'navigate', '/login');
    navSpan.end();

    // Simulate form fill
    const inputSpan = tracer.startPageActionSpan(testSpan, 'fill', '#email');
    tracer.recordLocatorResolution(testSpan, '#email', 50, true);
    inputSpan.end();

    // Simulate API call
    const apiSpan = tracer.startAPICallSpan(testSpan, 'POST', '/api/login');
    tracer.recordAPIResponse(apiSpan, 200, 200);
    apiSpan.end();

    // Simulate assertions
    tracer.recordAssertion(testSpan, 'logged in', true);
    tracer.recordAssertion(testSpan, 'dashboard visible', true);

    tracer.endTestSpan('Complex Flow', true);

    expect(tracer).toBeDefined();
  });

  test('should record metrics for full test cycle', () => {
    const testName = 'Full Cycle Test';

    // Start test
    metrics.setActiveTestCount(1);

    // Record execution time
    metrics.recordTestDuration(3500, { test: testName });

    // Record assertions
    metrics.recordAssertion(true, { test: testName });
    metrics.recordAssertion(true, { test: testName });
    metrics.recordAssertion(true, { test: testName });

    // Record locators
    metrics.recordLocatorResolution(50, true);
    metrics.recordLocatorResolution(75, true);

    // Record API calls
    metrics.recordLLMLatency(600, 'claude-opus');

    // Update pass rate
    metrics.setTestPassRate(96.2);
    metrics.setActiveTestCount(0);

    expect(metrics).toBeDefined();
  });

  test('should handle tracer shutdown', async () => {
    expect(tracer).toBeDefined();
    await tracer.shutdown();
  });

  test('should initialize global tracer singleton', () => {
    const tracer1 = initializeGlobalTracer({
      serviceName: 'test-service',
    });

    expect(tracer1).toBeDefined();
  });

  test('should initialize global metrics singleton', () => {
    const metrics1 = initializeGlobalMetrics({
      serviceName: 'test-service',
    });

    expect(metrics1).toBeDefined();
  });
});
