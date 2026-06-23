import * as fs from 'fs';
import * as path from 'path';

export interface QuarantinedTest {
  testId: string;
  testName: string;
  reason: string;
  quarantineDate: string;
  consecutivePasses: number;
  lastFailDate?: string;
}

export interface QuarantineConfig {
  quarantineFile: string;
  autoUnquarantineThreshold?: number;
}

export class QuarantineManager {
  private config: QuarantineConfig;
  private quarantined: Map<string, QuarantinedTest> = new Map();

  constructor(config: QuarantineConfig) {
    this.config = {
      autoUnquarantineThreshold: 5, // 5 consecutive passes
      ...config,
    };

    this.loadQuarantine();
  }

  private loadQuarantine(): void {
    // eslint-disable-next-line security/detect-non-literal-fs-filename
    if (fs.existsSync(this.config.quarantineFile)) {
      try {
        // eslint-disable-next-line security/detect-non-literal-fs-filename
        const content = fs.readFileSync(this.config.quarantineFile, 'utf-8');
        const data = JSON.parse(content) as QuarantinedTest[];
        data.forEach((test) => {
          this.quarantined.set(test.testId, test);
        });
      } catch {
        this.quarantined = new Map();
      }
    }
  }

  private saveQuarantine(): void {
    const dir = path.dirname(this.config.quarantineFile);
    // eslint-disable-next-line security/detect-non-literal-fs-filename
    if (!fs.existsSync(dir)) {
      // eslint-disable-next-line security/detect-non-literal-fs-filename
      fs.mkdirSync(dir, { recursive: true });
    }

    const data = Array.from(this.quarantined.values());
    // eslint-disable-next-line security/detect-non-literal-fs-filename
    fs.writeFileSync(this.config.quarantineFile, JSON.stringify(data, null, 2));
  }

  quarantineTest(testId: string, testName: string, reason: string): void {
    const quarantinedTest: QuarantinedTest = {
      testId,
      testName,
      reason,
      quarantineDate: new Date().toISOString(),
      consecutivePasses: 0,
    };

    this.quarantined.set(testId, quarantinedTest);
    this.saveQuarantine();
  }

  unquarantineTest(testId: string): void {
    this.quarantined.delete(testId);
    this.saveQuarantine();
  }

  isQuarantined(testId: string): boolean {
    return this.quarantined.has(testId);
  }

  getQuarantinedTest(testId: string): QuarantinedTest | undefined {
    return this.quarantined.get(testId);
  }

  recordTestPass(testId: string): void {
    const test = this.quarantined.get(testId);

    if (test) {
      test.consecutivePasses++;

      if (test.consecutivePasses >= (this.config.autoUnquarantineThreshold ?? 5)) {
        this.unquarantineTest(testId);
      } else {
        this.saveQuarantine();
      }
    }
  }

  recordTestFailure(testId: string): void {
    const test = this.quarantined.get(testId);

    if (test) {
      test.consecutivePasses = 0;
      test.lastFailDate = new Date().toISOString();
      this.saveQuarantine();
    }
  }

  getQuarantinedTests(): QuarantinedTest[] {
    return Array.from(this.quarantined.values());
  }

  getQuarantineStats(): {
    totalQuarantined: number;
    readyForUnquarantine: number;
    averageConsecutivePasses: number;
  } {
    const tests = this.getQuarantinedTests();
    const readyForUnquarantine = tests.filter(
      (t) => t.consecutivePasses >= (this.config.autoUnquarantineThreshold ?? 5),
    ).length;

    const averageConsecutivePasses =
      tests.length > 0 ? tests.reduce((sum, t) => sum + t.consecutivePasses, 0) / tests.length : 0;

    return {
      totalQuarantined: tests.length,
      readyForUnquarantine,
      averageConsecutivePasses,
    };
  }

  clear(): void {
    this.quarantined.clear();
    this.saveQuarantine();
  }
}
