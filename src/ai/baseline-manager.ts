import * as fs from 'fs';
import * as path from 'path';

export interface Baseline {
  name: string;
  description: string;
  environment: 'dev' | 'staging' | 'prod';
  browser: 'chromium' | 'firefox' | 'webkit';
  timestamp: string;
  hash?: string;
}

const BASELINE_DIR = path.resolve(__dirname, '../../tests/ai/baselines');

export class BaselineManager {
  private environment: 'dev' | 'staging' | 'prod';
  private browser: 'chromium' | 'firefox' | 'webkit';

  constructor(
    environment: 'dev' | 'staging' | 'prod' = 'dev',
    browser: 'chromium' | 'firefox' | 'webkit' = 'chromium',
  ) {
    this.environment = environment;
    this.browser = browser;

    if (!fs.existsSync(BASELINE_DIR)) {
      fs.mkdirSync(BASELINE_DIR, { recursive: true });
    }
  }

  private getBaselinePath(name: string): string {
    return path.join(BASELINE_DIR, `${this.environment}_${this.browser}_${name}.json`);
  }

  saveBaseline(name: string, description: string, hash?: string): void {
    const baseline: Baseline = {
      name,
      description,
      environment: this.environment,
      browser: this.browser,
      timestamp: new Date().toISOString(),
      hash,
    };

    const filePath = this.getBaselinePath(name);
    fs.writeFileSync(filePath, JSON.stringify(baseline, null, 2));
  }

  loadBaseline(name: string): Baseline | null {
    const filePath = this.getBaselinePath(name);
    if (!fs.existsSync(filePath)) {
      return null;
    }
    return JSON.parse(fs.readFileSync(filePath, 'utf-8')) as Baseline;
  }

  getBaselineDescription(name: string): string | null {
    const baseline = this.loadBaseline(name);
    return baseline?.description ?? null;
  }

  updateBaseline(name: string, updates: Partial<Baseline>): void {
    const baseline = this.loadBaseline(name);
    if (!baseline) {
      throw new Error(`Baseline ${name} not found`);
    }

    const updated: Baseline = { ...baseline, ...updates, timestamp: new Date().toISOString() };
    const filePath = this.getBaselinePath(name);
    fs.writeFileSync(filePath, JSON.stringify(updated, null, 2));
  }

  deleteBaseline(name: string): void {
    const filePath = this.getBaselinePath(name);
    if (fs.existsSync(filePath)) {
      fs.unlinkSync(filePath);
    }
  }

  listBaselines(): Baseline[] {
    if (!fs.existsSync(BASELINE_DIR)) {
      return [];
    }

    return fs
      .readdirSync(BASELINE_DIR)
      .filter((f) => f.startsWith(`${this.environment}_${this.browser}_`) && f.endsWith('.json'))
      .map((f) => JSON.parse(fs.readFileSync(path.join(BASELINE_DIR, f), 'utf-8')) as Baseline);
  }

  clearOldBaselines(daysOld: number): void {
    const now = Date.now();
    const maxAge = daysOld * 24 * 60 * 60 * 1000;

    for (const baseline of this.listBaselines()) {
      const age = now - new Date(baseline.timestamp).getTime();
      if (age > maxAge) {
        this.deleteBaseline(baseline.name);
      }
    }
  }
}
