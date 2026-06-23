import * as fs from 'fs';
import * as path from 'path';
import { PerformanceMetrics } from './performance-collector';

export interface PerformanceHistory {
  date: string;
  metrics: PerformanceMetrics[];
}

export class PerformanceReporter {
  private historyFile = path.resolve(__dirname, '../../reports/performance-history.json');

  private ensureHistoryFile(): void {
    const dir = path.dirname(this.historyFile);
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }
    if (!fs.existsSync(this.historyFile)) {
      fs.writeFileSync(this.historyFile, JSON.stringify([], null, 2));
    }
  }

  recordMetrics(metrics: PerformanceMetrics[]): void {
    this.ensureHistoryFile();
    const history = this.loadHistory();

    history.push({
      date: new Date().toISOString(),
      metrics,
    });

    // Keep last 10 runs
    if (history.length > 10) {
      history.shift();
    }

    fs.writeFileSync(this.historyFile, JSON.stringify(history, null, 2));
  }

  loadHistory(): PerformanceHistory[] {
    this.ensureHistoryFile();
    const data = fs.readFileSync(this.historyFile, 'utf-8');
    return JSON.parse(data) as PerformanceHistory[];
  }

  getLatestMetrics(): PerformanceMetrics[] {
    const history = this.loadHistory();
    return history.length > 0 ? history[history.length - 1].metrics : [];
  }

  getTrendData(
    metric: 'lcp' | 'inp' | 'cls' | 'ttfb' | 'fcp',
  ): Array<{ date: string; value: number | null }> {
    const history = this.loadHistory();

    return history.map((entry) => {
      const values = entry.metrics.map((m) => m[metric]).filter((v) => v !== null);
      const avg =
        values.length > 0 ? values.reduce((a, b) => (a ?? 0) + (b ?? 0), 0) / values.length : null;

      return {
        date: new Date(entry.date).toLocaleDateString(),
        value: avg,
      };
    });
  }

  generateTrendReport(metric: 'lcp' | 'inp' | 'cls' | 'ttfb' | 'fcp'): string {
    const trend = this.getTrendData(metric);

    let report = `# ${metric.toUpperCase()} Trend Report\n\n`;
    report += `| Date | Value | Trend |\n`;
    report += `|------|-------|-------|\n`;

    let previous: number | null = null;
    trend.forEach((entry) => {
      const trendDirection =
        previous === null
          ? '-'
          : entry.value === null
            ? '-'
            : entry.value < previous
              ? '📉'
              : entry.value > previous
                ? '📈'
                : '➡️';
      report += `| ${entry.date} | ${entry.value?.toFixed(2) || 'N/A'} | ${trendDirection} |\n`;
      if (entry.value !== null) {
        previous = entry.value;
      }
    });

    return report;
  }

  generateHTMLReport(): string {
    const history = this.loadHistory();
    const latestMetrics = this.getLatestMetrics();

    const lcpTrend = this.getTrendData('lcp');
    const clsTrend = this.getTrendData('cls');
    const ttfbTrend = this.getTrendData('ttfb');

    let html = `<!DOCTYPE html>
<html>
<head>
  <title>Performance Report</title>
  <style>
    body { font-family: Arial, sans-serif; margin: 20px; background: #f5f5f5; }
    .container { max-width: 1200px; margin: 0 auto; background: white; padding: 20px; border-radius: 8px; }
    h1 { color: #333; }
    table { width: 100%; border-collapse: collapse; margin: 20px 0; }
    th, td { padding: 12px; text-align: left; border-bottom: 1px solid #ddd; }
    th { background-color: #f9f9f9; font-weight: bold; }
    tr:hover { background-color: #f5f5f5; }
    .good { color: #4caf50; }
    .warn { color: #ff9800; }
    .fail { color: #f44336; }
    .metric-box { display: inline-block; margin: 10px; padding: 15px; border-radius: 8px; background: #f0f0f0; }
    .chart { margin: 20px 0; padding: 10px; background: #f9f9f9; border-left: 4px solid #2196f3; }
  </style>
</head>
<body>
  <div class="container">
    <h1>Performance Report</h1>
    <p>Generated: ${new Date().toLocaleString()}</p>

    <h2>Latest Metrics</h2>
    <table>
      <thead>
        <tr>
          <th>URL</th>
          <th>LCP</th>
          <th>INP</th>
          <th>CLS</th>
          <th>TTFB</th>
        </tr>
      </thead>
      <tbody>
`;

    latestMetrics.forEach((m) => {
      html += `        <tr>
          <td>${m.url}</td>
          <td class="${m.lcp !== null && m.lcp < 2500 ? 'good' : m.lcp !== null && m.lcp < 4000 ? 'warn' : 'fail'}">${m.lcp?.toFixed(0) || 'N/A'}</td>
          <td class="${m.inp !== null && m.inp < 200 ? 'good' : m.inp !== null && m.inp < 500 ? 'warn' : 'fail'}">${m.inp?.toFixed(0) || 'N/A'}</td>
          <td class="${m.cls !== null && m.cls < 0.1 ? 'good' : m.cls !== null && m.cls < 0.25 ? 'warn' : 'fail'}">${m.cls?.toFixed(3) || 'N/A'}</td>
          <td class="${m.ttfb !== null && m.ttfb < 800 ? 'good' : m.ttfb !== null && m.ttfb < 1800 ? 'warn' : 'fail'}">${m.ttfb?.toFixed(0) || 'N/A'}</td>
        </tr>
`;
    });

    html += `      </tbody>
    </table>

    <h2>Trends</h2>
    <div class="chart">
      <h3>LCP Trend (Last 10 runs)</h3>
      <table>
        <tr>
          ${lcpTrend.map((t) => `<td>${t.value?.toFixed(0) || '-'}</td>`).join('')}
        </tr>
      </table>
    </div>

    <div class="chart">
      <h3>CLS Trend (Last 10 runs)</h3>
      <table>
        <tr>
          ${clsTrend.map((t) => `<td>${t.value?.toFixed(3) || '-'}</td>`).join('')}
        </tr>
      </table>
    </div>

    <div class="chart">
      <h3>TTFB Trend (Last 10 runs)</h3>
      <table>
        <tr>
          ${ttfbTrend.map((t) => `<td>${t.value?.toFixed(0) || '-'}</td>`).join('')}
        </tr>
      </table>
    </div>

    <h2>History</h2>
    <p>Total runs: ${history.length}</p>
  </div>
</body>
</html>`;

    return html;
  }

  saveHTMLReport(): void {
    const reportPath = path.resolve(__dirname, '../../reports/performance-report.html');
    const html = this.generateHTMLReport();
    fs.writeFileSync(reportPath, html);
  }
}
