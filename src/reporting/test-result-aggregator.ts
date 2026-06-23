import * as fs from 'fs';
import * as path from 'path';

export interface TestResult {
  testName: string;
  status: 'passed' | 'failed' | 'skipped';
  duration: number;
  category: string;
  errorMessage?: string;
  timestamp: string;
}

export interface TestSuite {
  name: string;
  totalTests: number;
  passed: number;
  failed: number;
  skipped: number;
  duration: number;
  results: TestResult[];
}

export interface AggregatedReport {
  timestamp: string;
  totalTests: number;
  passed: number;
  failed: number;
  skipped: number;
  totalDuration: number;
  suites: TestSuite[];
  categories: Record<string, { passed: number; failed: number; skipped: number }>;
  passRate: number;
}

export class TestResultAggregator {
  private results: TestResult[] = [];
  private suites: Map<string, TestSuite> = new Map();
  private reportDir: string;

  constructor(reportDir: string = 'reports') {
    this.reportDir = reportDir;
    this.ensureReportDir();
  }

  private ensureReportDir(): void {
    if (!fs.existsSync(this.reportDir)) {
      fs.mkdirSync(this.reportDir, { recursive: true });
    }
  }

  addResult(result: TestResult): void {
    this.results.push(result);

    if (!this.suites.has(result.category)) {
      this.suites.set(result.category, {
        name: result.category,
        totalTests: 0,
        passed: 0,
        failed: 0,
        skipped: 0,
        duration: 0,
        results: [],
      });
    }

    const suite = this.suites.get(result.category)!;
    suite.results.push(result);
    suite.totalTests++;
    suite.duration += result.duration;

    if (result.status === 'passed') {
      suite.passed++;
    } else if (result.status === 'failed') {
      suite.failed++;
    } else if (result.status === 'skipped') {
      suite.skipped++;
    }
  }

  getResults(): TestResult[] {
    return this.results;
  }

  getSuite(name: string): TestSuite | undefined {
    return this.suites.get(name);
  }

  getAllSuites(): TestSuite[] {
    return Array.from(this.suites.values());
  }

  getAggregatedReport(): AggregatedReport {
    let totalTests = 0;
    let totalPassed = 0;
    let totalFailed = 0;
    let totalSkipped = 0;
    let totalDuration = 0;

    const categories: Record<string, { passed: number; failed: number; skipped: number }> = {};

    this.results.forEach((result) => {
      totalTests++;
      totalDuration += result.duration;

      if (!categories[result.category]) {
        categories[result.category] = { passed: 0, failed: 0, skipped: 0 };
      }

      if (result.status === 'passed') {
        totalPassed++;
        categories[result.category].passed++;
      } else if (result.status === 'failed') {
        totalFailed++;
        categories[result.category].failed++;
      } else if (result.status === 'skipped') {
        totalSkipped++;
        categories[result.category].skipped++;
      }
    });

    const passRate = totalTests > 0 ? (totalPassed / totalTests) * 100 : 0;

    return {
      timestamp: new Date().toISOString(),
      totalTests,
      passed: totalPassed,
      failed: totalFailed,
      skipped: totalSkipped,
      totalDuration,
      suites: this.getAllSuites(),
      categories,
      passRate,
    };
  }

  generateHTMLReport(filename: string = 'test-report.html'): void {
    const report = this.getAggregatedReport();
    const html = this.buildHTMLReport(report);

    const filepath = path.join(this.reportDir, filename);
    fs.writeFileSync(filepath, html);
  }

  generateJSONReport(filename: string = 'test-report.json'): void {
    const report = this.getAggregatedReport();
    const filepath = path.join(this.reportDir, filename);
    fs.writeFileSync(filepath, JSON.stringify(report, null, 2));
  }

