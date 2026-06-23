import { EventEmitter } from 'events';

export interface MonitorEvent {
  timestamp: string;
  eventType: 'test-start' | 'test-end' | 'test-retry' | 'test-fail' | 'suite-start' | 'suite-end';
  testName?: string;
  suiteName?: string;
  duration?: number;
  error?: string;
  retryCount?: number;
  metadata?: Record<string, unknown>;
}

export interface TestHealth {
  totalTests: number;
  runningTests: number;
  passedTests: number;
  failedTests: number;
  skippedTests: number;
  averageDuration: number;
  healthScore: number;
}

export interface RealtimeMetrics {
  timestamp: string;
  testCount: number;
  passRate: number;
  averageDuration: number;
  failureRate: number;
  flakyRate: number;
}

export class TestMonitor extends EventEmitter {
  private events: MonitorEvent[] = [];
  private runningTests: Set<string> = new Set();
  private testDurations: Map<string, number[]> = new Map();
  private testRetries: Map<string, number> = new Map();
  private testFailures: Map<string, string> = new Map();
  private metricsHistory: RealtimeMetrics[] = [];

  constructor() {
    super();
    this.setMaxListeners(100);
  }

  recordEvent(event: MonitorEvent): void {
    this.events.push(event);
    this.emit('event', event);

    switch (event.eventType) {
      case 'test-start':
        if (event.testName) {
          this.runningTests.add(event.testName);
        }
        break;
      case 'test-end':
        if (event.testName) {
          this.runningTests.delete(event.testName);
          if (event.duration) {
            if (!this.testDurations.has(event.testName)) {
              this.testDurations.set(event.testName, []);
            }
            this.testDurations.get(event.testName)!.push(event.duration);
          }
        }
        break;
      case 'test-retry':
        if (event.testName) {
          const current = this.testRetries.get(event.testName) || 0;
          this.testRetries.set(event.testName, current + 1);
        }
        break;
      case 'test-fail':
        if (event.testName && event.error) {
          this.testFailures.set(event.testName, event.error);
        }
        break;
    }
  }

  getHealth(): TestHealth {
    const passedCount = this.events.filter((e) => e.eventType === 'test-end').length;
    const failedCount = this.events.filter((e) => e.eventType === 'test-fail').length;
    const skippedCount = this.events.filter(
      (e) => e.eventType === 'test-end' && !e.duration,
    ).length;

    const allDurations = Array.from(this.testDurations.values()).flat();
    const averageDuration =
      allDurations.length > 0 ? allDurations.reduce((a, b) => a + b, 0) / allDurations.length : 0;

    const totalTests = passedCount + failedCount + skippedCount;
    const healthScore = totalTests > 0 ? (passedCount / totalTests) * 100 : 100;

    return {
      totalTests,
      runningTests: this.runningTests.size,
      passedTests: passedCount,
      failedTests: failedCount,
      skippedTests: skippedCount,
      averageDuration,
      healthScore,
    };
  }

  getRealtimeMetrics(): RealtimeMetrics {
    const passedCount = this.events.filter((e) => e.eventType === 'test-end').length;
    const failedCount = this.events.filter((e) => e.eventType === 'test-fail').length;
    const retryCount = this.events.filter((e) => e.eventType === 'test-retry').length;

    const testCount = passedCount + failedCount;
    const passRate = testCount > 0 ? (passedCount / testCount) * 100 : 0;
    const failureRate = testCount > 0 ? (failedCount / testCount) * 100 : 0;
    const flakyRate = testCount > 0 ? (retryCount / testCount) * 100 : 0;

    const allDurations = Array.from(this.testDurations.values()).flat();
    const averageDuration =
      allDurations.length > 0 ? allDurations.reduce((a, b) => a + b, 0) / allDurations.length : 0;

    const metrics: RealtimeMetrics = {
      timestamp: new Date().toISOString(),
      testCount,
      passRate,
      averageDuration,
      failureRate,
      flakyRate,
    };

    this.metricsHistory.push(metrics);
    return metrics;
  }

  getFlakyTests(): string[] {
    const flaky: string[] = [];
    this.testRetries.forEach((retries, testName) => {
      if (retries > 0) {
        flaky.push(testName);
      }
    });
    return flaky;
  }

  getSlowTests(threshold: number = 5000): Array<{ name: string; duration: number }> {
    const slow: Array<{ name: string; duration: number }> = [];
    this.testDurations.forEach((durations, testName) => {
      const avg = durations.reduce((a, b) => a + b, 0) / durations.length;
      if (avg > threshold) {
        slow.push({ name: testName, duration: avg });
      }
    });
    return slow.sort((a, b) => b.duration - a.duration);
  }

  getFailedTests(): Array<{ name: string; error: string }> {
    const failed: Array<{ name: string; error: string }> = [];
    this.testFailures.forEach((error, testName) => {
      failed.push({ name: testName, error });
    });
    return failed;
  }

  getRunningTests(): string[] {
    return Array.from(this.runningTests);
  }

  getEvents(filter?: { eventType?: string; testName?: string }): MonitorEvent[] {
    let filtered = this.events;

    if (filter?.eventType) {
      filtered = filtered.filter((e) => e.eventType === filter.eventType);
    }

    if (filter?.testName) {
      filtered = filtered.filter((e) => e.testName === filter.testName);
    }

    return filtered;
  }

  getMetricsHistory(): RealtimeMetrics[] {
    return [...this.metricsHistory];
  }

  clear(): void {
    this.events = [];
    this.runningTests.clear();
    this.testDurations.clear();
    this.testRetries.clear();
    this.testFailures.clear();
    this.metricsHistory = [];
  }

  getAverageTestDuration(testName: string): number {
    const durations = this.testDurations.get(testName);
    if (!durations || durations.length === 0) return 0;
    return durations.reduce((a, b) => a + b, 0) / durations.length;
  }

  getRetryCount(testName: string): number {
    return this.testRetries.get(testName) || 0;
  }

  isTestHealthy(healthScoreThreshold: number = 80): boolean {
    return this.getHealth().healthScore >= healthScoreThreshold;
  }

  generateSummary(): string {
    const health = this.getHealth();
    const metrics = this.getRealtimeMetrics();
    const flaky = this.getFlakyTests();
    const slow = this.getSlowTests();

    const summary: string[] = [];
    summary.push('=== Test Monitoring Summary ===\n');

    summary.push(`Health Score: ${health.healthScore.toFixed(1)}%`);
    summary.push(
      `Status: ${health.totalTests} total | ${health.passedTests} passed | ${health.failedTests} failed | ${health.skippedTests} skipped`,
    );
    summary.push(`Currently Running: ${health.runningTests}`);
    summary.push(`Average Duration: ${health.averageDuration.toFixed(0)}ms`);

    summary.push(`\nRealtime Metrics:`);
    summary.push(`Pass Rate: ${metrics.passRate.toFixed(1)}%`);
    summary.push(`Failure Rate: ${metrics.failureRate.toFixed(1)}%`);
    summary.push(`Flaky Rate: ${metrics.flakyRate.toFixed(1)}%`);

    if (flaky.length > 0) {
      summary.push(`\nFlaky Tests (${flaky.length}):`);
      flaky.slice(0, 5).forEach((t) => {
        summary.push(`  - ${t} (retried ${this.getRetryCount(t)} times)`);
      });
    }

    if (slow.length > 0) {
      summary.push(`\nSlow Tests (Top 5):`);
      slow.slice(0, 5).forEach((t) => {
        summary.push(`  - ${t.name}: ${t.duration.toFixed(0)}ms`);
      });
    }

    return summary.join('\n');
  }
}
