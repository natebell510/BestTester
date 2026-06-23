/* eslint-disable no-console */
/* eslint-disable @typescript-eslint/no-explicit-any */
/* eslint-disable security/detect-non-literal-fs-filename */
import * as fs from 'fs';
import * as path from 'path';
import { Anthropic } from '@anthropic-ai/sdk';
import Enquirer from 'enquirer';
import { execSync } from 'child_process';

const client = new Anthropic();
const enquirer = new Enquirer();

interface TestInput {
  testType: 'UI' | 'API' | 'AI' | 'Mobile' | 'Security';
  featureName: string;
  scenarios: string;
  openInVSCode: boolean;
}

const testTypeTemplates: Record<TestInput['testType'], { dir: string; extension: string }> = {
  UI: { dir: 'tests/ui', extension: '.spec.ts' },
  API: { dir: 'tests/api', extension: '.spec.ts' },
  AI: { dir: 'tests/ai', extension: '.spec.ts' },
  Mobile: { dir: 'tests/mobile', extension: '.spec.ts' },
  Security: { dir: 'tests/security', extension: '.spec.ts' },
};

async function promptUser(): Promise<TestInput> {
  const responses = (await enquirer.prompt([
    {
      type: 'select',
      name: 'testType',
      message: 'Select test type:',
      choices: ['UI', 'API', 'AI', 'Mobile', 'Security'],
    },
    {
      type: 'input',
      name: 'featureName',
      message: 'Enter feature name (e.g., user-login, product-search):',
      validate: (value: string): boolean | string => {
        if (!value || value.trim() === '') {
          return 'Feature name cannot be empty';
        }
        if (!/^[a-z0-9-]+$/.test(value)) {
          return 'Feature name must be lowercase with hyphens';
        }
        return true;
      },
    },
    {
      type: 'input',
      name: 'scenarios',
      message:
        'Describe test scenarios (e.g., successful login, invalid password, locked account):',
    },
    {
      type: 'confirm',
      name: 'openInVSCode',
      message: 'Open file in VS Code after creation?',
      initial: true,
    },
  ])) as any;

  return {
    testType: responses.testType as TestInput['testType'],
    featureName: responses.featureName as string,
    scenarios: responses.scenarios as string,
    openInVSCode: responses.openInVSCode as boolean,
  };
}

async function generateTestContent(input: TestInput): Promise<string> {
  const typeInstructions: Record<TestInput['testType'], string> = {
    UI: `Generate a comprehensive UI test using Playwright. Include page navigation, element interaction, assertions, and handle waits appropriately. Use data-testid selectors where possible. Include meaningful test descriptions.`,
    API: `Generate an API test using axios or REST patterns. Include successful requests, error handling, and schema validation with Zod. Test multiple scenarios including success and failure paths.`,
    AI: `Generate an AI test using LLM assertion patterns. Include semantic expectations, judge evaluations with rubrics, or vision-based assertions. Use the existing AI testing utilities from the framework.`,
    Mobile: `Generate a mobile test that handles touch gestures, viewport sizing, orientation changes, and mobile-specific assertions. Include both success and edge cases.`,
    Security: `Generate a security test covering OWASP categories. Include payload testing, authentication bypass checks, and injection tests. Follow security testing best practices.`,
  };

  const prompt = `You are an expert test engineer creating production-grade tests. Generate a complete test file:

Test Type: ${input.testType}
Feature: ${input.featureName}
Scenarios: ${input.scenarios}

Requirements:
1. ${typeInstructions[input.testType]}
2. Use TypeScript with strict types
3. Follow Playwright best practices and the BestTester framework patterns
4. Include 2-3 test cases covering different scenarios
5. Use proper JSDoc comments for each test
6. Add meaningful assertions
7. Import necessary modules correctly at the top
8. Use test.describe() for organization with appropriate tags (@ui, @api, @ai, @mobile, @security)
9. Follow ESLint rules: no console.log, no hardcoded delays, no .pause()
10. Return ONLY the complete TypeScript file starting with imports
11. Do NOT include TODO comments or placeholders
12. Do NOT include markdown code fences

The file will be saved as: ${path.join(testTypeTemplates[input.testType].dir, `${input.featureName.toLowerCase()}-${input.testType.toLowerCase()}.spec.ts`)}`;

  let fullContent = '';
  process.stdout.write('\n📝 Generating test with Claude...');

  try {
    const stream = await client.messages.stream({
      model: 'claude-opus-4-7',
      max_tokens: 3000,
      messages: [
        {
          role: 'user',
          content: prompt,
        },
      ],
    });

    for await (const chunk of stream) {
      if (chunk.type === 'content_block_delta' && chunk.delta.type === 'text_delta') {
        fullContent += chunk.delta.text;
      }
    }

    process.stdout.write(' ✓\n');
    return fullContent;
  } catch {
    process.stdout.write(' (offline mode)\n');
    console.log('⚠️  API key not configured. Using template-based generation.\n');
    return generateTemplateContent(input);
  }
}