  private buildHTMLReport(report: AggregatedReport): string {
    const passRateColor =
      report.passRate >= 80 ? 'green' : report.passRate >= 50 ? 'orange' : 'red';

    return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Test Report</title>
  <style>
    body {
      font-family: Arial, sans-serif;
      margin: 20px;
      background-color: #f5f5f5;
    }
    .header {
      background-color: #333;
      color: white;
      padding: 20px;
      border-radius: 5px;
      margin-bottom: 20px;
    }
    .summary {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(150px, 1fr));
      gap: 10px;
      margin-bottom: 20px;
    }
    .metric {
      background-color: white;
      padding: 15px;
      border-radius: 5px;
      box-shadow: 0 2px 5px rgba(0,0,0,0.1);
    }
    .metric-label {
      color: #666;
      font-size: 12px;
      text-transform: uppercase;
    }
    .metric-value {
      font-size: 24px;
      font-weight: bold;
      margin-top: 5px;
    }
    .passed { color: #27ae60; }
    .failed { color: #e74c3c; }
    .skipped { color: #f39c12; }
    .suites {
      background-color: white;
      border-radius: 5px;
      box-shadow: 0 2px 5px rgba(0,0,0,0.1);
      overflow: hidden;
    }
    .suite {
      border-bottom: 1px solid #eee;
      padding: 15px;
    }
    .suite:last-child {
      border-bottom: none;
    }
    .suite-name {
      font-weight: bold;
      margin-bottom: 10px;
    }
    .suite-stats {
      display: flex;
      gap: 20px;
      font-size: 12px;
    }
    .stat {
      display: flex;
      align-items: center;
      gap: 5px;
    }
    .progress-bar {
      width: 100%;
      height: 20px;
      background-color: #eee;
      border-radius: 10px;
      overflow: hidden;
      margin-top: 10px;
      display: flex;
    }
    .progress-segment {
      height: 100%;
      display: flex;
      align-items: center;
      justify-content: center;
      color: white;
      font-size: 11px;
    }
  </style>
</head>
<body>
  <div class="header">
    <h1>Test Execution Report</h1>
    <p>Generated: ${new Date(report.timestamp).toLocaleString()}</p>
  </div>

  <div class="summary">
    <div class="metric">
      <div class="metric-label">Total Tests</div>
      <div class="metric-value">${report.totalTests}</div>
    </div>
    <div class="metric">
      <div class="metric-label">Passed</div>
      <div class="metric-value passed">${report.passed}</div>
    </div>
    <div class="metric">
      <div class="metric-label">Failed</div>
      <div class="metric-value failed">${report.failed}</div>
    </div>
    <div class="metric">
      <div class="metric-label">Skipped</div>
      <div class="metric-value skipped">${report.skipped}</div>
    </div>
    <div class="metric">
      <div class="metric-label">Pass Rate</div>
      <div class="metric-value" style="color: ${passRateColor};">${report.passRate.toFixed(1)}%</div>
    </div>
    <div class="metric">
      <div class="metric-label">Duration</div>
      <div class="metric-value">${(report.totalDuration / 1000).toFixed(1)}s</div>
    </div>
  </div>

  <h2>Test Suites</h2>
  <div class="suites">
    ${report.suites
      .map(
        (suite) => `
      <div class="suite">
        <div class="suite-name">${suite.name}</div>
        <div class="suite-stats">
          <div class="stat"><span style="color: #27ae60;">✓</span> ${suite.passed} Passed</div>
          <div class="stat"><span style="color: #e74c3c;">✗</span> ${suite.failed} Failed</div>
          <div class="stat"><span style="color: #f39c12;">→</span> ${suite.skipped} Skipped</div>
          <div class="stat">⏱ ${(suite.duration / 1000).toFixed(2)}s</div>
        </div>
        <div class="progress-bar">
          ${suite.passed > 0 ? `<div class="progress-segment" style="width: ${(suite.passed / suite.totalTests) * 100}%; background-color: #27ae60;"></div>` : ''}
          ${suite.failed > 0 ? `<div class="progress-segment" style="width: ${(suite.failed / suite.totalTests) * 100}%; background-color: #e74c3c;"></div>` : ''}
          ${suite.skipped > 0 ? `<div class="progress-segment" style="width: ${(suite.skipped / suite.totalTests) * 100}%; background-color: #f39c12;"></div>` : ''}
        </div>
      </div>
    `,
      )
      .join('')}
  </div>
</body>
</html>`;
  }

  saveResults(filename: string = 'raw-results.json'): void {
    const filepath = path.join(this.reportDir, filename);
    fs.writeFileSync(filepath, JSON.stringify(this.results, null, 2));
  }

  loadResults(filename: string = 'raw-results.json'): void {
    const filepath = path.join(this.reportDir, filename);
    if (fs.existsSync(filepath)) {
      const data = fs.readFileSync(filepath, 'utf-8');
      this.results = JSON.parse(data);
    }
  }

  getFailedTests(): TestResult[] {
    return this.results.filter((r) => r.status === 'failed');
  }

  getPassedTests(): TestResult[] {
    return this.results.filter((r) => r.status === 'passed');
  }

  getSkippedTests(): TestResult[] {
    return this.results.filter((r) => r.status === 'skipped');
  }

  getSlowestTests(limit: number = 10): TestResult[] {
    return this.results.sort((a, b) => b.duration - a.duration).slice(0, limit);
  }
}
