import * as fs from 'fs';
import * as path from 'path';

export interface TestMetrics {
  testName: string;
  duration: number;
  memoryUsed: number;
  cpuUsage: number;
  timestamp: string;
  retryCount: number;
  flakiness: number;
}

export interface TestTrend {
  date: string;
  totalTests: number;
  averageDuration: number;
  passRate: number;
  flakyCounts: number;
}

export interface PerformanceMetrics {
  averageTestDuration: number;
  slowestTests: Array<{ name: string; duration: number }>;
  fastestTests: Array<{ name: string; duration: number }>;
  medianDuration: number;
  standardDeviation: number;
}

export class TestMetricsCollector {
  private metrics: TestMetrics[] = [];
  private metricsDir: string;

  constructor(metricsDir: string = 'reports/metrics') {
    this.metricsDir = metricsDir;
    this.ensureMetricsDir();
  }

  private ensureMetricsDir(): void {
    if (!fs.existsSync(this.metricsDir)) {
      fs.mkdirSync(this.metricsDir, { recursive: true });
    }
  }

  recordMetric(metric: TestMetrics): void {
    this.metrics.push(metric);
  }

  recordMultiple(metrics: TestMetrics[]): void {
    this.metrics.push(...metrics);
  }

  getMetrics(): TestMetrics[] {
    return [...this.metrics];
  }

  getMetricsByTest(testName: string): TestMetrics[] {
    return this.metrics.filter((m) => m.testName === testName);
  }

  getSlowTests(threshold: number = 5000): TestMetrics[] {
    return this.metrics.filter((m) => m.duration > threshold);
  }

  getFlakyTests(threshold: number = 0.1): TestMetrics[] {
    const grouped = this.groupByTest();
    const flaky: TestMetrics[] = [];

    grouped.forEach((metrics) => {
      const flakinessRate = metrics.reduce((sum, m) => sum + m.flakiness, 0) / metrics.length;
      if (flakinessRate > threshold) {
        flaky.push(...metrics);
      }
    });

    return flaky;
  }

  getPerformanceMetrics(): PerformanceMetrics {
    if (this.metrics.length === 0) {
      return {
        averageTestDuration: 0,
        slowestTests: [],
        fastestTests: [],
        medianDuration: 0,
        standardDeviation: 0,
      };
    }

    const durations = this.metrics.map((m) => m.duration).sort((a, b) => a - b);
    const averageDuration = durations.reduce((a, b) => a + b, 0) / durations.length;
    const medianDuration = durations[Math.floor(durations.length / 2)];

    const variance =
      durations.reduce((sum, d) => sum + Math.pow(d - averageDuration, 2), 0) / durations.length;
    const standardDeviation = Math.sqrt(variance);

    const grouped = this.groupByTest();
    const testAvgs = Array.from(grouped.entries())
      .map(([name, metrics]) => ({
        name,
        duration: metrics.reduce((sum, m) => sum + m.duration, 0) / metrics.length,
      }))
      .sort((a, b) => b.duration - a.duration);

    return {
      averageTestDuration,
      slowestTests: testAvgs.slice(0, 10),
      fastestTests: testAvgs.slice(-10).reverse(),
      medianDuration,
      standardDeviation,
    };
  }

  getTrendData(days: number = 30): TestTrend[] {
    const trends: Map<string, TestTrend> = new Map();
    const now = new Date();

    this.metrics.forEach((metric) => {
      const date = new Date(metric.timestamp).toISOString().split('T')[0];
      const dayDiff =
        (now.getTime() - new Date(metric.timestamp).getTime()) / (1000 * 60 * 60 * 24);

      if (dayDiff <= days) {
        if (!trends.has(date)) {
          trends.set(date, {
            date,
            totalTests: 0,
            averageDuration: 0,
            passRate: 100,
            flakyCounts: 0,
          });
        }

        const trend = trends.get(date)!;
        trend.totalTests++;
        trend.averageDuration += metric.duration;
        if (metric.flakiness > 0) trend.flakyCounts++;
      }
    });

    return Array.from(trends.values())
      .map((t) => ({
        ...t,
        averageDuration: t.averageDuration / t.totalTests,
      }))
      .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
  }

  saveMetrics(filename: string = 'metrics.json'): void {
    const filepath = path.join(this.metricsDir, filename);
    fs.writeFileSync(filepath, JSON.stringify(this.metrics, null, 2));
  }

  loadMetrics(filename: string = 'metrics.json'): void {
    const filepath = path.join(this.metricsDir, filename);
    if (fs.existsSync(filepath)) {
      const data = fs.readFileSync(filepath, 'utf-8');
      this.metrics = JSON.parse(data);
    }
  }

  generateReport(): string {
    const perf = this.getPerformanceMetrics();
    const trends = this.getTrendData(7);
    const flaky = this.getFlakyTests();

    const report: string[] = [];
    report.push('=== Test Metrics Report ===\n');

    report.push('Performance Metrics:');
    report.push(`  Average Test Duration: ${perf.averageTestDuration.toFixed(2)}ms`);
    report.push(`  Median Duration: ${perf.medianDuration.toFixed(2)}ms`);
    report.push(`  Std Deviation: ${perf.standardDeviation.toFixed(2)}ms`);

    report.push('\nSlowest Tests (Top 5):');
    perf.slowestTests.slice(0, 5).forEach((t) => {
      report.push(`  ${t.name}: ${t.duration.toFixed(2)}ms`);
    });

    report.push('\nFastest Tests (Top 5):');
    perf.fastestTests.slice(0, 5).forEach((t) => {
      report.push(`  ${t.name}: ${t.duration.toFixed(2)}ms`);
    });

    if (flaky.length > 0) {
      report.push('\nFlaky Tests:');
      const uniqueFlaky = new Set(flaky.map((t) => t.testName));
      uniqueFlaky.forEach((name) => {
        report.push(`  ${name}`);
      });
    }

    report.push('\n7-Day Trend:');
    trends.forEach((t) => {
      report.push(`  ${t.date}: ${t.totalTests} tests, avg ${t.averageDuration.toFixed(0)}ms`);
    });

    return report.join('\n');
  }

  private groupByTest(): Map<string, TestMetrics[]> {
    const grouped = new Map<string, TestMetrics[]>();

    this.metrics.forEach((metric) => {
      if (!grouped.has(metric.testName)) {
        grouped.set(metric.testName, []);
      }
      grouped.get(metric.testName)!.push(metric);
    });

    return grouped;
  }

  getAverageTestDuration(testName: string): number {
    const testMetrics = this.getMetricsByTest(testName);
    if (testMetrics.length === 0) return 0;

    return testMetrics.reduce((sum, m) => sum + m.duration, 0) / testMetrics.length;
  }

  getRetryStats(): { totalRetries: number; averageRetriesPerTest: number } {
    const totalRetries = this.metrics.reduce((sum, m) => sum + m.retryCount, 0);
    const averageRetriesPerTest = totalRetries / Math.max(this.metrics.length, 1);

    return { totalRetries, averageRetriesPerTest };
  }

  getMemoryStats(): { totalMemory: number; averageMemory: number; peakMemory: number } {
    const memoryValues = this.metrics.map((m) => m.memoryUsed);
    const totalMemory = memoryValues.reduce((sum, m) => sum + m, 0);
    const averageMemory = totalMemory / Math.max(this.metrics.length, 1);
    const peakMemory = Math.max(...memoryValues, 0);

    return { totalMemory, averageMemory, peakMemory };
  }
}
