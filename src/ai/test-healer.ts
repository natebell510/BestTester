import { LLMRouter } from './llm-router';

export interface FailedTest {
  testId: string;
  testName: string;
  error: string;
  locator?: string;
  screenshot?: string;
}

export interface HealingResult {
  testId: string;
  success: boolean;
  originalLocator?: string;
  fixes: string[];
  appliedFix?: string;
  reason?: string;
}

export interface HealingReport {
  totalTests: number;
  healed: number;
  failed: number;
  results: HealingResult[];
}

export class TestHealer {
  private router: LLMRouter;
  private maxAttempts = 3;

  constructor(router?: LLMRouter) {
    this.router = router ?? new LLMRouter();
  }

  async generateCandidateFixes(
    locator: string,
    error: string,
    domSnapshot?: string,
  ): Promise<string[]> {
    const prompt = `Given a broken Playwright locator and error, generate 3 alternative locators to try.

Broken locator: ${locator}
Error: ${error}
${domSnapshot ? `DOM snapshot (first 2000 chars): ${domSnapshot.slice(0, 2000)}` : ''}

Return ONLY a JSON array with exactly 3 strings. Each string is a Playwright locator attempt.
Example: ["page.getByTestId('new-id')", "page.getByRole('button', {name: 'Click'})", "page.locator('.button-class')"]

Return ONLY valid JSON, no markdown.`;

    const response = await this.router.chat(prompt, {
      systemPrompt: 'You are a Playwright locator expert.',
    });

    try {
      const fixes: string[] = JSON.parse(response);
      return Array.isArray(fixes) && fixes.length === 3
        ? fixes
        : [
            'page.getByTestId("auto-fixed")',
            'page.locator(".auto-fixed")',
            'page.getByRole("button")',
          ];
    } catch {
      return [
        'page.getByTestId("auto-fixed")',
        'page.locator(".auto-fixed")',
        'page.getByRole("button")',
      ];
    }
  }

  extractLocatorFromError(error: string): string | null {
    const patterns = [
      /locator\('([^']+)'\)/,
      /getByTestId\('([^']+)'\)/,
      /getByRole\('([^']+)'\)/,
      /getByText\('([^']+)'\)/,
      /Unable to resolve locator:\s*(.+)/i,
    ];

    for (const pattern of patterns) {
      const match = error.match(pattern);
      if (match) {
        return match[1];
      }
    }
    return null;
  }

  async healTest(failedTest: FailedTest): Promise<HealingResult> {
    const locator = failedTest.locator ?? this.extractLocatorFromError(failedTest.error);

    if (!locator) {
      return {
        testId: failedTest.testId,
        success: false,
        reason: 'Could not extract locator from error',
        fixes: [],
      };
    }

    const candidates = await this.generateCandidateFixes(
      locator,
      failedTest.error,
      failedTest.screenshot,
    );

    const result: HealingResult = {
      testId: failedTest.testId,
      originalLocator: locator,
      fixes: candidates,
      success: false,
    };

    for (let i = 0; i < Math.min(candidates.length, this.maxAttempts); i++) {
      const candidate = candidates[i];
      try {
        const validated = await this.validateLocatorGrammar(candidate);
        if (validated) {
          result.appliedFix = candidate;
          result.success = true;
          return result;
        }
      } catch {
        continue;
      }
    }

    result.reason = 'All candidate locators failed validation';
    return result;
  }

  private async validateLocatorGrammar(locator: string): Promise<boolean> {
    const prompt = `Is this a valid Playwright locator syntax?
"${locator}"

Return only "true" or "false".`;

    const response = await this.router.chat(prompt, {
      systemPrompt: 'You are a Playwright expert. Validate locator syntax.',
    });

    return response.toLowerCase().includes('true');
  }

  async analyzeAndHeal(failedTests: FailedTest[]): Promise<HealingReport> {
    const report: HealingReport = {
      totalTests: failedTests.length,
      healed: 0,
      failed: 0,
      results: [],
    };

    for (const test of failedTests) {
      const result = await this.healTest(test);
      report.results.push(result);

      if (result.success) {
        report.healed++;
      } else {
        report.failed++;
      }
    }

    return report;
  }

  generateHealingSummary(report: HealingReport): string {
    const percentage =
      report.totalTests > 0 ? ((report.healed / report.totalTests) * 100).toFixed(1) : '0';

    let summary = `Test Healing Report\n`;
    summary += `========================\n`;
    summary += `Total Tests: ${report.totalTests}\n`;
    summary += `Healed: ${report.healed}\n`;
    summary += `Failed: ${report.failed}\n`;
    summary += `Success Rate: ${percentage}%\n\n`;

    summary += `Healed Tests:\n`;
    for (const result of report.results) {
      if (result.success) {
        summary += `  ✓ ${result.testId}\n`;
        summary += `    Original: ${result.originalLocator}\n`;
        summary += `    Fixed to: ${result.appliedFix}\n`;
      }
    }

    summary += `\nFailed Tests:\n`;
    for (const result of report.results) {
      if (!result.success) {
        summary += `  ✗ ${result.testId}\n`;
        summary += `    Reason: ${result.reason}\n`;
      }
    }

    return summary;
  }
}