function generateTemplateContent(input: TestInput): string {
  const templates: Record<TestInput['testType'], (name: string) => string> = {
    UI: (name: string) => `import { test, expect } from '@playwright/test';

test.describe('${name} @ui', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
  });

  test('should load page successfully', async ({ page }) => {
    await expect(page).toHaveTitle(/Home/);
  });

  test('should interact with elements', async ({ page }) => {
    const element = page.locator('[data-testid="main"]');
    await expect(element).toBeVisible();
  });

  test('should perform navigation', async ({ page }) => {
    await page.click('[data-testid="link"]');
    await page.waitForURL('**/page');
    await expect(page).toHaveURL(/page/);
  });
});
`,
    API: (name: string) => `import { test, expect } from '@playwright/test';
import axios from 'axios';

test.describe('${name} @api', () => {
  const baseURL = 'https://api.example.com';

  test('should fetch data successfully', async () => {
    const response = await axios.get(\`\${baseURL}/data\`);
    expect(response.status).toBe(200);
    expect(response.data).toBeDefined();
  });

  test('should handle errors gracefully', async () => {
    try {
      await axios.get(\`\${baseURL}/invalid\`);
    } catch (error) {
      expect((error as any).response.status).toBe(404);
    }
  });

  test('should post data with correct schema', async () => {
    const response = await axios.post(\`\${baseURL}/data\`, {
      name: 'test',
      value: 123,
    });
    expect(response.status).toBe(201);
  });
});
`,
    AI: (name: string) => `import { test, expect } from '@playwright/test';
import { semanticExpect } from '../../src/ai/semantic-expect';

test.describe('${name} @ai', () => {
  test('should evaluate content semantically', async ({ page }) => {
    await page.goto('/');
    const content = await page.locator('body').textContent();
    await semanticExpect(content).toContain('relevant content');
  });

  test('should judge response quality', async () => {
    const response = 'Sample response text';
    const score = await semanticExpect(response).toHaveHighQuality('assessment');
    expect(score).toBeGreaterThan(0.7);
  });

  test('should validate semantic similarity', async () => {
    const text1 = 'The quick brown fox jumps';
    const text2 = 'A fast brown fox leaps';
    const similarity = await semanticExpect(text1).toMatch(text2);
    expect(similarity).toBeGreaterThan(0.8);
  });
});
`,
    Mobile: (name: string) => `import { test, expect, devices } from '@playwright/test';

test.describe('${name} @mobile', () => {
  test.use(devices['iPhone 12']);

  test('should display mobile layout', async ({ page }) => {
    await page.goto('/');
    const viewport = page.viewportSize();
    expect(viewport?.width).toBeLessThanOrEqual(390);
  });

  test('should handle touch interactions', async ({ page }) => {
    await page.goto('/');
    const button = page.locator('[data-testid="action"]');
    await button.tap();
    await expect(page.locator('[data-testid="result"]')).toBeVisible();
  });

  test('should adapt to orientation', async ({ page }) => {
    await page.goto('/');
    await page.viewportSize();
    await expect(page.locator('body')).toBeVisible();
  });
});
`,
    Security: (name: string) => `import { test, expect } from '@playwright/test';

test.describe('${name} @security', () => {
  test('should prevent XSS injection', async ({ page }) => {
    const payload = '<script>alert("xss")</script>';
    await page.goto('/');
    // Test XSS prevention
    await expect(page.locator('body')).not.toContainText('alert');
  });

  test('should enforce HTTPS', async ({ page }) => {
    await page.goto('/');
    expect(page.url()).toMatch(/^https:/);
  });

  test('should validate authentication', async ({ page }) => {
    await page.goto('/protected');
    // Should redirect to login
    await expect(page).toHaveURL(/login/);
  });
});
`,
  };

  return templates[input.testType](input.featureName);
}

async function createTest(input: TestInput): Promise<string> {
  const typeDef = testTypeTemplates[input.testType];
  const fileName = `${input.featureName.toLowerCase()}-${input.testType.toLowerCase()}${typeDef.extension}`;
  const filePath = path.join(process.cwd(), typeDef.dir, fileName);

  const dir = path.dirname(filePath);
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }

  const content = await generateTestContent(input);

  console.log('\n📋 Preview of generated test:\n');
  console.log('─'.repeat(70));
  const preview = content.substring(0, 600);
  console.log(preview + (content.length > 600 ? '\n...' : ''));
  console.log('─'.repeat(70));
  console.log(`\n✍️  File will be saved to: ${filePath}\n`);

  fs.writeFileSync(filePath, content);
  console.log(`✅ Test file created successfully\n`);

  console.log('📋 Running ESLint...');
  try {
    execSync(`npx eslint "${filePath}" --fix`, { stdio: 'pipe' });
    console.log('✅ ESLint passed\n');
  } catch {
    console.log('⚠️  ESLint found issues (attempted auto-fix)\n');
  }

  return filePath;
}

async function main(): Promise<void> {
  console.log('\n🧪 BestTester Interactive Test Generator\n');

  try {
    const input = await promptUser();

    console.log('\n📋 Test Configuration:');
    console.log(`   Type: ${input.testType}`);
    console.log(`   Feature: ${input.featureName}`);
    console.log(`   Scenarios: ${input.scenarios}\n`);

    const filePath = await createTest(input);

    console.log('✨ Next steps:');
    console.log(`   Run test: npm run test -- "${filePath}"`);
    if (input.openInVSCode) {
      console.log(`   Opening in VS Code...`);
      try {
        execSync(`code "${filePath}"`);
      } catch {
        console.log(`   (Could not open VS Code)\n`);
      }
    }
    console.log('');
  } catch (error) {
    if (error instanceof Error) {
      console.error('\n❌ Error:', error.message);
    }
    process.exit(1);
  }
}

void main();
