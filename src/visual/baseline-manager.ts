import * as fs from 'fs';
import * as path from 'path';
import { Page } from '@playwright/test';

export interface BaselineSnapshot {
  timestamp: string;
  url: string;
  width: number;
  height: number;
  description: string;
  filePath: string;
}

export interface BaselineMetadata {
  name: string;
  environment: string;
  browser: string;
  snapshots: BaselineSnapshot[];
}

export class BaselineManager {
  private baselineDir = path.resolve(__dirname, '../../reports/baselines');
  private metadataFile: string;

  constructor(
    private environment: string = 'dev',
    private browser: string = 'chromium',
  ) {
    this.metadataFile = path.join(this.baselineDir, `metadata-${environment}-${browser}.json`);
    this.ensureBaselineDir();
  }

  private ensureBaselineDir(): void {
    if (!fs.existsSync(this.baselineDir)) {
      fs.mkdirSync(this.baselineDir, { recursive: true });
    }
  }

  private getBaselinePath(testName: string): string {
    const filename = `${testName}-${this.environment}-${this.browser}.png`;
    return path.join(this.baselineDir, filename);
  }

  async saveBaseline(
    page: Page,
    testName: string,
    description: string = '',
    fullPage: boolean = true,
  ): Promise<BaselineSnapshot> {
    const screenshotPath = this.getBaselinePath(testName);

    await page.screenshot({
      path: screenshotPath,
      fullPage,
    });

    const viewport = page.viewportSize();
    const snapshot: BaselineSnapshot = {
      timestamp: new Date().toISOString(),
      url: page.url(),
      width: viewport?.width || 0,
      height: viewport?.height || 0,
      description,
      filePath: screenshotPath,
    };

    this.updateMetadata(testName, snapshot);

    return snapshot;
  }

  loadBaseline(testName: string): string | null {
    const baselinePath = this.getBaselinePath(testName);

    if (fs.existsSync(baselinePath)) {
      return baselinePath;
    }

    return null;
  }

  updateBaseline(testName: string, description: string = ''): void {
    const metadata = this.loadMetadata();
    const baseline = metadata.snapshots.find((s) => s.filePath.includes(testName));

    if (baseline) {
      baseline.timestamp = new Date().toISOString();
      baseline.description = description;
      this.saveMetadata(metadata);
    }
  }

  deleteBaseline(testName: string): void {
    const baselinePath = this.getBaselinePath(testName);

    if (fs.existsSync(baselinePath)) {
      fs.unlinkSync(baselinePath);
    }

    const metadata = this.loadMetadata();
    metadata.snapshots = metadata.snapshots.filter((s) => !s.filePath.includes(testName));
    this.saveMetadata(metadata);
  }

  listBaselines(): BaselineSnapshot[] {
    const metadata = this.loadMetadata();
    return metadata.snapshots;
  }

  async clearOldBaselines(daysOld: number = 30): Promise<number> {
    const metadata = this.loadMetadata();
    const cutoffTime = new Date(Date.now() - daysOld * 24 * 60 * 60 * 1000);
    let deletedCount = 0;

    metadata.snapshots = metadata.snapshots.filter((snapshot) => {
      const snapshotTime = new Date(snapshot.timestamp);

      if (snapshotTime < cutoffTime) {
        if (fs.existsSync(snapshot.filePath)) {
          fs.unlinkSync(snapshot.filePath);
        }
        deletedCount++;
        return false;
      }

      return true;
    });

    this.saveMetadata(metadata);
    return deletedCount;
  }

  private updateMetadata(testName: string, snapshot: BaselineSnapshot): void {
    const metadata = this.loadMetadata();

    const existingIndex = metadata.snapshots.findIndex((s) => s.filePath.includes(testName));

    if (existingIndex >= 0) {
      metadata.snapshots[existingIndex] = snapshot;
    } else {
      metadata.snapshots.push(snapshot);
    }

    this.saveMetadata(metadata);
  }

  private loadMetadata(): BaselineMetadata {
    if (fs.existsSync(this.metadataFile)) {
      const data = fs.readFileSync(this.metadataFile, 'utf-8');
      return JSON.parse(data);
    }

    return {
      name: 'baseline-metadata',
      environment: this.environment,
      browser: this.browser,
      snapshots: [],
    };
  }

  private saveMetadata(metadata: BaselineMetadata): void {
    fs.writeFileSync(this.metadataFile, JSON.stringify(metadata, null, 2));
  }

  getStatistics(): {
    totalBaselines: number;
    byEnvironment: Record<string, number>;
    byBrowser: Record<string, number>;
  } {
    const allFiles = fs.readdirSync(this.baselineDir).filter((f) => f.endsWith('.png'));

    const byEnvironment: Record<string, number> = {};
    const byBrowser: Record<string, number> = {};

    allFiles.forEach((file) => {
      const match = file.match(/-(dev|staging|prod)-(chromium|firefox|webkit)\.png/);
      if (match) {
        const [, env, browser] = match;
        byEnvironment[env] = (byEnvironment[env] || 0) + 1;
        byBrowser[browser] = (byBrowser[browser] || 0) + 1;
      }
    });

    return {
      totalBaselines: allFiles.length,
      byEnvironment,
      byBrowser,
    };
  }
}
