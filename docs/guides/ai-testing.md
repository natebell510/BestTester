# AI Testing Guide

Leverage Claude and other LLMs to supercharge your test automation.

## AI Testing Capabilities

BestTester integrates Claude for:

- **Vision-based assertions** — Verify UI visually without brittle selectors
- **LLM judge system** — Evaluate test results against flexible rubrics
- **Natural language test generation** — Auto-create tests from descriptions
- **Hallucination detection** — Identify LLM inconsistencies
- **Semantic similarity** — Compare content meaning, not exact text

## Vision-Based Assertions

### Basic Visual Evaluation

```typescript
import { test, expect } from '@playwright/test';
import { LLMJudge } from '@src/ai/llm-judge';

test.describe('Visual Quality @ai @ui', () => {
  const judge = new LLMJudge();

  test('should display professional design', async ({ page }) => {
    await page.goto('/');
    const screenshot = await page.screenshot();

    const result = await judge.evaluate({
      screenshot,
      rubric: `
        The page should have:
        - Clear hierarchy with prominent main content
        - Professional color scheme
        - Proper spacing and alignment
        - Readable typography
      `,
      model: 'claude-sonnet-4-1',
      threshold: 0.7,
    });

    expect(result.score).toBeGreaterThan(0.7);
    console.log('Feedback:', result.feedback);
  });
});
```

### Responsive Design Validation

```typescript
test('should look good on all devices', async ({ page }) => {
  const viewports = [
    { width: 375, height: 667, name: 'Mobile' },
    { width: 768, height: 1024, name: 'Tablet' },
    { width: 1920, height: 1080, name: 'Desktop' },
  ];

  const judge = new LLMJudge();

  for (const viewport of viewports) {
    await page.setViewportSize(viewport);
    const screenshot = await page.screenshot();

    const result = await judge.evaluate({
      screenshot,
      rubric: `On ${viewport.name}:
        - All content is visible without horizontal scrolling
        - Touch targets are appropriately sized
        - Text is readable without zooming
        - Layout adapts elegantly to screen size`,
      threshold: 0.75,
    });

    expect(result.score).toBeGreaterThan(0.75);
  }
});
```

### Accessibility Evaluation

```typescript
test('should be accessible', async ({ page }) => {
  await page.goto('/');
  const screenshot = await page.screenshot();

  const result = await judge.evaluate({
    screenshot,
    rubric: `
      Evaluate accessibility:
      - Sufficient color contrast ratios (WCAG AA minimum)
      - Interactive elements clearly visible
      - No text smaller than 12px
      - Focus indicators visible
    `,
    model: 'claude-sonnet-4-1',
  });

  if (result.score < 0.8) {
    console.warn('Accessibility issues:', result.feedback);
  }
});
```

## LLM Judge System

### Flexible Rubrics

```typescript
test('evaluate against product requirements', async ({ page }) => {
  await page.goto('/dashboard');
  const screenshot = await page.screenshot();

  const rubrics = {
    'brand_consistency': `
      Does the design match our brand guidelines?
      - Logo placement and sizing
      - Brand color usage
      - Typography consistency
    `,
    'usability': `
      Is the interface intuitive?
      - Clear call-to-action
      - Logical information hierarchy
      - Obvious navigation paths
    `,
    'completeness': `
      Is all required content present?
      - All required sections visible
      - No placeholder text
      - Images loaded correctly
    `,
  };

  for (const [name, rubric] of Object.entries(rubrics)) {
    const result = await judge.evaluate({
      screenshot,
      rubric,
      model: 'claude-sonnet-4-1',
    });

    console.log(`${name}: ${result.score}`);
  }
});
```

### Multi-Page Evaluation

```typescript
test('evaluate complete user flow', async ({ page }) => {
  const judge = new LLMJudge();
  const screenshots = [];

  // Capture flow
  await page.goto('/products');
  screenshots.push({
    step: 'Browse',
    image: await page.screenshot(),
  });

  await page.click('[data-testid="add-to-cart"]');
  screenshots.push({
    step: 'Add to cart',
    image: await page.screenshot(),
  });

  await page.goto('/cart');
  screenshots.push({
    step: 'View cart',
    image: await page.screenshot(),
  });

  // Evaluate flow
  const flowResult = await judge.evaluateFlow({
    screenshots,
    rubric: 'The e-commerce flow should be smooth and logical',
  });

  expect(flowResult.score).toBeGreaterThan(0.8);
});
```

