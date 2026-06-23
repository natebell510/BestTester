/* eslint-disable security/detect-non-literal-fs-filename */
import * as fs from 'fs';
import * as path from 'path';
import { z } from 'zod';

interface SeedVersion {
  version: number;
  timestamp: string;
  seeds: string[];
}

interface SeedConfig {
  seedFile: string;
  versionTrackingFile: string;
}

export class SeedManager {
  private config: SeedConfig;
  private appliedSeeds: Map<string, SeedVersion> = new Map();

  constructor(config: Partial<SeedConfig> = {}) {
    this.config = {
      seedFile: config.seedFile || 'reports/seeds-applied.json',
      versionTrackingFile: config.versionTrackingFile || 'reports/seed-versions.json',
    };
    this.loadAppliedSeeds();
  }

  private loadAppliedSeeds(): void {
    const file = this.config.seedFile;
    if (fs.existsSync(file)) {
      try {
        const content = fs.readFileSync(file, 'utf-8');
        const data = JSON.parse(content) as Record<string, SeedVersion>;
        this.appliedSeeds = new Map(Object.entries(data));
      } catch {
        this.appliedSeeds = new Map();
      }
    }
  }

  private saveAppliedSeeds(): void {
    const dir = path.dirname(this.config.seedFile);
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }

    const data = Object.fromEntries(this.appliedSeeds);
    fs.writeFileSync(this.config.seedFile, JSON.stringify(data, null, 2));
  }

  /**
   * Idempotently apply a seed. Only runs if not already applied.
   */
  async applySeed(seedId: string, seedFn: () => Promise<void>): Promise<void> {
    if (this.appliedSeeds.has(seedId)) {
      return;
    }

    await seedFn();

    const existing = this.appliedSeeds.get(seedId);
    const version: SeedVersion = {
      version: (existing?.version ?? 0) + 1,
      timestamp: new Date().toISOString(),
      seeds: [...(existing?.seeds ?? []), seedId],
    };

    this.appliedSeeds.set(seedId, version);
    this.saveAppliedSeeds();
  }

  /**
   * Apply multiple seeds in order, skipping already-applied ones.
   */
  async applySeeds(seeds: Array<{ id: string; fn: () => Promise<void> }>): Promise<void> {
    for (const seed of seeds) {
      await this.applySeed(seed.id, seed.fn);
    }
  }

  /**
   * Check if a seed has been applied.
   */
  isSeedApplied(seedId: string): boolean {
    return this.appliedSeeds.has(seedId);
  }

  /**
   * Get all applied seeds.
   */
  getAppliedSeeds(): SeedVersion[] {
    return Array.from(this.appliedSeeds.values());
  }

  /**
   * Reset all seed tracking (use cautiously).
   */
  clearAll(): void {
    this.appliedSeeds.clear();
    this.saveAppliedSeeds();
  }

  /**
   * Reset specific seed tracking.
   */
  resetSeed(seedId: string): void {
    this.appliedSeeds.delete(seedId);
    this.saveAppliedSeeds();
  }

  /**
   * Get seed history.
   */
  getSeedHistory(): Record<string, SeedVersion> {
    return Object.fromEntries(this.appliedSeeds);
  }

  /**
   * Export seed history for audit purposes.
   */
  exportHistory(): void {
    const dir = path.dirname(this.config.versionTrackingFile);
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }

    const history = {
      exportedAt: new Date().toISOString(),
      seeds: Object.fromEntries(this.appliedSeeds),
    };

    fs.writeFileSync(this.config.versionTrackingFile, JSON.stringify(history, null, 2));
  }
}

export const seedSchema = z.object({
  id: z.string().min(1),
  fn: z.function(),
});

export type Seed = z.infer<typeof seedSchema>;
