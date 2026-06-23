# Test Writing Guide

Comprehensive guide to writing tests in BestTester across all supported test types.

## Test Structure

All tests follow this pattern:

```typescript
import { test, expect } from '@playwright/test';

test.describe('Feature Name @tag1 @tag2', () => {
  // Shared state
  let shared: any;

  // Run before each test
  test.beforeEach(async ({ page }) => {
    // Setup
  });

  // Run after each test
  test.afterEach(async ({ page }) => {
    // Cleanup
  });

  // Run once before all tests in block
  test.beforeAll(async () => {
    // One-time setup
  });

  test('should do something', async ({ page }) => {
    // Test implementation
  });
});
```

## Test Tags

Organize tests with tags. Run specific suites:

```bash
npm run test:ui      # @ui
npm run test:api     # @api
npm run test:smoke   # @smoke
npm run test:security # @security
npm run test:mobile  # @mobile
npm run test:e2e     # @e2e
npm run test:ai      # @ai
```

```typescript
// Combine tags
test.describe('Complex Feature @ui @regression @slow', () => {
  test('should complete workflow', async ({ page }) => {
    // This test will run in:
    // - UI suite, regression suite, and slow suite
  });
});
```

## UI Testing

### Basic UI Test

```typescript
import { test, expect } from '@playwright/test';
import { HomePage } from '@src/page-objects/HomePage.page';

test.describe('HomePage @ui @smoke', () => {
  let homePage: HomePage;

  test.beforeEach(async ({ page }) => {
    homePage = new HomePage(page);
    await homePage.goto();
  });

  test('should display welcome message', async () => {
    await expect(homePage.welcomeMessage).toContainText('Welcome');
  });

  test('should have navigation', async () => {
    const navItems = await homePage.getNavItemCount();
    expect(navItems).toBeGreaterThan(0);
  });
});
```

### Form Submission

```typescript
test('should submit form successfully', async ({ page }) => {
  const loginPage = new LoginPage(page);
  await loginPage.goto();

  // Fill form
  await loginPage.fillEmail('user@test.com');
  await loginPage.fillPassword('password123');

  // Submit
  await loginPage.submit();

  // Verify
  await expect(page).toHaveURL('/dashboard');
  await expect(loginPage.successMessage).toBeVisible();
});
```

### File Upload

```typescript
test('should upload file', async ({ page }) => {
  const uploadPage = new UploadPage(page);
  await uploadPage.goto();

  // Upload file
  await uploadPage.uploadFile('test-data/sample.pdf');

  // Verify
  await expect(uploadPage.successBanner).toBeVisible();
  const fileName = await uploadPage.getUploadedFileName();
  expect(fileName).toBe('sample.pdf');
});
```

### Drag & Drop

```typescript
test('should reorder items via drag-drop', async ({ page }) => {
  const boardPage = new KanbanBoardPage(page);
  await boardPage.goto();

  const task1 = await boardPage.getTask('Task 1');
  const doneColumn = await boardPage.getDoneColumn();

  // Drag task to done column
  await task1.dragTo(doneColumn);

  // Verify
  const movedTask = await boardPage.getTaskInColumn('Task 1', 'Done');
  await expect(movedTask).toBeVisible();
});
```

### Shadow DOM Piercing

```typescript
test('should interact with shadow DOM', async ({ page }) => {
  const shadowPage = new ShadowPage(page);
  await shadowPage.goto();

  // Access shadow element
  const shadowButton = page.locator('>>> button');
  await expect(shadowButton).toContainText('Click me');
  await shadowButton.click();
});
```

### Iframe Handling

```typescript
test('should interact with iframe', async ({ page }) => {
  const iframePage = new IframePage(page);
  await iframePage.goto();

  // Get iframe
  const frameHandle = await iframePage.getPaymentFrame();
  const frame = page.frame({ url: /payment/ });

  // Interact with iframe content
  await frame?.fill('[data-testid="card"]', '4111111111111111');
  await frame?.click('[data-testid="submit"]');

  // Verify
  await expect(page.locator('.success')).toBeVisible();
});
```

### Viewport & Responsive Testing

```typescript
test.describe('Responsive Design @ui', () => {
  const viewports = [
    { width: 375, height: 667, name: 'Mobile' },
    { width: 768, height: 1024, name: 'Tablet' },
    { width: 1920, height: 1080, name: 'Desktop' },
  ];

  for (const viewport of viewports) {
    test(`should work on ${viewport.name}`, async ({ page }) => {
      await page.setViewportSize({
        width: viewport.width,
        height: viewport.height,
      });

      await page.goto('/');
      await expect(page.locator('main')).toBeVisible();
    });
  }
});
```

## API Testing

### Basic API Test