## Content Evaluation

### Semantic Similarity

```typescript
import { SemanticMatcher } from '@src/ai/semantic-matcher';

test('verify content is about topic', async ({ page }) => {
  const matcher = new SemanticMatcher();

  await page.goto('/about');
  const content = await page.locator('.main-content').textContent();

  const isSemanticallyValid = await matcher.isSimilar({
    text: content,
    reference: `
      The page should explain:
      - Company mission and values
      - Team overview
      - Company history
    `,
    threshold: 0.75,
  });

  expect(isSemanticallyValid).toBe(true);
});
```

### Text Quality Assessment

```typescript
test('evaluate copy quality', async ({ page }) => {
  await page.goto('/landing');
  const content = await page.locator('.hero').textContent();

  const qualityResult = await judge.evaluateText({
    text: content,
    rubric: `
      Is the copy engaging and clear?
      - No grammatical errors
      - Clear value proposition
      - Compelling call-to-action
      - Appropriate tone for audience
    `,
  });

  expect(qualityResult.score).toBeGreaterThan(0.8);
});
```

## Hallucination Detection

### Consistency Checking

```typescript
test('detect hallucinations in generated content', async ({ page }) => {
  const detector = new HallucinationDetector();

  await page.goto('/product/123');

  // Get page content
  const productName = await page.locator('[data-testid="product-name"]').textContent();
  const productDescription = await page.locator('[data-testid="description"]').textContent();
  const productPrice = await page.locator('[data-testid="price"]').textContent();

  // Check for consistency
  const isConsistent = await detector.checkConsistency({
    name: productName,
    description: productDescription,
    price: productPrice,
    reference: 'Database product record',
  });

  if (!isConsistent.valid) {
    console.error('Hallucination detected:', isConsistent.issues);
  }
  expect(isConsistent.valid).toBe(true);
});
```

### Factuality Validation

```typescript
test('validate facts against known data', async ({ page }) => {
  const detector = new HallucinationDetector();

  await page.goto('/statistics');
  const stats = await extractStats(page);

  // Check against historical data
  const factCheck = await detector.validateAgainstData({
    text: stats,
    knownFacts: {
      'company_founded': 2015,
      'current_employees': 500,
      'market_regions': ['US', 'EU', 'APAC'],
    },
  });

  expect(factCheck.errors).toHaveLength(0);
});
```

## AI-Powered Test Generation

### Generate Tests from Descriptions

```typescript
import { TestGenerator } from '@src/ai/test-generator';

test.describe('Auto-generated tests', () => {
  const generator = new TestGenerator();

  test('should generate valid tests', async () => {
    const description = `
      Test the employee search functionality:
      1. User navigates to employee search page
      2. User enters search term "John"
      3. System filters employees by name
      4. Results show only employees with "John" in name
      5. User can click an employee to view details
    `;

    const testCode = await generator.generateTest({
      description,
      framework: 'playwright',
      language: 'typescript',
    });

    console.log('Generated test:', testCode);
    // testCode is executable Playwright test code
  });
});
```

### Generate Test Cases from Feature Description

```typescript
test('generate comprehensive test cases', async () => {
  const generator = new TestGenerator();

  const featureDescription = `
    Feature: User Authentication
    - Users should be able to sign up with email
    - Users should receive verification email
    - Users should log in with credentials
    - Invalid credentials should show error
    - Session should persist across page refresh
  `;

  const testCases = await generator.generateTestCases({
    description: featureDescription,
    testType: 'ui',
    framework: 'playwright',
  });

  for (const testCase of testCases) {
    console.log(`Test: ${testCase.name}`);
    console.log(`Code:\n${testCase.code}`);
  }
});
```

## Code Review Agent

### Auto-Review Test Code

