import { PerformanceMetrics } from './performance-collector';

export interface BudgetThresholds {
  lcp?: { good: number; warn: number; fail: number };
  inp?: { good: number; warn: number; fail: number };
  cls?: { good: number; warn: number; fail: number };
  ttfb?: { good: number; warn: number; fail: number };
  fcp?: { good: number; warn: number; fail: number };
}

export interface BudgetViolation {
  metric: string;
  actual: number;
  threshold: {
    good: number;
    warn: number;
    fail: number;
  };
  status: 'pass' | 'warn' | 'fail';
  message: string;
}

export class PerformanceBudget {
  private budgets: Map<string, BudgetThresholds> = new Map();

  constructor() {
    this.setupDefaultBudgets();
  }

  private setupDefaultBudgets(): void {
    const defaultBudget: BudgetThresholds = {
      lcp: { good: 2500, warn: 4000, fail: 5000 },
      inp: { good: 200, warn: 500, fail: 1000 },
      cls: { good: 0.1, warn: 0.25, fail: 0.5 },
      ttfb: { good: 800, warn: 1800, fail: 3000 },
      fcp: { good: 1800, warn: 3000, fail: 4000 },
    };

    this.budgets.set('default', defaultBudget);
    this.budgets.set('dev', { ...defaultBudget, lcp: { good: 3000, warn: 4500, fail: 6000 } });
    this.budgets.set('staging', { ...defaultBudget });
    this.budgets.set('prod', {
      ...defaultBudget,
      lcp: { good: 2000, warn: 2800, fail: 4000 },
      ttfb: { good: 600, warn: 1200, fail: 2000 },
    });
  }

  setBudget(environment: string, budget: BudgetThresholds): void {
    this.budgets.set(environment, budget);
  }

  getBudget(environment: string): BudgetThresholds {
    return this.budgets.get(environment) || this.budgets.get('default')!;
  }

  checkMetrics(metrics: PerformanceMetrics, environment: string = 'default'): BudgetViolation[] {
    const budget = this.getBudget(environment);
    const violations: BudgetViolation[] = [];

    if (metrics.lcp !== null && budget.lcp) {
      const violation = this.checkMetric('LCP', metrics.lcp, budget.lcp);
      if (violation) violations.push(violation);
    }

    if (metrics.inp !== null && budget.inp) {
      const violation = this.checkMetric('INP', metrics.inp, budget.inp);
      if (violation) violations.push(violation);
    }

    if (metrics.cls !== null && budget.cls) {
      const violation = this.checkMetric('CLS', metrics.cls, budget.cls);
      if (violation) violations.push(violation);
    }

    if (metrics.ttfb !== null && budget.ttfb) {
      const violation = this.checkMetric('TTFB', metrics.ttfb, budget.ttfb);
      if (violation) violations.push(violation);
    }

    if (metrics.fcp !== null && budget.fcp) {
      const violation = this.checkMetric('FCP', metrics.fcp, budget.fcp);
      if (violation) violations.push(violation);
    }

    return violations;
  }

  private checkMetric(
    name: string,
    actual: number,
    thresholds: { good: number; warn: number; fail: number },
  ): BudgetViolation | null {
    let status: 'pass' | 'warn' | 'fail' = 'pass';
    if (actual > thresholds.fail) {
      status = 'fail';
    } else if (actual > thresholds.warn) {
      status = 'warn';
    }

    if (status !== 'pass') {
      return {
        metric: name,
        actual,
        threshold: thresholds,
        status,
        message:
          status === 'fail'
            ? `${name} failed: ${actual.toFixed(0)}ms exceeds budget of ${thresholds.fail}ms`
            : `${name} warning: ${actual.toFixed(0)}ms exceeds good threshold of ${thresholds.good}ms`,
      };
    }

    return null;
  }

  generateReport(violations: BudgetViolation[]): string {
    if (violations.length === 0) {
      return 'All performance budgets met ✅';
    }

    const failViolations = violations.filter((v) => v.status === 'fail');
    const warnViolations = violations.filter((v) => v.status === 'warn');

    let report = `# Performance Budget Report\n\n`;
    report += `## Summary\n`;
    report += `- **Failed**: ${failViolations.length}\n`;
    report += `- **Warnings**: ${warnViolations.length}\n\n`;

    if (failViolations.length > 0) {
      report += `## ❌ Failed Budgets\n\n`;
      failViolations.forEach((v) => {
        report += `### ${v.metric}\n`;
        report += `- **Actual**: ${v.actual.toFixed(2)}\n`;
        report += `- **Fail Threshold**: ${v.threshold.fail}\n`;
        report += `- **Good Threshold**: ${v.threshold.good}\n`;
        report += `- **Message**: ${v.message}\n\n`;
      });
    }

    if (warnViolations.length > 0) {
      report += `## ⚠️ Warnings\n\n`;
      warnViolations.forEach((v) => {
        report += `### ${v.metric}\n`;
        report += `- **Actual**: ${v.actual.toFixed(2)}\n`;
        report += `- **Good Threshold**: ${v.threshold.good}\n`;
        report += `- **Warn Threshold**: ${v.threshold.warn}\n`;
        report += `- **Message**: ${v.message}\n\n`;
      });
    }

    return report;
  }
}
