/* eslint-disable security/detect-non-literal-fs-filename */
import * as fs from 'fs';
import * as path from 'path';
import { z } from 'zod';

interface CleanupRecord {
  id: string;
  resourceType: string;
  resourceId: string;
  createdAt: string;
  cleaned: boolean;
  cleanedAt?: string;
}

interface CleanupConfig {
  auditFile: string;
}

export class CleanupRegistry {
  private config: CleanupConfig;
  private records: CleanupRecord[] = [];
  private cleanupFunctions: Map<string, () => Promise<void>> = new Map();

  constructor(config: Partial<CleanupConfig> = {}) {
    this.config = {
      auditFile: config.auditFile || 'reports/cleanup-audit.json',
    };
    this.loadRecords();
  }

  private loadRecords(): void {
    const file = this.config.auditFile;
    if (fs.existsSync(file)) {
      try {
        const content = fs.readFileSync(file, 'utf-8');
        this.records = JSON.parse(content) as CleanupRecord[];
      } catch {
        this.records = [];
      }
    }
  }

  private saveRecords(): void {
    const dir = path.dirname(this.config.auditFile);
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }

    fs.writeFileSync(this.config.auditFile, JSON.stringify(this.records, null, 2));
  }

  /**
   * Register a resource for cleanup with a cleanup function.
   */
  register(resourceType: string, resourceId: string, cleanupFn: () => Promise<void>): string {
    const id = `${resourceType}-${resourceId}-${Date.now()}`;

    const record: CleanupRecord = {
      id,
      resourceType,
      resourceId,
      createdAt: new Date().toISOString(),
      cleaned: false,
    };

    this.records.push(record);
    this.cleanupFunctions.set(id, cleanupFn);
    this.saveRecords();

    return id;
  }

  /**
   * Mark a resource as cleaned.
   */
  markCleaned(id: string): void {
    const record = this.records.find((r) => r.id === id);
    if (record) {
      record.cleaned = true;
      record.cleanedAt = new Date().toISOString();
      this.saveRecords();
    }
  }

  /**
   * Execute cleanup for all registered resources. Guaranteed to run even on errors.
   */
  async cleanupAll(): Promise<void> {
    const errors: Array<{ id: string; error: Error }> = [];

    for (const [id, cleanupFn] of this.cleanupFunctions.entries()) {
      try {
        await cleanupFn();
        this.markCleaned(id);
      } catch (error) {
        errors.push({
          id,
          error: error instanceof Error ? error : new Error(String(error)),
        });
      }
    }

    if (errors.length > 0) {
      const errorMsg = errors.map((e) => `${e.id}: ${e.error.message}`).join('\n');
      throw new Error(`Cleanup failed for resources:\n${errorMsg}`);
    }
  }

  /**
   * Get cleanup records.
   */
  getRecords(): CleanupRecord[] {
    return [...this.records];
  }

  /**
   * Get uncleaned resources.
   */
  getUncleanedResources(): CleanupRecord[] {
    return this.records.filter((r) => !r.cleaned);
  }

  /**
   * Get statistics about cleanup operations.
   */
  getStats(): {
    total: number;
    cleaned: number;
    uncleaned: number;
    cleanupRate: number;
  } {
    const total = this.records.length;
    const cleaned = this.records.filter((r) => r.cleaned).length;
    const uncleaned = total - cleaned;
    const cleanupRate = total > 0 ? (cleaned / total) * 100 : 0;

    return {
      total,
      cleaned,
      uncleaned,
      cleanupRate,
    };
  }

  /**
   * Clear all records (use cautiously).
   */
  clear(): void {
    this.records = [];
    this.cleanupFunctions.clear();
    this.saveRecords();
  }

  /**
   * Export cleanup audit trail.
   */
  exportAudit(): string {
    return JSON.stringify(
      {
        exportedAt: new Date().toISOString(),
        stats: this.getStats(),
        records: this.records,
      },
      null,
      2,
    );
  }
}

export const cleanupRecordSchema = z.object({
  id: z.string(),
  resourceType: z.string(),
  resourceId: z.string(),
  createdAt: z.string().datetime(),
  cleaned: z.boolean(),
  cleanedAt: z.string().datetime().optional(),
});

export type CleanupRecordType = z.infer<typeof cleanupRecordSchema>;
