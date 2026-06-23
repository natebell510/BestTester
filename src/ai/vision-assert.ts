import { Page } from '@playwright/test';
import { LLMRouter } from './llm-router';

export interface VisionAssertOptions {
  router?: LLMRouter;
  systemPrompt?: string;
}

export interface A11yIssue {
  type: 'contrast' | 'missing-alt' | 'heading-structure' | 'focus' | 'aria-label';
  element: string;
  severity: 'critical' | 'major' | 'minor';
  description: string;
}

export class VisionAssert {
  private router: LLMRouter;
  private systemPrompt: string;

  constructor(options?: VisionAssertOptions) {
    this.router = options?.router ?? new LLMRouter();
    this.systemPrompt =
      options?.systemPrompt ??
      'You are a visual QA expert. Analyze the screenshot and provide detailed feedback.';
  }

  async assertPageLooksCorrect(page: Page, description: string): Promise<void> {
    await page.screenshot({ fullPage: true });

    const prompt = `Compare this screenshot to the expected appearance: "${description}".

Does the page layout, styling, and content match the description?
List any visual discrepancies or problems found.`;

    const response = await this.router.chat(prompt, {
      systemPrompt: this.systemPrompt,
      visionRequired: true,
    });

    if (
      response.toLowerCase().includes('mismatch') ||
      response.toLowerCase().includes('incorrect')
    ) {
      throw new Error(`Page appearance does not match description:\n${response}`);
    }
  }

  async assertNoVisualRegressions(page: Page, baselineDescription: string): Promise<void> {
    await page.screenshot({ fullPage: true });

    const prompt = `This is the current page appearance. The baseline description is:
"${baselineDescription}"

Has the visual appearance changed compared to this baseline?
If there are visual regressions, describe them in detail.`;

    const response = await this.router.chat(prompt, {
      systemPrompt: this.systemPrompt,
      visionRequired: true,
    });

    if (
      response.toLowerCase().includes('regression') ||
      response.toLowerCase().includes('changed') ||
      response.toLowerCase().includes('different')
    ) {
      throw new Error(`Visual regression detected:\n${response}`);
    }
  }

  async assertAccessibilityFromScreenshot(page: Page): Promise<A11yIssue[]> {
    await page.screenshot({ fullPage: true });

    const prompt = `Analyze this screenshot for accessibility issues. Check for:
1. Color contrast problems
2. Missing alt text (for images)
3. Heading hierarchy issues
4. Missing focus indicators
5. Missing or incorrect ARIA labels

Return a JSON array of issues with: type, element (CSS selector or description), severity (critical/major/minor), and description.
Return ONLY valid JSON, no markdown.`;

    const response = await this.router.chat(prompt, {
      systemPrompt: 'You are an accessibility auditor.',
      visionRequired: true,
    });

    try {
      const issues: A11yIssue[] = JSON.parse(response);
      if (issues.some((i) => i.severity === 'critical')) {
        throw new Error(`Critical accessibility issues found:\n${JSON.stringify(issues, null, 2)}`);
      }
      return issues;
    } catch {
      throw new Error(`Failed to parse accessibility issues: ${response}`);
    }
  }

  async detectUIAnomalies(page: Page, expectedElements: string[]): Promise<string[]> {
    await page.screenshot({ fullPage: true });

    const prompt = `This page should contain these elements: ${expectedElements.join(', ')}

Analyze the screenshot and list:
1. Elements that are MISSING from the expected list
2. UNEXPECTED elements that shouldn't be there
3. Elements that appear BROKEN or misaligned

Return only a JSON array of strings describing anomalies. Return ONLY valid JSON.`;

    const response = await this.router.chat(prompt, {
      systemPrompt: this.systemPrompt,
      visionRequired: true,
    });

    try {
      const anomalies: string[] = JSON.parse(response);
      return anomalies;
    } catch {
      throw new Error(`Failed to parse UI anomalies: ${response}`);
    }
  }

  async extractDataFromScreenshot<T>(page: Page, schema: { [key: string]: string }): Promise<T> {
    await page.screenshot({ fullPage: true });

    const schemaDescription = Object.entries(schema)
      .map(([key, description]) => `"${key}": ${description}`)
      .join(', ');

    const prompt = `Extract the following data from this screenshot:
${schemaDescription}

Return ONLY a valid JSON object matching this schema. Include null for missing values.`;

    const response = await this.router.chat(prompt, {
      systemPrompt: this.systemPrompt,
      visionRequired: true,
    });

    try {
      return JSON.parse(response) as T;
    } catch {
      throw new Error(`Failed to parse extracted data: ${response}`);
    }
  }
}
