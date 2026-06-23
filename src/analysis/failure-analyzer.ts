export interface TestFailure {
  testName: string;
  errorMessage: string;
  stackTrace?: string;
  timestamp: string;
  duration: number;
  retryCount: number;
  environment: string;
}

export interface FailurePattern {
  pattern: string;
  category: string;
  frequency: number;
  lastOccurred: string;
  affectedTests: string[];
  suggestedFix?: string;
}

export interface RecoveryStrategy {
  failurePattern: string;
  strategy: 'retry' | 'skip' | 'rollback' | 'notify' | 'ignore';
  maxRetries?: number;
  delayMs?: number;
  condition?: string;
}

export class FailureAnalyzer {
  private failures: TestFailure[] = [];
  private patterns: Map<string, FailurePattern> = new Map();
  private recoveryStrategies: RecoveryStrategy[] = [];

  recordFailure(failure: TestFailure): void {
    this.failures.push(failure);
    this.analyzePattern(failure);
  }

  private analyzePattern(failure: TestFailure): void {
    const errorCategory = this.categorizeError(failure.errorMessage);
    const patternKey = this.extractPatternKey(failure.errorMessage);

    if (!this.patterns.has(patternKey)) {
      this.patterns.set(patternKey, {
        pattern: patternKey,
        category: errorCategory,
        frequency: 0,
        lastOccurred: failure.timestamp,
        affectedTests: [],
      });
    }

    const pattern = this.patterns.get(patternKey)!;
    pattern.frequency++;
    pattern.lastOccurred = failure.timestamp;
    if (!pattern.affectedTests.includes(failure.testName)) {
      pattern.affectedTests.push(failure.testName);
    }
  }

  private categorizeError(error: string): string {
    const lowerError = error.toLowerCase();
    if (lowerError.includes('timeout')) return 'timeout';
    if (lowerError.includes('not found') || lowerError.includes('404')) return 'not-found';
    if (lowerError.includes('permission') || lowerError.includes('403')) return 'permission';
    if (lowerError.includes('connection') || lowerError.includes('network')) return 'network';
    if (lowerError.includes('assertion') || lowerError.includes('assert')) return 'assertion';
    if (lowerError.includes('memory') || lowerError.includes('out of')) return 'memory';
    return 'unknown';
  }

  private extractPatternKey(error: string): string {
    const match = error.match(/([A-Za-z0-9._:]+)\s*-/);
    return match ? match[1] : error.substring(0, 50);
  }

  getFailurePatterns(): FailurePattern[] {
    return Array.from(this.patterns.values());
  }

  getFrequentPatterns(minFrequency: number = 2): FailurePattern[] {
    return this.getFailurePatterns().filter((p) => p.frequency >= minFrequency);
  }

  getFailuresByCategory(category: string): TestFailure[] {
    return this.failures.filter((f) => this.categorizeError(f.errorMessage) === category);
  }

  getFailuresByTest(testName: string): TestFailure[] {
    return this.failures.filter((f) => f.testName === testName);
  }

  getFlakeyTests(threshold: number = 0.5): string[] {
    if (this.failures.length === 0) return [];

    const testFailureCounts = new Map<string, number>();
    this.failures.forEach((f) => {
      testFailureCounts.set(f.testName, (testFailureCounts.get(f.testName) || 0) + 1);
    });

    const flaky: string[] = [];
    testFailureCounts.forEach((count, testName) => {
      const failureRate = count / this.failures.length;
      if (failureRate >= threshold) {
        flaky.push(testName);
      }
    });

    return flaky;
  }

  suggestRecoveryStrategy(failure: TestFailure): RecoveryStrategy | null {
    const category = this.categorizeError(failure.errorMessage);

    switch (category) {
      case 'timeout':
        return {
          failurePattern: category,
          strategy: 'retry',
          maxRetries: 3,
          delayMs: 1000,
        };
      case 'network':
        return {
          failurePattern: category,
          strategy: 'retry',
          maxRetries: 5,
          delayMs: 2000,
        };
      case 'permission':
        return {
          failurePattern: category,
          strategy: 'notify',
        };
      case 'memory':
        return {
          failurePattern: category,
          strategy: 'skip',
        };
      case 'assertion':
        return {
          failurePattern: category,
          strategy: 'ignore',
        };
      default:
        return null;
    }
  }

  registerRecoveryStrategy(strategy: RecoveryStrategy): void {
    this.recoveryStrategies.push(strategy);
  }

  getRecoveryStrategies(): RecoveryStrategy[] {
    return [...this.recoveryStrategies];
  }

  generateAnalysisReport(): string {
    const report: string[] = [];
    report.push('=== Test Failure Analysis Report ===\n');

    report.push(`Total Failures: ${this.failures.length}\n`);

    const byCategory = new Map<string, number>();
    this.failures.forEach((f) => {
      const cat = this.categorizeError(f.errorMessage);
      byCategory.set(cat, (byCategory.get(cat) || 0) + 1);
    });

    report.push(`\nFailures by Category:`);
    byCategory.forEach((count, category) => {
      report.push(`  ${category}: ${count}`);
    });

    const frequentPatterns = this.getFrequentPatterns();
    if (frequentPatterns.length > 0) {
      report.push(`\nFrequent Patterns:`);
      frequentPatterns.forEach((p) => {
        report.push(`  ${p.pattern}: ${p.frequency} times (${p.affectedTests.length} tests)`);
      });
    }

    const flaky = this.getFlakeyTests();
    if (flaky.length > 0) {
      report.push(`\nFlaky Tests: ${flaky.join(', ')}`);
    }

    return report.join('\n');
  }

  getRecoveryRecommendations(): Map<string, RecoveryStrategy> {
    const recommendations = new Map<string, RecoveryStrategy>();

    const patterns = this.getFrequentPatterns();
    patterns.forEach((pattern) => {
      const testFailure: TestFailure = {
        testName: pattern.affectedTests[0] || 'unknown',
        errorMessage: pattern.pattern,
        timestamp: pattern.lastOccurred,
        duration: 0,
        retryCount: 0,
        environment: 'unknown',
      };

      const strategy = this.suggestRecoveryStrategy(testFailure);
      if (strategy) {
        recommendations.set(pattern.pattern, strategy);
      }
    });

    return recommendations;
  }

  clear(): void {
    this.failures = [];
    this.patterns.clear();
    this.recoveryStrategies = [];
  }

  getAverageFailureDuration(): number {
    if (this.failures.length === 0) return 0;
    const total = this.failures.reduce((sum, f) => sum + f.duration, 0);
    return total / this.failures.length;
  }

  getCriticalFailures(): TestFailure[] {
    return this.failures.filter((f) => {
      const cat = this.categorizeError(f.errorMessage);
      return ['permission', 'memory', 'network'].includes(cat);
    });
  }
}