```typescript
import { CodeReviewAgent } from '@src/agents/code-review-agent';

test('validate test quality', async () => {
  const agent = new CodeReviewAgent();

  const testCode = `
    test('should login', async ({ page }) => {
      await page.goto('/login');
      await page.fill('input', 'user@test.com');
      await page.click('button');
    });
  `;

  const review = await agent.reviewTestCode({
    code: testCode,
    framework: 'playwright',
  });

  console.log('Issues found:');
  console.log(review.issues);
  // [
  //   { line: 3, issue: 'Missing data-testid selector' },
  //   { line: 4, issue: 'Hardcoded selector should use Page Object' },
  // ]

  console.log('Suggestions:', review.suggestions);
});
```

## Test Healer Agent

### Auto-Fix Broken Tests

```typescript
import { TestHealerAgent } from '@src/agents/test-healer-agent';

test.describe('Self-healing tests @ai', () => {
  const healer = new TestHealerAgent();

  test('should auto-repair failed selector', async ({ page }) => {
    try {
      await page.click('[data-testid="login-btn"]');
    } catch (error) {
      if (error.message.includes('No element matches selector')) {
        const repaired = await healer.healSelectorFailure({
          originalSelector: '[data-testid="login-btn"]',
          page,
          context: 'Login form',
        });

        console.log('Original selector failed');
        console.log('New selector:', repaired.selector);
        await page.click(repaired.selector);
      } else {
        throw error;
      }
    }
  });
});
```

## Best Practices

### ✅ Do

```typescript
// ✅ Good: Use specific rubrics
const result = await judge.evaluate({
  screenshot,
  rubric: `
    Specific criteria:
    - Button has min 44px touch target
    - Text contrast ratio > 4.5:1
    - Primary CTA in top right
  `,
});

// ✅ Good: Combine with traditional assertions
const result = await judge.evaluate({ screenshot, rubric });
expect(result.score).toBeGreaterThan(0.8);
await expect(page.locator('.success')).toBeVisible();

// ✅ Good: Use appropriate threshold
const result = await judge.evaluate({
  screenshot,
  rubric,
  threshold: 0.75, // 75% score required
});
```

### ❌ Don't

```typescript
// ❌ Bad: Vague rubric
await judge.evaluate({
  screenshot,
  rubric: 'Does it look good?',
});

// ❌ Bad: Relying only on AI
test('should work', async ({ page }) => {
  const result = await judge.evaluate({ screenshot, rubric });
  expect(result.score).toBeGreaterThan(0.5); // Too low threshold
});

// ❌ Bad: Using for every assertion
test('very slow test', async ({ page }) => {
  for (let i = 0; i < 10; i++) {
    await judge.evaluate({ screenshot: await page.screenshot(), rubric });
  }
});
```

## Performance Considerations

### Batch Evaluations

```typescript
// ✅ Good: Batch multiple screenshots
const screenshots = [
  { name: 'homepage', image: await page.screenshot() },
  { name: 'login', image: await page.screenshot() },
  { name: 'dashboard', image: await page.screenshot() },
];

const results = await judge.evaluateBatch({
  screenshots,
  rubric: 'Professional appearance',
});
```

### Cache Results

```typescript
const cache = new EvaluationCache();

test('reuse evaluations', async () => {
  const screenshot = await page.screenshot();
  const hash = crypto.createHash('sha256').update(screenshot).digest('hex');

  let result = cache.get(hash);
  if (!result) {
    result = await judge.evaluate({ screenshot, rubric });
    cache.set(hash, result);
  }

  expect(result.score).toBeGreaterThan(0.8);
});
```

## API Reference

```typescript
// Vision evaluation
judge.evaluate({
  screenshot: Buffer,
  rubric: string,
  model?: 'claude-opus' | 'claude-sonnet' | 'claude-haiku',
  threshold?: number,
})

// Text evaluation
judge.evaluateText({
  text: string,
  rubric: string,
})

// Semantic similarity
matcher.isSimilar({
  text: string,
  reference: string,
  threshold?: number,
})

// Flow evaluation
judge.evaluateFlow({
  screenshots: Array<{ step: string, image: Buffer }>,
  rubric: string,
})
```

## Next Steps

- [Test Writing Guide](./test-writing.md) — Learn all test patterns
- [Example Gallery](../examples/ai-patterns.md) — See AI test examples
- [Vision Testing](../examples/ai-patterns.md#vision-based)
