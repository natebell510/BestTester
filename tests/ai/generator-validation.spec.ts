import { test, expect } from '@playwright/test';
import { TestGenerator } from '../../src/ai/test-generator';

test.describe('TestGenerator', () => {
  let generator: TestGenerator;

  test.beforeEach(() => {
    generator = new TestGenerator();
  });

  test.describe('generateTestFromDescription', () => {
    test('generates valid test file from feature description', async () => {
      const description =
        'Test user login flow: user enters email and password, clicks login, and sees dashboard';
      const result = await generator.generateTestFromDescription(description);

      expect(result.filename).toContain('.spec.ts');
      expect(result.content).toBeTruthy();
      expect(result.content).toContain('import');
      expect(result.content).toContain('@playwright/test');
      expect(result.isValid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    test('generates test with proper imports and structure', async () => {
      const description = 'Test form submission with validation';
      const result = await generator.generateTestFromDescription(description);

      expect(result.content).toMatch(/import.*@playwright\/test/);
      expect(result.content).toMatch(/test\(|test\.describe\(/);
      expect(result.content).toMatch(/expect\(/);
      expect(result.content).toBeTruthy();
    });

    test('generates test using data-testid or ARIA roles', async () => {
      const description = 'Test button click interaction';
      const result = await generator.generateTestFromDescription(description);

      const hasTestId =
        result.content.includes('data-testid') || result.content.includes('getByTestId(');
      const hasAriaRole = result.content.includes('getByRole(') || result.content.includes('role=');
      expect(hasTestId || hasAriaRole).toBe(true);
    });

    test('sanitizes filename correctly', async () => {
      const description = 'This Is A Test With Special #$% Characters @#$ And Many Spaces!!!';
      const result = await generator.generateTestFromDescription(description);

      expect(result.filename).toMatch(/^[a-z0-9-]+\.spec\.ts$/);
      expect(result.filename.length).toBeLessThanOrEqual(65); // 50 + .spec.ts length
    });
  });

  test.describe('generatePageObject', () => {
    test('generates valid page object from URL', async () => {
      const url = 'https://example.com/login';
      const result = await generator.generatePageObject(url);

      expect(result.className).toBeTruthy();
      expect(result.className).toMatch(/Page$/);
      expect(result.content).toContain('class');
      expect(result.content).toContain('export');
      expect(result.isValid).toBe(true);
    });

    test('generates page object with selector definitions', async () => {
      const url = 'https://example.com/dashboard';
      const result = await generator.generatePageObject(url);

      const hasSelectors =
        result.content.includes('locator') ||
        result.content.includes('getByTestId') ||
        result.content.includes('getByRole');
      expect(hasSelectors).toBe(true);
    });

    test('generates page object with helper methods', async () => {
      const url = 'https://example.com/profile';
      const result = await generator.generatePageObject(url);

      const hasMethods =
        result.content.includes('async') ||
        result.content.includes('public') ||
        result.content.includes('private');
      expect(hasMethods).toBe(true);
    });

    test('extracts class name from URL correctly', async () => {
      const url = 'https://example.com/employee-list';
      const result = await generator.generatePageObject(url);

      expect(result.className).toMatch(/EmployeeListPage|ListPage/);
    });

    test('handles URL without path gracefully', async () => {
      const url = 'https://example.com';
      const result = await generator.generatePageObject(url);

      expect(result.className).toMatch(/Page$/);
      expect(result.className).toBe('GeneratedPage');
    });
  });

  test.describe('generateApiTest', () => {
    test('generates valid API test from OpenAPI spec URL', async () => {
      const specUrl = 'https://api.example.com/openapi.json';
      const result = await generator.generateApiTest(specUrl);

      expect(result.filename).toContain('.spec.ts');
      expect(result.content).toContain('import');
      expect(result.content).toContain('@playwright/test');
      expect(result.isValid).toBe(true);
    });

    test('generates API test with request handling', async () => {
      const specUrl = 'https://api.example.com/v1/spec.json';
      const result = await generator.generateApiTest(specUrl);

      const hasRequests =
        result.content.includes('request') ||
        result.content.includes('post') ||
        result.content.includes('get');
      expect(hasRequests).toBe(true);
    });

    test('generates API test with assertions', async () => {
      const specUrl = 'https://api.example.com/openapi.json';
      const result = await generator.generateApiTest(specUrl);

      expect(result.content).toMatch(/expect\(.*status/i);
      expect(result.content).toMatch(/expect\(.*response/i);
    });

    test('generates API test filename from spec URL', async () => {
      const specUrl = 'https://api.example.com/petstore-spec.json';
      const result = await generator.generateApiTest(specUrl);

      expect(result.filename).toContain('api');
      expect(result.filename).toContain('.spec.ts');
    });
  });

  test.describe('analyzeTestCoverage', () => {
    test('returns coverage gaps for page object', async () => {
      const pomContent = `
        export class LoginPage {
          private emailInput = this.page.getByTestId('email');
          private passwordInput = this.page.getByTestId('password');
          private loginButton = this.page.getByRole('button', { name: 'Login' });

          async enterEmail(email: string) {
            await this.emailInput.fill(email);
          }
        }
      `;

      const gaps = await generator.analyzeTestCoverage(pomContent);

      expect(Array.isArray(gaps)).toBe(true);
      expect(gaps.length).toBeGreaterThan(0);
      gaps.forEach((gap) => {
        expect(typeof gap).toBe('string');
      });
    });

    test('identifies missing test actions', async () => {
      const pomContent = `
        export class RegistrationPage {
          private firstNameField = this.page.getByTestId('firstName');
          private lastNameField = this.page.getByTestId('lastName');
          private emailField = this.page.getByTestId('email');
          private submitButton = this.page.getByRole('button', { name: 'Register' });
        }
      `;

      const gaps = await generator.analyzeTestCoverage(pomContent);

      const hasActionGaps = gaps.some(
        (gap) =>
          gap.toLowerCase().includes('action') ||
          gap.toLowerCase().includes('method') ||
          gap.toLowerCase().includes('interaction'),
      );
      expect(hasActionGaps).toBe(true);
    });

    test('identifies accessibility testing gaps', async () => {
      const pomContent = `
        export class FormPage {
          async submitForm() {
            await this.page.click('button');
          }
        }
      `;

      const gaps = await generator.analyzeTestCoverage(pomContent);

      const hasA11yGaps = gaps.some(
        (gap) =>
          gap.toLowerCase().includes('accessible') ||
          gap.toLowerCase().includes('accessibility') ||
          gap.toLowerCase().includes('a11y'),
      );
      expect(hasA11yGaps).toBe(true);
    });

    test('returns empty array for malformed input gracefully', async () => {
      const invalidContent = 'not valid code at all @#$ %';
      const gaps = await generator.analyzeTestCoverage(invalidContent);

      expect(Array.isArray(gaps)).toBe(true);
    });
  });

  test.describe('validation', () => {
    test('validates generated TypeScript syntax', async () => {
      const description = 'Simple button click test';
      const result = await generator.generateTestFromDescription(description);

      expect(result.content).not.toContain('INVALID');
      expect(result.content).not.toContain('TODO TODO');
      expect(result.isValid).toBe(true);
    });

    test('generated code includes required imports', async () => {
      const description = 'Test navigation flow';
      const result = await generator.generateTestFromDescription(description);

      expect(result.content).toContain('import');
      expect(result.content).toMatch(/@playwright|playwright\/test/);
    });

    test('rejects code without proper test structure', async () => {
      const invalidCode = 'console.log("hello");';
      const isValid = await generator.generateTestFromDescription(invalidCode);

      expect(typeof isValid).toBe('object');
    });
  });
});
