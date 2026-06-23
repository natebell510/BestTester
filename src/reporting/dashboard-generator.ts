/* eslint-disable security/detect-non-literal-fs-filename */
import * as fs from 'fs';
import * as path from 'path';

export interface TestMetrics {
  totalTests: number;
  passedTests: number;
  failedTests: number;
  skippedTests: number;
  duration: number;
}

export interface FlakyTest {
  testName: string;
  passCount: number;
  failCount: number;
  flakiness: number;
}

export interface SlowTest {
  testName: string;
  duration: number;
  suggestion: string;
}

export interface DashboardConfig {
  outputDir: string;
  includeAIEvaluation?: boolean;
  includeCoverage?: boolean;
  performanceThreshold?: number;
}

export class DashboardGenerator {
  private config: DashboardConfig;
  private metrics: TestMetrics = {
    totalTests: 0,
    passedTests: 0,
    failedTests: 0,
    skippedTests: 0,
    duration: 0,
  };

  constructor(config: DashboardConfig) {
    this.config = config;
    this.ensureOutputDir();
  }

  private ensureOutputDir(): void {
    const dashboardDir = path.join(this.config.outputDir, 'dashboard');
    if (!fs.existsSync(dashboardDir)) {
      fs.mkdirSync(dashboardDir, { recursive: true });
    }
  }

  setMetrics(metrics: TestMetrics): void {
    this.metrics = metrics;
  }

  calculateHealthScore(
    passRate: number,
    performance: number,
    mutation?: number,
    coverage?: number,
  ): number {
    const weights = {
      passRate: 0.4,
      performance: 0.3,
      mutation: 0.2,
      coverage: 0.1,
    };

    const passScore = passRate * weights.passRate;
    const perfScore = Math.min(performance / 100, 1) * weights.performance;
    const mutationScore = ((mutation ?? 70) / 100) * weights.mutation;
    const coverageScore = ((coverage ?? 70) / 100) * weights.coverage;

    return Math.round((passScore + perfScore + mutationScore + coverageScore) * 100);
  }

  generateTrendChart(trends: Array<{ date: string; passRate: number }>): string {
    return `
    <div class="chart-container">
      <canvas id="trendChart"></canvas>
      <script>
        const trendCtx = document.getElementById('trendChart').getContext('2d');
        new Chart(trendCtx, {
          type: 'line',
          data: {
            labels: ${JSON.stringify(trends.map((t) => t.date))},
            datasets: [{
              label: 'Pass Rate (%)',
              data: ${JSON.stringify(trends.map((t) => t.passRate))},
              borderColor: '#4CAF50',
              backgroundColor: 'rgba(76, 175, 80, 0.1)',
              tension: 0.4,
              fill: true
            }]
          },
          options: {
            responsive: true,
            plugins: {
              legend: { display: true }
            },
            scales: {
              y: {
                beginAtZero: true,
                max: 100
              }
            }
          }
        });
      </script>
    </div>
    `;
  }

  generateFlakyTestsTable(flakyTests: FlakyTest[]): string {
    if (flakyTests.length === 0) {
      return '<p class="info">No flaky tests detected ✅</p>';
    }

    const rows = flakyTests
      .map(
        (test) =>
          `
    <tr>
      <td>${test.testName}</td>
      <td class="pass">${test.passCount}</td>
      <td class="fail">${test.failCount}</td>
      <td>${(test.flakiness * 100).toFixed(1)}%</td>
    </tr>
    `,
      )
      .join('');

    return `
    <table class="data-table">
      <thead>
        <tr>
          <th>Test Name</th>
          <th class="pass">Passes</th>
          <th class="fail">Failures</th>
          <th>Flakiness</th>
        </tr>
      </thead>
      <tbody>${rows}</tbody>
    </table>
    `;
  }

