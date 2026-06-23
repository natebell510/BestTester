#!/usr/bin/env ts-node
/* eslint-disable no-console */
import { DashboardGenerator } from '../src/reporting/dashboard-generator';
import * as path from 'path';

// Sample data for demonstration - in real CI, this would come from test results
const metrics = {
  totalTests: 250,
  passedTests: 235,
  failedTests: 10,
  skippedTests: 5,
  duration: 180000, // 3 minutes
};

const flakyTests = [
  {
    testName: 'Authentication Flow Test',
    passCount: 18,
    failCount: 2,
    flakiness: 0.1,
  },
  {
    testName: 'Database Connection Test',
    passCount: 15,
    failCount: 5,
    flakiness: 0.25,
  },
];

const slowTests = [
  {
    testName: 'File Upload Test',
    duration: 12000,
    suggestion: 'Use smaller test files or mock file uploads',
  },
  {
    testName: 'PDF Generation Test',
    duration: 8500,
    suggestion: 'Consider using headless rendering instead',
  },
  {
    testName: 'Large Data Import Test',
    duration: 7300,
    suggestion: 'Batch API calls or use database seeding',
  },
];

const trends = [
  { date: '2025-03-01', passRate: 88 },
  { date: '2025-03-02', passRate: 90 },
  { date: '2025-03-03', passRate: 92 },
  { date: '2025-03-04', passRate: 91 },
  { date: '2025-03-05', passRate: 94 },
  { date: '2025-03-06', passRate: 96 },
  { date: '2025-03-07', passRate: 94 },
];

function main(): void {
  try {
    console.log('📊 Generating test intelligence dashboard...\n');

    const reportsDir = path.resolve(process.cwd(), 'reports');
    const generator = new DashboardGenerator({
      outputDir: reportsDir,
      includeAIEvaluation: true,
      includeCoverage: true,
      performanceThreshold: 5000,
    });

    generator.setMetrics(metrics);
    const filePath = generator.writeDashboard(flakyTests, slowTests, trends);

    console.log('✅ Dashboard generated successfully!');
    console.log(`📄 Location: ${filePath}`);
    console.log('\n📈 Dashboard Summary:');
    console.log(`   Total Tests: ${metrics.totalTests}`);
    console.log(`   Pass Rate: ${((metrics.passedTests / metrics.totalTests) * 100).toFixed(1)}%`);
    console.log(
      `   Health Score: ${generator.calculateHealthScore(metrics.passedTests / metrics.totalTests, 75, 80, 85)}`,
    );
    console.log(`   Flaky Tests Detected: ${flakyTests.length}`);
    console.log(`   Slow Tests Detected: ${slowTests.length}`);
    console.log(`\n🌐 Open the dashboard in your browser: file://${filePath}`);
    console.log('\n✨ Dashboard is ready for GitHub Pages deployment!');
  } catch (error) {
    console.error('Error generating dashboard:', error);
    process.exit(1);
  }
}

main();