```typescript
import { test, expect } from '@playwright/test';
import { UsersAPI } from '@src/api/users.api';

test.describe('Users API @api @smoke', () => {
  const api = new UsersAPI();

  test('should list users', async () => {
    const response = await api.listUsers();

    expect(response.status).toBe(200);
    expect(Array.isArray(response.data)).toBe(true);
    expect(response.data).toMatchSchema(usersSchema);
  });

  test('should create user', async () => {
    const newUser = {
      email: 'newuser@test.com',
      name: 'New User',
    };

    const response = await api.createUser(newUser);

    expect(response.status).toBe(201);
    expect(response.data.email).toBe(newUser.email);
  });
});
```

### Authentication & Headers

```typescript
test('should include auth header', async () => {
  const api = new API({
    baseURL: 'https://api.example.com',
    headers: {
      Authorization: `Bearer ${process.env.API_TOKEN}`,
      'X-Custom-Header': 'value',
    },
  });

  const response = await api.get('/protected-resource');
  expect(response.status).toBe(200);
});
```

### Error Handling

```typescript
test('should handle 404 error', async () => {
  const api = new UsersAPI();
  const response = await api.getUser('invalid-id');

  expect(response.status).toBe(404);
  expect(response.data.error).toBeDefined();
});

test('should handle validation error', async () => {
  const api = new UsersAPI();
  const response = await api.createUser({ email: 'invalid' });

  expect(response.status).toBe(400);
  expect(response.data.errors).toContainEqual({
    field: 'email',
    message: 'Invalid email format',
  });
});
```

### GraphQL Testing

```typescript
import { GraphQLClient } from '@src/api/graphql-client';

test('should query GraphQL', async () => {
  const client = new GraphQLClient({
    endpoint: 'https://api.example.com/graphql',
  });

  const query = `
    query GetUser($id: ID!) {
      user(id: $id) {
        id
        name
        email
      }
    }
  `;

  const response = await client.request(query, { id: '123' });
  expect(response.user).toMatchSchema(userSchema);
});
```

### Pagination Testing

```typescript
test('should handle pagination', async () => {
  const api = new ProductsAPI();

  let allProducts = [];
  let page = 1;

  while (true) {
    const response = await api.getProducts({ page, limit: 10 });
    allProducts = allProducts.concat(response.data);

    if (!response.hasNextPage) break;
    page++;
  }

  expect(allProducts.length).toBeGreaterThan(10);
});
```

## Security Testing

### OWASP A03: Injection (XSS)

```typescript
test.describe('XSS Prevention @security', () => {
  test('should escape user input', async ({ page }) => {
    const inputPage = new InputPage(page);
    await inputPage.goto();

    const xssPayload = '<img src=x onerror="alert(1)">';
    await inputPage.fillCommentField(xssPayload);
    await inputPage.submit();

    // Verify script doesn't execute
    page.on('dialog', () => {
      throw new Error('XSS vulnerability: Dialog triggered');
    });

    // Verify payload is displayed as text
    await expect(page.locator('.comment')).toContainText(xssPayload);
  });
});
```

### OWASP A01: Broken Access Control

```typescript
test.describe('Access Control @security', () => {
  test('should not access other user data', async () => {
    const api = new UsersAPI();

    // Login as user1
    const token1 = await api.login('user1@test.com', 'password');
    const client1 = new API({ headers: { Authorization: `Bearer ${token1}` } });

    // Try to access user2 data
    const response = await client1.get('/users/user2-id');
    expect(response.status).toBe(403);
  });
});
```

### OWASP A07: Broken Authentication

```typescript
test.describe('Authentication @security', () => {
  test('should enforce password requirements', async () => {
    const authPage = new AuthPage(page);
    await authPage.goto('/signup');

    // Try weak password
    await authPage.fillPassword('123');
    await authPage.submit();

    await expect(authPage.errorMessage).toContainText('Password must be at least 8 characters');
  });

  test('should prevent account enumeration', async () => {
    const loginPage = new LoginPage(page);
    await loginPage.goto();

    const response1 = await loginPage.tryLogin('existing@test.com', 'wrong');
    const response2 = await loginPage.tryLogin('nonexistent@test.com', 'wrong');

    // Both should give same generic error
    expect(response1.message).toBe(response2.message);
  });
});
```

## AI Testing

### Vision-Based Assertion

```typescript
import { LLMJudge } from '@src/ai/llm-judge';

test.describe('Visual Quality @ai', () => {
  const judge = new LLMJudge();

  test('should have professional appearance', async ({ page }) => {
    await page.goto('/');
    const screenshot = await page.screenshot();

    const result = await judge.evaluate({
      screenshot,
      rubric: 'The page should have a clean, professional design',
      model: 'claude-sonnet-4-1',
    });

    expect(result.score).toBeGreaterThan(0.7);
    console.log('Feedback:', result.feedback);
  });
});
```

### Semantic Similarity

```typescript
test('should display semantically equivalent content', async ({ page }) => {
  await page.goto('/about');

  const content = await page.locator('.main-content').textContent();
  const isSemanticallyValid = await judge.evaluateSimilarity({
    text: content,
    reference: 'This page should describe company values and mission',
    threshold: 0.8,
  });

  expect(isSemanticallyValid).toBe(true);
});
```

## Mobile Testing

