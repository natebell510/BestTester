# Architecture Guide

BestTester is architected as a modular, scalable Playwright framework with clear separation of concerns.

## High-Level Architecture

```
┌─────────────────────────────────────────┐
│        Test Execution Layer             │
│  (Playwright, Test Runners, CI/CD)      │
└─────────────────────────────────────────┘
            ↓        ↓        ↓
┌──────────────────────────────────────────┐
│     Test Organization Layer              │
│  (Fixtures, Page Objects, Helpers)      │
└──────────────────────────────────────────┘
            ↓        ↓        ↓
┌──────────────────────────────────────────┐
│     Data & Utilities Layer               │
│  (Builders, Cleanup, Observability)     │
└──────────────────────────────────────────┘
            ↓
┌──────────────────────────────────────────┐
│     External Services                    │
│  (APIs, Databases, LLMs, Slack, K8s)    │
└──────────────────────────────────────────┘
```

## Directory Structure

```
besttester/
├── config/                          # Configuration
│   ├── playwright.config.ts        # Playwright settings
│   └── playwright.mobile.config.ts # Mobile settings
│
├── src/                             # Source code
│   ├── api/                        # API clients & helpers
│   │   ├── graphql-client.ts
│   │   ├── api-base.ts
│   │   └── endpoints/
│   │
│   ├── page-objects/               # Page Object Models
│   │   ├── BasePage.ts
│   │   ├── HomePage.page.ts
│   │   └── LoginPage.page.ts
│   │
│   ├── fixtures/                   # Custom fixtures
│   │   ├── auth.fixture.ts
│   │   ├── data.fixture.ts
│   │   └── ui.fixture.ts
│   │
│   ├── data/                       # Data management
│   │   ├── data-builder.ts
│   │   ├── seed-manager.ts
│   │   └── cleanup-registry.ts
│   │
│   ├── helpers/                    # Utilities
│   │   ├── wait-helpers.ts
│   │   ├── date-formatter.ts
│   │   └── crypto-utils.ts
│   │
│   ├── types/                      # TypeScript types
│   │   └── index.ts
│   │
│   ├── agents/                     # LLM agents
│   │   ├── code-review-agent.ts
│   │   └── test-healer-agent.ts
│   │
│   └── observability/              # Tracing & metrics
│       ├── tracer.ts
│       └── metrics.ts
│
├── tests/                           # Test files
│   ├── ui/                         # UI tests
│   │   ├── smoke/
│   │   ├── regression/
│   │   └── visual/
│   │
│   ├── api/                        # API tests
│   │   ├── auth/
│   │   ├── data/
│   │   └── graphql/
│   │
│   ├── security/                   # Security tests
│   │   ├── owasp/
│   │   └── auth/
│   │
│   ├── mobile/                     # Mobile tests
│   │   └── interactions/
│   │
│   ├── performance/                # Performance tests
│   │   └── page-load/
│   │
│   ├── ai/                         # AI tests
│   │   ├── vision/
│   │   └── judge/
│   │
│   ├── a11y/                       # Accessibility tests
│   │   └── wcag/
│   │
│   ├── contracts/                  # Contract tests
│   │   └── pact/
│   │
│   └── data/                       # Data management tests
│       └── builders/
│
├── scripts/                         # Utility scripts
│   ├── k8s-run.ts                 # K8s job runner
│   ├── new-test.ts                # Test scaffolder
│   └── generate-dashboard.ts      # Dashboard gen
│
├── k8s/                            # Kubernetes config
│   ├── job.yaml
│   ├── configmap.yaml
│   └── helm/                       # Helm charts
│
├── .github/workflows/              # CI/CD
│   ├── ci.yml
│   ├── ci-optimized.yml
│   └── docker-publish.yml
│
└── docs/                           # Documentation
    ├── getting-started/
    ├── guides/
    └── examples/
```

## Core Concepts

### 1. Page Objects

Encapsulate page elements and interactions:

```typescript
// ✅ Good: Page Object
class LoginPage extends BasePage {
  private usernameInput = this.page.locator('[data-testid="username"]');
  private passwordInput = this.page.locator('[data-testid="password"]');
  private loginButton = this.page.locator('[data-testid="login"]');

  async login(username: string, password: string) {
    await this.usernameInput.fill(username);
    await this.passwordInput.fill(password);
    await this.loginButton.click();
    await this.page.waitForURL('/dashboard');
  }
}

// ✗ Bad: No abstraction
test('login', async ({ page }) => {
  await page.fill('[data-testid="username"]', 'user');
  await page.fill('[data-testid="password"]', 'pass');
  await page.click('[data-testid="login"]');
});
```

### 2. Fixtures

Share setup/teardown logic across tests:

```typescript
export const test = base.extend({
  authenticatedPage: async ({ page }, use) => {
    const loginPage = new LoginPage(page);
    await loginPage.goto();
    await loginPage.login('admin', 'password');
    await use(page);
    // Cleanup happens automatically
  },
});
```

### 3. Data Builders

Create test data fluently with validation:

```typescript
const employee = new EmployeeBuilder()
  .withName('John Doe')
  .withEmail('john@example.com')
  .withRole('Manager')
  .build(); // Validates with Zod schema
```

### 4. Seed Manager

Ensure idempotent data setup:

```typescript
const seedManager = new SeedManager();
await seedManager.applySeed({
  version: '1.0.0',
  name: 'seed-admin-user',
  apply: async (db) => {
    if (await db.users.findOne({ email: 'admin@test.com' })) {
      return; // Already applied
    }
    await db.users.create({ email: 'admin@test.com', role: 'admin' });
  },
});
```

