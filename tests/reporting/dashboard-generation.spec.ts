/* eslint-disable security/detect-non-literal-fs-filename */
import { test, expect } from '@playwright/test';
import { DashboardGenerator } from '../../src/reporting/dashboard-generator';
import * as fs from 'fs';
import * as path from 'path';

test.describe('Dashboard Generation @reporting', () => {
  let generator: DashboardGenerator;
  const dashboardDir = path.resolve(__dirname, '../../.tmp/dashboard');

  test.beforeEach(() => {
    if (!fs.existsSync(dashboardDir)) {
      fs.mkdirSync(dashboardDir, { recursive: true });
    }

    generator = new DashboardGenerator({
      outputDir: dashboardDir,
      includeAIEvaluation: true,
      includeCoverage: true,
      performanceThreshold: 5000,
    });
  });

  test.afterEach(() => {
    if (fs.existsSync(dashboardDir)) {
      fs.rmSync(dashboardDir, { recursive: true, force: true });
    }
  });

  test('should create dashboard generator', () => {
    expect(generator).toBeDefined();
  });

  test('should set metrics', () => {
    generator.setMetrics({
      totalTests: 100,
      passedTests: 95,
      failedTests: 5,
      skippedTests: 0,
      duration: 50000,
    });

    expect(generator).toBeDefined();
  });

  test('should calculate health score', () => {
    const score = generator.calculateHealthScore(0.95, 50, 75, 85);

    expect(score).toBeGreaterThan(0);
    expect(score).toBeLessThanOrEqual(100);
  });

  test('should calculate perfect health score', () => {
    const score = generator.calculateHealthScore(1.0, 100, 100, 100);

    expect(score).toBe(100);
  });

  test('should calculate poor health score', () => {
    const score = generator.calculateHealthScore(0.5, 20, 50, 40);

    expect(score).toBeLessThan(50);
  });

  test('should generate flaky tests table', () => {
    const flakyTests = [
      {
        testName: 'Login Test',
        passCount: 8,
        failCount: 2,
        flakiness: 0.2,
      },
      {
        testName: 'Dashboard Test',
        passCount: 7,
        failCount: 3,
        flakiness: 0.3,
      },
    ];

    const table = generator.generateFlakyTestsTable(flakyTests);

    expect(table).toContain('Login Test');
    expect(table).toContain('Dashboard Test');
    expect(table).toContain('20.0%');
    expect(table).toContain('30.0%');
  });

  test('should generate slow tests table', () => {
    const slowTests = [
      {
        testName: 'Download Test',
        duration: 10000,
        suggestion: 'Consider using mock downloads',
      },
      {
        testName: 'Upload Test',
        duration: 8000,
        suggestion: 'Use smaller test files',
      },
    ];

    const table = generator.generateSlowTestsTable(slowTests);

    expect(table).toContain('Download Test');
    expect(table).toContain('Upload Test');
    expect(table).toContain('10.00s');
    expect(table).toContain('8.00s');
  });

  test('should generate empty flaky tests message', () => {
    const table = generator.generateFlakyTestsTable([]);

    expect(table).toContain('No flaky tests detected');
    expect(table).toContain('✅');
  });

  test('should generate empty slow tests message', () => {
    const table = generator.generateSlowTestsTable([]);

    expect(table).toContain('No slow tests detected');
    expect(table).toContain('✅');
  });

  test('should generate dashboard HTML', () => {
    generator.setMetrics({
      totalTests: 100,
      passedTests: 95,
      failedTests: 5,
      skippedTests: 0,
      duration: 50000,
    });

    const html = generator.generateDashboard();

    expect(html).toContain('<!DOCTYPE html>');
    expect(html).toContain('BestTester Dashboard');
    expect(html).toContain('100');
    expect(html).toContain('95.0%');
  });

  test('should write dashboard to file', () => {
    generator.setMetrics({
      totalTests: 100,
      passedTests: 90,
      failedTests: 10,
      skippedTests: 0,
      duration: 60000,
    });

    const filePath = generator.writeDashboard();

    expect(fs.existsSync(filePath)).toBe(true);
    const content = fs.readFileSync(filePath, 'utf-8');
    expect(content).toContain('BestTester Dashboard');
    expect(content).toContain('90.0%');
  });

  test('should include flaky tests in dashboard', () => {
    const flakyTests = [
      {
        testName: 'Flaky Test',
        passCount: 5,
        failCount: 5,
        flakiness: 0.5,
      },
    ];

    const filePath = generator.writeDashboard(flakyTests);

    expect(fs.existsSync(filePath)).toBe(true);
    const content = fs.readFileSync(filePath, 'utf-8');
    expect(content).toContain('Flaky Test');
  });

  test('should include slow tests in dashboard', () => {
    const slowTests = [
      {
        testName: 'Slow Test',
        duration: 15000,
        suggestion: 'Optimize performance',
      },
    ];

    const filePath = generator.writeDashboard([], slowTests);

    expect(fs.existsSync(filePath)).toBe(true);
    const content = fs.readFileSync(filePath, 'utf-8');
    expect(content).toContain('Slow Test');
  });

  test('should include trends in dashboard', () => {
    const trends = [
      { date: '2025-01-01', passRate: 90 },
      { date: '2025-01-02', passRate: 92 },
      { date: '2025-01-03', passRate: 95 },
    ];

    const filePath = generator.writeDashboard([], [], trends);

    expect(fs.existsSync(filePath)).toBe(true);
    const content = fs.readFileSync(filePath, 'utf-8');
    expect(content).toContain('Test Trend');
  });

  test('should generate dashboard with all sections', () => {
    generator.setMetrics({
      totalTests: 200,
      passedTests: 180,
      failedTests: 20,
      skippedTests: 0,
      duration: 120000,
    });

    const flakyTests = [
      {
        testName: 'Test A',
        passCount: 8,
        failCount: 2,
        flakiness: 0.2,
      },
    ];

    const slowTests = [
      {
        testName: 'Test B',
        duration: 5000,
        suggestion: 'Use mocks',
      },
    ];

    const trends = [
      { date: '2025-01-01', passRate: 85 },
      { date: '2025-01-02', passRate: 90 },
    ];

    const filePath = generator.writeDashboard(flakyTests, slowTests, trends);

    expect(fs.existsSync(filePath)).toBe(true);
    const content = fs.readFileSync(filePath, 'utf-8');
    expect(content).toContain('Health Score');
    expect(content).toContain('Flaky Tests');
    expect(content).toContain('Slowest Tests');
    expect(content).toContain('Test Trend');
  });

  test('should display correct health status', () => {
    const excellentScore = generator.calculateHealthScore(1.0, 100, 100, 100);
    expect(excellentScore).toBe(100);

    const poorScore = generator.calculateHealthScore(0.3, 10, 40, 30);
    expect(poorScore).toBeLessThan(50);
  });

  test('should format duration correctly', () => {
    generator.setMetrics({
      totalTests: 50,
      passedTests: 45,
      failedTests: 5,
      skippedTests: 0,
      duration: 75500,
    });

    const html = generator.generateDashboard();

    expect(html).toContain('75.5');
  });

  test('should handle zero metrics gracefully', () => {
    generator.setMetrics({
      totalTests: 0,
      passedTests: 0,
      failedTests: 0,
      skippedTests: 0,
      duration: 0,
    });

    const html = generator.generateDashboard();

    expect(html).toContain('0');
  });

  test('should include timestamp in dashboard', () => {
    const filePath = generator.writeDashboard();

    const content = fs.readFileSync(filePath, 'utf-8');
    expect(content).toContain('Generated on');
  });

  test('should create dashboard directory structure', () => {
    generator.writeDashboard();

    const dashboardPath = path.join(dashboardDir, 'dashboard', 'index.html');
    expect(fs.existsSync(dashboardPath)).toBe(true);
  });
});
