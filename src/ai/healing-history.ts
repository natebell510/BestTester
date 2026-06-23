import * as fs from 'fs';
import * as path from 'path';

export interface HealingRecord {
  timestamp: string;
  testId: string;
  originalLocator: string;
  fixedLocator: string;
  success: boolean;
  reason?: string;
}

const HISTORY_FILE = path.resolve(__dirname, '../../reports/healing-history.json');

export class HealingHistory {
  private records: HealingRecord[] = [];

  constructor() {
    this.loadHistory();
  }

  private loadHistory(): void {
    try {
      if (fs.existsSync(HISTORY_FILE)) {
        const data = fs.readFileSync(HISTORY_FILE, 'utf-8');
        this.records = JSON.parse(data) as HealingRecord[];
      }
    } catch {
      this.records = [];
    }
  }

  private saveHistory(): void {
    const dir = path.dirname(HISTORY_FILE);
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }
    fs.writeFileSync(HISTORY_FILE, JSON.stringify(this.records, null, 2));
  }

  addRecord(
    testId: string,
    originalLocator: string,
    fixedLocator: string,
    success: boolean,
    reason?: string,
  ): void {
    const record: HealingRecord = {
      timestamp: new Date().toISOString(),
      testId,
      originalLocator,
      fixedLocator,
      success,
      reason,
    };
    this.records.push(record);
    this.saveHistory();
  }

  getRecordsForTest(testId: string): HealingRecord[] {
    return this.records.filter((r) => r.testId === testId);
  }

  getSuccessRate(): number {
    if (this.records.length === 0) return 0;
    const successful = this.records.filter((r) => r.success).length;
    return (successful / this.records.length) * 100;
  }

  getRecentRecords(count: number): HealingRecord[] {
    return this.records.slice(-count);
  }

  getRecordsBetween(startDate: Date, endDate: Date): HealingRecord[] {
    return this.records.filter((r) => {
      const recordDate = new Date(r.timestamp);
      return recordDate >= startDate && recordDate <= endDate;
    });
  }

  getMostFrequentlyHealed(): Array<[string, number]> {
    const counts = new Map<string, number>();
    for (const record of this.records) {
      counts.set(record.testId, (counts.get(record.testId) ?? 0) + 1);
    }
    return Array.from(counts.entries()).sort(([, a], [, b]) => b - a);
  }

  getStats(): {
    total: number;
    successful: number;
    failed: number;
    successRate: number;
    uniqueTests: number;
  } {
    const successful = this.records.filter((r) => r.success).length;
    const failed = this.records.filter((r) => !r.success).length;
    const uniqueTests = new Set(this.records.map((r) => r.testId)).size;

    return {
      total: this.records.length,
      successful,
      failed,
      successRate: this.getSuccessRate(),
      uniqueTests,
    };
  }

  clear(): void {
    this.records = [];
    if (fs.existsSync(HISTORY_FILE)) {
      fs.unlinkSync(HISTORY_FILE);
    }
  }
}