### Touch Interactions

```typescript
test.describe('Mobile Interactions @mobile', () => {
  test.use({ viewport: { width: 375, height: 667 } });

  test('should handle tap', async ({ page }) => {
    const mobilePage = new MobilePage(page);
    await mobilePage.goto();

    // Tap button
    await page.locator('[data-testid="menu"]').tap();

    // Verify menu opened
    await expect(page.locator('.menu-open')).toBeVisible();
  });

  test('should handle swipe', async ({ page }) => {
    const carouselPage = new CarouselPage(page);
    await carouselPage.goto();

    const carousel = page.locator('.carousel');

    // Swipe left
    await carousel.dragTo(carousel, {
      sourcePosition: { x: 300, y: 150 },
      targetPosition: { x: 100, y: 150 },
    });

    // Verify next item
    await expect(page.locator('.carousel-item.active').nth(1)).toBeVisible();
  });
});
```

## Performance Testing

### Page Load Metrics

```typescript
import { PerformanceTracker } from '@src/performance/performance-tracker';

test.describe('Performance @performance', () => {
  const tracker = new PerformanceTracker();

  test('should load homepage within budget', async ({ page }) => {
    await page.goto('/');

    const metrics = await tracker.getMetrics(page);

    expect(metrics.lcp).toBeLessThan(2500); // Largest Contentful Paint
    expect(metrics.cls).toBeLessThan(0.1);  // Cumulative Layout Shift
    expect(metrics.ttfb).toBeLessThan(800); // Time to First Byte
  });
});
```

## Data & Setup

### Using Data Builders

```typescript
import { EmployeeBuilder } from '@src/data/data-builder';

test('should display employee info', async ({ page }) => {
  const employee = new EmployeeBuilder()
    .withName('Jane Smith')
    .withEmail('jane@test.com')
    .withRole('Engineer')
    .withDepartment('Engineering')
    .withSalary(120000)
    .build(); // Validates with Zod

  const api = new EmployeeAPI();
  const created = await api.createEmployee(employee);

  await page.goto(`/employees/${created.id}`);
  await expect(page.locator('h1')).toContainText('Jane Smith');
});
```

### Using Fixtures

```typescript
export const test = base.extend({
  testUser: async ({}, use) => {
    const user = await createTestUser({
      email: `test-${Date.now()}@test.com`,
    });
    await use(user);
    await deleteTestUser(user.id);
  },
});

test('should display user profile', async ({ page, testUser }) => {
  await page.goto(`/users/${testUser.id}`);
  await expect(page.locator('h1')).toContainText(testUser.email);
});
```

## Best Practices

### ✅ Do

```typescript
// ✅ Good: Clear test names
test('should submit form and redirect to dashboard', async () => {
  // Implementation
});

// ✅ Good: Use Page Objects
const loginPage = new LoginPage(page);
await loginPage.login('user@test.com', 'password');

// ✅ Good: One assertion per behavior
test('should validate email format', async () => {
  await form.fillEmail('invalid');
  await expect(form.errorMessage).toContainText('Invalid email');
});

// ✅ Good: Use test fixtures
test.beforeEach(async ({ page }) => {
  await page.goto('/');
  await auth.login();
});
```

### ❌ Don't

```typescript
// ❌ Bad: Vague test name
test('test login', async () => {});

// ❌ Bad: Hardcoded selectors
await page.click('button');
await page.fill('#email', 'user@test.com');

// ❌ Bad: Multiple assertions
test('should work', async () => {
  expect(a).toBe(1);
  expect(b).toBe(2);
  expect(c).toBe(3);
});

// ❌ Bad: Shared mutable state
let testUser;
test.beforeAll(() => {
  testUser = createUser(); // Shared across all tests!
});
```

## Debugging

### VS Code Debugger

Add to `.vscode/launch.json`:

```json
{
  "type": "node",
  "request": "launch",
  "name": "Debug Playwright",
  "program": "${workspaceFolder}/node_modules/.bin/playwright",
  "args": ["test", "--debug"],
  "console": "integratedTerminal"
}
```

### Inspector Mode

```bash
npm run test:debug -- tests/ui/login.spec.ts
```

### Screenshots & Videos

```typescript
// Capture on failure
test('should login', async ({ page }) => {
  try {
    // Test code
  } catch (e) {
    await page.screenshot({ path: 'failure.png' });
    throw e;
  }
});
```

### Logging

```typescript
test('should process payment', async ({ page }) => {
  console.log('Step 1: Navigate to checkout');
  await page.goto('/checkout');

  console.log('Step 2: Fill payment form');
  await paymentPage.fillCard('4111111111111111');

  console.log('Step 3: Submit payment');
  await paymentPage.submit();
});
```

## Next Steps

- [Example Gallery](../examples/ui-patterns.md) — 10+ real test patterns
- [Page Objects Guide](../guides/architecture.md#page-objects)
- [API Testing](../guides/test-writing.md#api-testing)
- [Debugging Tips](../guides/test-writing.md#debugging)
