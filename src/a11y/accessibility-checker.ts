import { Page } from '@playwright/test';
import { injectAxe, checkA11y, getViolations } from 'axe-playwright';

export interface A11yViolation {
  id: string;
  impact: 'minor' | 'moderate' | 'serious' | 'critical';
  description: string;
  help: string;
  helpUrl: string;
  nodes: Array<{
    html: string;
    target: string[];
  }>;
  wcag: Array<{
    level: 'A' | 'AA' | 'AAA';
    version: string;
  }>;
}

export interface A11yCheckOptions {
  rules?: string[];
  disableRules?: string[];
  standards?: 'wcag2a' | 'wcag2aa' | 'wcag21a' | 'wcag21aa' | 'wcag22a' | 'wcag22aa';
  exclude?: string[];
  include?: string[];
}

export interface A11yCheckResult {
  pageUrl: string;
  violations: A11yViolation[];
  passes: number;
  incomplete: number;
  timestamp: string;
}

export class AccessibilityChecker {
  private violationsByPage: Map<string, A11yViolation[]> = new Map();

  async checkPage(page: Page, options?: A11yCheckOptions): Promise<A11yCheckResult> {
    const pageUrl = page.url();

    await injectAxe(page);

    try {
      await checkA11y(
        page,
        null,
        {
          detailedReport: true,
          detailedRules: [
            'color-contrast',
            'image-alt',
            'aria-required-attr',
            'aria-roles',
            'button-name',
            'duplicate-id',
            'form-field-multiple-labels',
            'heading-order',
            'html-lang-valid',
            'link-name',
          ],
          rules: options?.rules ? { only: options.rules } : undefined,
          disableRules: options?.disableRules,
          standards: options?.standards || 'wcag22aa',
          exclude: options?.exclude,
          include: options?.include,
        },
        false,
      );
    } catch {
      // Violations found, continue processing
    }

    const violations = await getViolations(page);

    const mappedViolations: A11yViolation[] = violations.map((v) => ({
      id: v.id,
      impact: v.impact as 'minor' | 'moderate' | 'serious' | 'critical',
      description: v.description,
      help: v.help,
      helpUrl: v.helpUrl,
      nodes: (v.nodes || []).map((n) => ({
        html: n.html,
        target: n.target || [],
      })),
      wcag: (v.tags || [])
        .filter((t) => t.startsWith('wcag') || t.startsWith('best-practice'))
        .map((tag) => {
          const match = tag.match(/wcag(\d+)([a-z])(\d)/);
          if (match) {
            return {
              level: match[2].toUpperCase() as 'A' | 'AA' | 'AAA',
              version: `${match[1].slice(0, 1)}.${match[1].slice(1)}`,
            };
          }
          return { level: 'AA' as const, version: '2.1' };
        }),
    }));

    this.violationsByPage.set(pageUrl, mappedViolations);

    return {
      pageUrl,
      violations: mappedViolations,
      passes: 0,
      incomplete: 0,
      timestamp: new Date().toISOString(),
    };
  }

  async checkComponent(
    page: Page,
    selector: string,
    options?: A11yCheckOptions,
  ): Promise<A11yCheckResult> {
    const pageUrl = page.url();

    await injectAxe(page);

    try {
      await checkA11y(
        page,
        selector,
        {
          detailedReport: true,
          rules: options?.rules ? { only: options.rules } : undefined,
          standards: options?.standards || 'wcag22aa',
        },
        false,
      );
    } catch {
      // Component has violations
    }

    const violations = await getViolations(page);

    const mappedViolations: A11yViolation[] = violations.map((v) => ({
      id: v.id,
      impact: v.impact as 'minor' | 'moderate' | 'serious' | 'critical',
      description: v.description,
      help: v.help,
      helpUrl: v.helpUrl,
      nodes: (v.nodes || []).map((n) => ({
        html: n.html,
        target: n.target || [],
      })),
      wcag: [],
    }));

    return {
      pageUrl: `${pageUrl} (component: ${selector})`,
      violations: mappedViolations,
      passes: 0,
      incomplete: 0,
      timestamp: new Date().toISOString(),
    };
  }

  async checkColorContrast(page: Page): Promise<A11yViolation[]> {
    const result = await this.checkPage(page, {
      rules: ['color-contrast'],
    });
    return result.violations.filter((v) => v.id === 'color-contrast');
  }

  generateA11yReport(violations: A11yViolation[]): string {
    if (violations.length === 0) {
      return 'No accessibility violations found ✓';
    }

    const criticalCount = violations.filter((v) => v.impact === 'critical').length;
    const seriousCount = violations.filter((v) => v.impact === 'serious').length;
    const moderateCount = violations.filter((v) => v.impact === 'moderate').length;
    const minorCount = violations.filter((v) => v.impact === 'minor').length;

    let report = `# Accessibility Report\n\n`;
    report += `## Summary\n`;
    report += `- **Critical**: ${criticalCount}\n`;
    report += `- **Serious**: ${seriousCount}\n`;
    report += `- **Moderate**: ${moderateCount}\n`;
    report += `- **Minor**: ${minorCount}\n`;
    report += `- **Total**: ${violations.length}\n\n`;

    // Group by impact
    const byImpact = new Map<string, A11yViolation[]>();
    violations.forEach((v) => {
      if (!byImpact.has(v.impact)) {
        byImpact.set(v.impact, []);
      }
      byImpact.get(v.impact)!.push(v);
    });

    // Sort by impact severity
    const impacts = ['critical', 'serious', 'moderate', 'minor'];
    impacts.forEach((impact) => {
      const impactViolations = byImpact.get(impact);
      if (impactViolations && impactViolations.length > 0) {
        report += `## ${impact.toUpperCase()} Issues\n\n`;
        impactViolations.forEach((v) => {
          report += `### ${v.description}\n`;
          report += `- **ID**: ${v.id}\n`;
          report += `- **Help**: ${v.help}\n`;
          report += `- **URL**: [${v.helpUrl}](${v.helpUrl})\n`;
          if (v.nodes.length > 0) {
            report += `- **Affected Elements**: ${v.nodes.length}\n`;
            v.nodes.slice(0, 3).forEach((node) => {
              report += `  - \`${node.html.substring(0, 80)}...\`\n`;
            });
            if (v.nodes.length > 3) {
              report += `  - ... and ${v.nodes.length - 3} more\n`;
            }
          }
          report += `\n`;
        });
      }
    });

    return report;
  }

  getSummary(): Map<string, A11yViolation[]> {
    return this.violationsByPage;
  }

  clear(): void {
    this.violationsByPage.clear();
  }
}
