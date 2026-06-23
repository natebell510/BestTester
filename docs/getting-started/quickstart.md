# 5-Minute Quickstart

Get BestTester running locally in minutes.

## Prerequisites

- Node.js 20+
- npm or yarn

## Installation

```bash
git clone https://github.com/yourusername/besttester.git
cd besttester
npm install
npm run setup
```

## Run Your First Test

```bash
npm run test:smoke
```

Expected output:
```
✓ [chromium] › smoke/login.spec.ts (2 tests)
✓ [chromium] › smoke/dashboard.spec.ts (1 test)
...
Passed: 15 of 15 tests
```

## Write Your First Test

Create `tests/ui/my-first-test.spec.ts`:

```typescript
import { test, expect } from '@playwright/test';
import { BasePage } from '@src/page-objects/BasePage';

test.describe('My First Test @smoke', () => {
  let page: BasePage;

  test.beforeEach(async ({ page: browserPage }) => {
    page = new BasePage(browserPage);
    await page.goto('https://example.com');
  });

  test('should load homepage', async () => {
    await expect(page.locator('h1')).toContainText('Welcome');
  });

  test('should navigate to login', async () => {
    await page.click('text=Login');
    await expect(page).toHaveURL(/\/login/);
  });
});
```

Run it:

```bash
npm run test:smoke
```

## What's Next?

- [Test Writing Guide](../guides/test-writing.md) — Learn all test types
- [Architecture Guide](../guides/architecture.md) — Understand the framework
- [Example Gallery](../examples/ui-patterns.md) — See real-world patterns

## Common Commands

```bash
npm run test:ui           # UI tests only
npm run test:api          # API tests only
npm run test:security     # Security tests
npm run test:mobile       # Mobile tests
npm run test:debug        # Debug mode
npm run lint              # Check code quality
npm run typecheck         # Verify types
npm run report:allure     # View Allure report
```

## Troubleshooting

**Tests timing out?**
- Increase `testTimeout` in `config/playwright.config.ts`
- Check network connectivity to your test target

**Browser crashes?**
- Run `npm run setup` to reinstall browser dependencies
- Check available disk space

**Port conflicts?**
- Ensure no other services are running on default ports
- Configure custom ports in environment variables

## Get Help

- 📖 [Full Documentation](../)
- 🐛 [Report Issues](https://github.com/yourusername/besttester/issues)
- 💬 [Discussions](https://github.com/yourusername/besttester/discussions)