### 5. Cleanup Registry

Guarantee resource cleanup with audit trail:

```typescript
const cleanup = new CleanupRegistry();
cleanup.register('user', userId, async () => {
  await api.deleteUser(userId);
});
// cleanup.cleanupAll() runs all registered cleanups
```

### 6. Observability

Distributed tracing and metrics:

```typescript
const tracer = getTracer('my-test');
const span = tracer.startSpan('login_flow');
try {
  await loginPage.login('admin', 'password');
  span.setAttributes({ success: true });
} catch (error) {
  span.recordException(error);
} finally {
  span.end();
}
```

## Test Types & Their Structure

### UI Tests (@ui)

```typescript
test.describe('User Interaction @ui', () => {
  let page: UIPage;

  test.beforeEach(async ({ page: browserPage }) => {
    page = new UIPage(browserPage);
    await page.goto('/');
  });

  test('should submit form', async () => {
    await page.fillForm({ email: 'user@test.com', name: 'John' });
    await expect(page.locator('.success')).toBeVisible();
  });
});
```

### API Tests (@api)

```typescript
test.describe('API Endpoints @api', () => {
  const api = new MyAPI();

  test('should fetch users', async () => {
    const response = await api.getUsers();
    expect(response.status).toBe(200);
    expect(response.body).toMatchSchema(usersSchema);
  });
});
```

### Security Tests (@security)

```typescript
test.describe('OWASP A01 @security', () => {
  test('should prevent unauthorized access', async ({ page }) => {
    await page.goto('/admin');
    // Should redirect to login
    await expect(page).toHaveURL(/\/login/);
  });
});
```

### AI Tests (@ai)

```typescript
test.describe('LLM Judge @ai', () => {
  const judge = new LLMJudge();

  test('should pass AI evaluation', async ({ page }) => {
    const screenshot = await page.screenshot();
    const result = await judge.evaluate({
      rubric: 'visual_design',
      screenshot,
      target: 'The page should have a professional appearance',
    });
    expect(result.score).toBeGreaterThan(0.8);
  });
});
```

## Data Flow

```
Test Starts
    ↓
Fixture Setup (Auth, Data)
    ↓
SeedManager applies seeds
    ↓
CleanupRegistry registers cleanups
    ↓
Test executes with Page Objects
    ↓
Observability records traces/metrics
    ↓
Test completes
    ↓
CleanupRegistry executes cleanups
    ↓
Reports generated (Allure, Playwright)
```

## Parallel Execution

- **Default**: 4 workers per browser × 3 browsers = 12 parallel tests
- **Sharding**: CI runs tests across multiple GitHub Actions jobs
- **Isolation**: Each worker has clean state (no shared fixtures)

## CI/CD Pipeline

```
Push to GitHub
    ↓
GitHub Actions triggered
    ↓
┌─ Lint Job (fails fast if violations)
├─ Type Check Job
├─ Smoke Tests (4 shards)
├─ API Tests (2 shards)
├─ Security Tests (1 job)
├─ UI Regression Tests (4 shards)
└─ Visual Tests (1 job)
    ↓
Allure Report generated
    ↓
SBOM generated
    ↓
Docker image published
    ↓
Results aggregated
    ↓
PR comment with summary
```

## Best Practices

### ✅ Do

- Use Page Objects for all UI interactions
- Create shared fixtures for common setup
- Use data builders for complex test data
- Validate API responses with Zod schemas
- Tag tests with @category for filtering
- Use `test.slow()` for slow tests
- Isolate tests completely (no shared state)
- Parallel execution safe: don't modify global state

### ❌ Don't

- Call `page.waitForTimeout()` (use waitFor() instead)
- Hardcode selectors in tests (use Page Objects)
- Share state between tests
- Use `pause()` in committed code
- Depend on test execution order
- Mix UI and API in same test file
- Commit `.only()` or `.skip()`
- Use `eval()` or `Function()` constructor

## Extension Points

### Custom Fixtures

```typescript
export const test = base.extend({
  myFixture: async ({}, use) => {
    // Setup
    const value = await setupMyFixture();
    await use(value);
    // Teardown
    await cleanupMyFixture(value);
  },
});
```

### Custom Reporters

```typescript
class MyReporter {
  onTestEnd(test: TestCase, result: TestResult) {
    // Custom reporting
  }
}
```

### Custom Helpers

```typescript
declare global {
  namespace PlaywrightTest {
    interface Test {
      waitForElementStable(): Promise<void>;
    }
  }
}
```

## Performance Considerations

- **Test duration**: Target <30s per test
- **Parallelism**: Increase workers for faster CI
- **Browser pooling**: Reuse browser instances
- **Screenshot storage**: Delete old artifacts
- **Cache**: npm dependencies via GitHub Actions cache
- **Database**: Use in-memory DB for tests when possible

## Monitoring & Observability

- **Traces**: OpenTelemetry to Jaeger/Datadog
- **Metrics**: Custom metrics exported to OpenTelemetry
- **Logs**: Structured JSON logs via Winston
- **Reports**: Allure dashboard with historical trends

## Next Steps

- [Test Writing Guide](./test-writing.md) — Write tests using this architecture
- [CI/CD Integration](./ci-cd-integration.md) — Set up GitHub Actions pipeline
- [Example Gallery](../examples/ui-patterns.md) — See real patterns