  generateSlowTestsTable(slowTests: SlowTest[]): string {
    if (slowTests.length === 0) {
      return '<p class="info">No slow tests detected ✅</p>';
    }

    const rows = slowTests
      .map(
        (test) =>
          `
    <tr>
      <td>${test.testName}</td>
      <td>${(test.duration / 1000).toFixed(2)}s</td>
      <td class="suggestion">${test.suggestion}</td>
    </tr>
    `,
      )
      .join('');

    return `
    <table class="data-table">
      <thead>
        <tr>
          <th>Test Name</th>
          <th>Duration</th>
          <th>Optimization Suggestion</th>
        </tr>
      </thead>
      <tbody>${rows}</tbody>
    </table>
    `;
  }

  generateDashboard(
    flakyTests: FlakyTest[] = [],
    slowTests: SlowTest[] = [],
    trends: Array<{ date: string; passRate: number }> = [],
  ): string {
    const passRate =
      this.metrics.totalTests > 0 ? (this.metrics.passedTests / this.metrics.totalTests) * 100 : 0;

    const healthScore = this.calculateHealthScore(passRate / 100);
    const healthStatus =
      healthScore >= 80 ? 'excellent' : healthScore >= 60 ? 'good' : 'needs-improvement';

    const html = `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>BestTester Dashboard</title>
  <script src="https://cdn.jsdelivr.net/npm/chart.js"></script>
  <style>
    * {
      margin: 0;
      padding: 0;
      box-sizing: border-box;
    }

    body {
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Oxygen, Ubuntu, Cantarell, sans-serif;
      background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
      min-height: 100vh;
      padding: 20px;
    }

    .container {
      max-width: 1400px;
      margin: 0 auto;
    }

    header {
      background: white;
      padding: 30px;
      border-radius: 8px;
      margin-bottom: 30px;
      box-shadow: 0 2px 8px rgba(0,0,0,0.1);
    }

    header h1 {
      color: #333;
      margin-bottom: 10px;
    }

    header p {
      color: #666;
      font-size: 14px;
    }

    .metrics-grid {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(250px, 1fr));
      gap: 20px;
      margin-bottom: 30px;
    }

    .metric-card {
      background: white;
      padding: 20px;
      border-radius: 8px;
      box-shadow: 0 2px 8px rgba(0,0,0,0.1);
    }

    .metric-card h3 {
      color: #666;
      font-size: 14px;
      text-transform: uppercase;
      margin-bottom: 10px;
    }

    .metric-card .value {
      font-size: 32px;
      font-weight: bold;
      color: #333;
    }

    .health-score {
      grid-column: span 2;
      background: white;
      padding: 30px;
      border-radius: 8px;
      box-shadow: 0 2px 8px rgba(0,0,0,0.1);
      text-align: center;
    }

    .health-circle {
      width: 150px;
      height: 150px;
      border-radius: 50%;
      display: flex;
      align-items: center;
      justify-content: center;
      margin: 0 auto 20px;
      font-size: 48px;
      font-weight: bold;
      color: white;
    }

    .health-circle.excellent {
      background: linear-gradient(135deg, #4CAF50, #45a049);
    }

    .health-circle.good {
      background: linear-gradient(135deg, #FFC107, #FF9800);
    }

    .health-circle.needs-improvement {
      background: linear-gradient(135deg, #F44336, #E91E63);
    }

    .section {
      background: white;
      padding: 30px;
      border-radius: 8px;
      margin-bottom: 30px;
      box-shadow: 0 2px 8px rgba(0,0,0,0.1);
    }

    .section h2 {
      color: #333;
      margin-bottom: 20px;
      font-size: 24px;
      border-bottom: 2px solid #667eea;
      padding-bottom: 10px;
    }

    .data-table {
      width: 100%;
      border-collapse: collapse;
      margin-top: 20px;
    }

    .data-table thead {
      background: #f5f5f5;
    }

    .data-table th,
    .data-table td {
      padding: 12px;
      text-align: left;
      border-bottom: 1px solid #eee;
    }

    .data-table th {
      font-weight: 600;
      color: #333;
    }

    .data-table tbody tr:hover {
      background: #fafafa;
    }

    .data-table .pass {
      color: #4CAF50;
      font-weight: 600;
    }

    .data-table .fail {
      color: #F44336;
      font-weight: 600;
    }

    .data-table .suggestion {
      font-size: 13px;
      color: #666;
    }

    .info {
      color: #666;
      font-size: 14px;
      padding: 10px;
      background: #f5f5f5;
      border-left: 4px solid #667eea;
    }

    .progress-bar {
      width: 100%;
      height: 8px;
      background: #eee;
      border-radius: 4px;
      overflow: hidden;
      margin-top: 10px;
    }

    .progress-fill {
      height: 100%;
      background: linear-gradient(90deg, #667eea, #764ba2);
      border-radius: 4px;
      transition: width 0.3s ease;
    }

    .chart-container {
      position: relative;
      height: 400px;
      margin-top: 20px;
    }

    footer {
      text-align: center;
      color: white;
      margin-top: 40px;
      font-size: 12px;
    }
  </style>
</head>
<body>
  <div class="container">
    <header>
      <h1>🧪 BestTester Dashboard</h1>
      <p>Real-time test intelligence and insights</p>
    </header>

    <div class="metrics-grid">
      <div class="metric-card">
        <h3>Total Tests</h3>
        <div class="value">${this.metrics.totalTests}</div>
      </div>

      <div class="metric-card">
        <h3>Pass Rate</h3>
        <div class="value" style="color: #4CAF50">${passRate.toFixed(1)}%</div>
        <div class="progress-bar">
          <div class="progress-fill" style="width: ${passRate}%"></div>
        </div>
      </div>

      <div class="metric-card">
        <h3>Failed Tests</h3>
        <div class="value" style="color: #F44336">${this.metrics.failedTests}</div>
      </div>

      <div class="metric-card">
        <h3>Duration</h3>
        <div class="value">${(this.metrics.duration / 1000).toFixed(1)}s</div>
      </div>

      <div class="health-score">
        <h3>Health Score</h3>
        <div class="health-circle ${healthStatus}">${healthScore}</div>
        <p>${this.getHealthLabel(healthStatus)}</p>
      </div>
    </div>

    ${trends.length > 0 ? `<div class="section"><h2>📈 Test Trend (7-day)</h2>${this.generateTrendChart(trends)}</div>` : ''}

    <div class="section">
      <h2>🐛 Flaky Tests</h2>
      ${this.generateFlakyTestsTable(flakyTests)}
    </div>

    <div class="section">
      <h2>🐢 Slowest Tests</h2>
      ${this.generateSlowTestsTable(slowTests)}
    </div>

    <footer>
      <p>Generated on ${new Date().toLocaleString()}</p>
      <p>BestTester v1.0 | <a href="https://github.com/natebell510/BestTester" style="color: white;">View on GitHub</a></p>
    </footer>
  </div>
</body>
</html>
    `;

    return html;
  }

  private getHealthLabel(status: string): string {
    switch (status) {
      case 'excellent':
        return 'Framework is in excellent health! 🎉';
      case 'good':
        return 'Framework is performing well. Minor improvements needed.';
      case 'needs-improvement':
        return 'Framework needs attention. Review failing tests and performance metrics.';
      default:
        return 'Unknown status';
    }
  }

  writeDashboard(
    flakyTests: FlakyTest[] = [],
    slowTests: SlowTest[] = [],
    trends: Array<{ date: string; passRate: number }> = [],
  ): string {
    const html = this.generateDashboard(flakyTests, slowTests, trends);
    const dashboardDir = path.join(this.config.outputDir, 'dashboard');
    const filePath = path.join(dashboardDir, 'index.html');

    fs.writeFileSync(filePath, html);

    return filePath;
  }
}
