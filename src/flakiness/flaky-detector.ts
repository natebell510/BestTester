import * as fs from 'fs';
import * as path from 'path';

export interface TestRun {
  testName: string;
  passed: boolean;
  timestamp: string;
  duration: number;
}

export interface TestHistory {
  testName: string;
  runs: TestRun[];
  flakiness: number;
}

export interface FlakyDetectorConfig {
  historyFile: string;
  flakynessThreshold?: number;
  minRunsForDetection?: number;
}

export class FlakyDetector {
  private config: FlakyDetectorConfig;
  private history: Map<string, TestRun[]> = new Map();

  constructor(config: FlakyDetectorConfig) {
    this.config = {
      flakynessThreshold: 0.1, // 10% flakiness threshold
      minRunsForDetection: 20,
      ...config,
    };

    this.loadHistory();
  }

  private loadHistory(): void {
    // eslint-disable-next-line security/detect-non-literal-fs-filename
    if (fs.existsSync(this.config.historyFile)) {
      try {
        // eslint-disable-next-line security/detect-non-literal-fs-filename
        const content = fs.readFileSync(this.config.historyFile, 'utf-8');
        const data = JSON.parse(content) as Record<string, TestRun[]>;
        this.history = new Map(Object.entries(data));
      } catch {
        this.history = new Map();
      }
    }
  }

  private saveHistory(): void {
    const dir = path.dirname(this.config.historyFile);
    // eslint-disable-next-line security/detect-non-literal-fs-filename
    if (!fs.existsSync(dir)) {
      // eslint-disable-next-line security/detect-non-literal-fs-filename
      fs.mkdirSync(dir, { recursive: true });
    }

    const data = Object.fromEntries(this.history);
    // eslint-disable-next-line security/detect-non-literal-fs-filename
    fs.writeFileSync(this.config.historyFile, JSON.stringify(data, null, 2));
  }

  recordTestRun(testName: string, passed: boolean, duration: number): void {
    const run: TestRun = {
      testName,
      passed,
      timestamp: new Date().toISOString(),
      duration,
    };

    const runs = this.history.get(testName) || [];
    runs.push(run);

    // Keep only last 50 runs to avoid bloat
    if (runs.length > 50) {
      runs.shift();
    }

    this.history.set(testName, runs);
    this.saveHistory();
  }

  calculateFlakiness(testName: string): number {
    const runs = this.history.get(testName) || [];

    if (runs.length === 0) {
      return 0;
    }

    const failures = runs.filter((r) => !r.passed).length;
    return failures / runs.length;
  }

  getFlakeyTests(lookbackRuns: number = 20): TestHistory[] {
    const flakyTests: TestHistory[] = [];

    this.history.forEach((runs, testName) => {
      // Use only the last N runs
      const recentRuns = runs.slice(-lookbackRuns);

      if (recentRuns.length >= (this.config.minRunsForDetection ?? 20)) {
        const flakiness = this.calculateFlakiness(testName);

        if (flakiness > (this.config.flakynessThreshold ?? 0.1)) {
          flakyTests.push({
            testName,
            runs: recentRuns,
            flakiness,
          });
        }
      }
    });

    return flakyTests.sort((a, b) => b.flakiness - a.flakiness);
  }

  isTestFlaky(testName: string): boolean {
    const flakiness = this.calculateFlakiness(testName);
    return flakiness > (this.config.flakynessThreshold ?? 0.1);
  }

  getTestStatistics(testName: string): {
    totalRuns: number;
    passes: number;
    failures: number;
    passRate: number;
    flakiness: number;
    averageDuration: number;
  } {
    const runs = this.history.get(testName) || [];

    if (runs.length === 0) {
      return {
        totalRuns: 0,
        passes: 0,
        failures: 0,
        passRate: 0,
        flakiness: 0,
        averageDuration: 0,
      };
    }

    const passes = runs.filter((r) => r.passed).length;
    const failures = runs.length - passes;
    const flakiness = failures / runs.length;
    const averageDuration = runs.reduce((sum, r) => sum + r.duration, 0) / runs.length;

    return {
      totalRuns: runs.length,
      passes,
      failures,
      passRate: (passes / runs.length) * 100,
      flakiness,
      averageDuration,
    };
  }

  clear(): void {
    this.history.clear();
    this.saveHistory();
  }
}
