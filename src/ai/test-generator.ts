import { LLMRouter } from './llm-router';

export interface GeneratedTest {
  filename: string;
  content: string;
  isValid: boolean;
  errors: string[];
}

export interface PageObjectModel {
  className: string;
  content: string;
  isValid: boolean;
  errors: string[];
}

export class TestGenerator {
  private router: LLMRouter;

  constructor(router?: LLMRouter) {
    this.router = router ?? new LLMRouter();
  }

  async generateTestFromDescription(description: string): Promise<GeneratedTest> {
    const prompt = `You are a Playwright test expert. Generate a complete Playwright test spec file from this feature description:

${description}

Requirements:
1. Use Playwright Test framework with modern syntax
2. Include proper imports, fixtures, and test structure
3. Add meaningful assertions
4. Use data-testid selectors or ARIA roles (no CSS class selectors)
5. Include JSDoc comments
6. Follow TypeScript strict mode
7. Tests must be independent and can run in parallel
8. File should be ready to run with no modifications needed

Return ONLY the complete valid TypeScript test file content, no markdown formatting, no code fences.`;

    const response = await this.router.chat(prompt, {
      systemPrompt: `You are an expert Playwright test engineer. Generate production-grade test files that pass ESLint and TypeScript strict mode compilation. Always return valid, runnable code.`,
    });

    return {
      filename: this.sanitizeFilename(description),
      content: response.trim(),
      isValid: await this.validateGeneratedCode(response),
      errors: [],
    };
  }

  async generatePageObject(url: string): Promise<PageObjectModel> {
    const prompt = `Analyze the web page at ${url} and generate a complete Page Object Model class in TypeScript.

Requirements:
1. Use Playwright Test framework
2. Extend from a BasePageObject if available, otherwise create standalone
3. Include selectors for all major UI elements using data-testid or ARIA roles
4. Create helper methods for common interactions (fill form, submit, navigate, etc.)
5. Include proper JSDoc comments
6. Use TypeScript strict types (no any)
7. Organize selectors at the top of the class
8. Include navigation URL getter

Return ONLY the complete valid TypeScript POM class, no markdown formatting.`;

    const response = await this.router.chat(prompt, {
      systemPrompt: `You are a test automation architect. Create well-structured, reusable Page Object Models that follow industry best practices. All code must be production-ready.`,
    });

    const className = this.extractClassNameFromUrl(url);
    return {
      className,
      content: response.trim(),
      isValid: await this.validateGeneratedCode(response),
      errors: [],
    };
  }

  async generateApiTest(openApiSpecUrl: string): Promise<GeneratedTest> {
    const prompt = `Given an OpenAPI 3.0 specification at ${openApiSpecUrl}, generate a complete Playwright API test suite.

Requirements:
1. Test all major endpoints from the OpenAPI spec
2. Include authentication flows if defined in the spec
3. Test success cases, error cases, and edge cases
4. Use Zod schemas for response validation
5. Include proper error handling and assertions
6. Tests must be independent
7. Use TypeScript with strict mode
8. Include environment-based base URL configuration

Return ONLY the complete valid TypeScript test file, no markdown formatting.`;

    const response = await this.router.chat(prompt, {
      systemPrompt: `You are an API test automation expert. Generate comprehensive test suites that validate API contracts. Code must follow Playwright Test framework conventions and be production-ready.`,
    });

    return {
      filename: this.sanitizeFilename(`api-${openApiSpecUrl}`),
      content: response.trim(),
      isValid: await this.validateGeneratedCode(response),
      errors: [],
    };
  }

  async analyzeTestCoverage(pageObjectContent: string): Promise<string[]> {
    const prompt = `Analyze this Page Object Model and identify coverage gaps:

${pageObjectContent}

Return a JSON array of strings describing:
1. Elements that are defined but have no corresponding test actions
2. User journeys that should be tested but aren't covered
3. Error scenarios that are missing
4. Accessibility features that should be tested
5. Performance-critical sections that need testing

Return ONLY valid JSON array, no markdown.`;

    const response = await this.router.chat(prompt, {
      systemPrompt: 'You are a test coverage analyst. Identify gaps in test automation coverage.',
    });

    try {
      return JSON.parse(response);
    } catch {
      return ['Failed to parse coverage analysis'];
    }
  }

  private sanitizeFilename(input: string): string {
    return input
      .toLowerCase()
      .replace(/[^a-z0-9]/g, '-')
      .replace(/-+/g, '-')
      .replace(/^-|-$/g, '')
      .slice(0, 50)
      .concat('.spec.ts');
  }

  private extractClassNameFromUrl(url: string): string {
    try {
      const urlObj = new URL(url);
      const path =
        urlObj.pathname
          .split('/')
          .filter((p) => p.length > 0)
          .pop() || 'Page';
      return path
        .split(/[-_]/)
        .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
        .join('')
        .concat('Page');
    } catch {
      return 'GeneratedPage';
    }
  }

  private async validateGeneratedCode(code: string): Promise<boolean> {
    if (!code) return false;

    const hasImports =
      code.includes('import') && (code.includes('@playwright/test') || code.includes('from'));
    const hasTests =
      code.includes('test(') ||
      code.includes('test.describe(') ||
      code.includes('describe(') ||
      code.includes('export class');
    const hasValidSyntax = !code.includes('INVALID') && !code.includes('TODO');

    return hasImports && hasTests && hasValidSyntax;
  }
}
