# Your First Test

In this guide, we'll create a complete working test from scratch.

## Step 1: Create Test File

Create `tests/ui/my-first-feature.spec.ts`:

```typescript
import { test, expect } from '@playwright/test';

test.describe('My First Feature @smoke', () => {
  test('should load the homepage', async ({ page }) => {
    // Navigate to the application
    await page.goto('https://example.com');

    // Check the page title
    await expect(page).toHaveTitle(/Welcome/);

    // Verify a heading exists
    await expect(page.locator('h1')).toContainText('Welcome');
  });

  test('should display navigation menu', async ({ page }) => {
    await page.goto('https://example.com');

    // Check if navigation links exist
    const navMenu = page.locator('nav');
    await expect(navMenu).toBeVisible();

    // Count menu items
    const menuItems = page.locator('nav a');
    const count = await menuItems.count();
    expect(count).toBeGreaterThan(0);
  });
});
```

## Step 2: Run Your Test

```bash
npm run test:smoke
```

You should see:
```
✓ [chromium] › tests/ui/my-first-feature.spec.ts › My First Feature › should load the homepage
✓ [chromium] › tests/ui/my-first-feature.spec.ts › My First Feature › should display navigation menu

2 tests passed
```

## Step 3: Debug Your Test

To see what's happening, run in headed mode:

```bash
npm run test:headed
```

Or use the debug UI:

```bash
npm run test:debug
```

## Step 4: Use Page Objects (Recommended)

Instead of scattered selectors, organize with Page Objects.

Create `src/page-objects/HomePage.page.ts`:

```typescript
import { Page, Locator } from '@playwright/test';
import { BasePage } from './BasePage';

export class HomePage extends BasePage {
  readonly heading: Locator = this.page.locator('h1');
  readonly navMenu: Locator = this.page.locator('nav');

  async goto() {
    await this.page.goto(process.env.BASE_URL || 'https://example.com');
  }

  async getMenuItemCount(): Promise<number> {
    return this.navMenu.locator('a').count();
  }
}
```

Update your test:

```typescript
import { test, expect } from '@playwright/test';
import { HomePage } from '@src/page-objects/HomePage.page';

test.describe('My First Feature @smoke', () => {
  let homePage: HomePage;

  test.beforeEach(async ({ page }) => {
    homePage = new HomePage(page);
    await homePage.goto();
  });

  test('should load the homepage', async () => {
    await expect(homePage.heading).toContainText('Welcome');
  });

  test('should display navigation menu', async () => {
    await expect(homePage.navMenu).toBeVisible();
    const count = await homePage.getMenuItemCount();
    expect(count).toBeGreaterThan(0);
  });
});
```

## Step 5: Add Fixtures

Share setup code with fixtures. Create `src/fixtures/auth.fixture.ts`:

```typescript
import { test as base } from '@playwright/test';
import { BasePage } from '@src/page-objects/BasePage';

export const test = base.extend({
  authenticatedPage: async ({ page }, use) => {
    const basePage = new BasePage(page);
    await basePage.goto('/login');
    
    // Login
    await page.fill('[data-testid="username"]', 'admin');
    await page.fill('[data-testid="password"]', 'password');
    await page.click('[data-testid="login-btn"]');
    
    // Wait for dashboard
    await page.waitForURL('/dashboard');
    
    await use(basePage);
  },
});
```

Use it:

```typescript
import { test, expect } from './fixtures/auth.fixture';
import { DashboardPage } from '@src/page-objects/DashboardPage';

test.describe('Dashboard @smoke', () => {
  test('should display user info', async ({ authenticatedPage: page }) => {
    const dashboard = new DashboardPage(page.page);
    await expect(dashboard.userGreeting).toContainText('Welcome');
  });
});
```

## Step 6: Add Assertions

Playwright provides powerful assertions:

```typescript
test('comprehensive assertions', async ({ page }) => {
  await page.goto('/');

  // Visibility
  await expect(page.locator('.banner')).toBeVisible();
  await expect(page.locator('.hidden')).toBeHidden();

  // Content
  await expect(page).toHaveTitle('Home');
  await expect(page.locator('h1')).toContainText('Welcome');

  // Attributes
  await expect(page.locator('input')).toHaveAttribute('required', '');

  // Count
  const items = page.locator('li');
  await expect(items).toHaveCount(5);

  // CSS Classes
  await expect(page.locator('.button')).toHaveClass(/active/);

  // Enabled/Disabled
  await expect(page.locator('button')).toBeEnabled();
});
```

## Step 7: Add Error Handling

Handle waits and timeouts:

```typescript
test('handle loading states', async ({ page }) => {
  await page.goto('/');

  // Wait for element to appear
  await page.locator('.spinner').waitFor({ state: 'visible' });
  await page.locator('.spinner').waitFor({ state: 'hidden' });

  // Wait for network to settle
  await page.waitForLoadState('networkidle');

  // Verify content
  await expect(page.locator('[data-testid="results"]')).toBeVisible();
});
```

## Step 8: Run and View Report

```bash
npm run test:smoke
npm run report:playwright
```

Reports are saved in `playwright-report/` and auto-opened in your browser.

## Next Steps

- [Test Writing Guide](../guides/test-writing.md) — Learn all test types and patterns
- [Example Gallery](../examples/ui-patterns.md) — See 10+ UI test patterns
- [Page Objects](../guides/test-writing.md#page-objects) — Best practices
- [Debugging](../guides/test-writing.md#debugging) — Advanced techniques

## Common Assertions

| Assertion | Usage |
|-----------|-------|
| `toBeVisible()` | Element is in viewport |
| `toBeHidden()` | Element is not visible |
| `toHaveText(text)` | Element contains exact text |
| `toContainText(text)` | Element contains substring |
| `toHaveAttribute(name, value)` | Element has attribute |
| `toHaveClass(class)` | Element has CSS class |
| `toBeEnabled()` | Input is enabled |
| `toHaveCount(n)` | Count of elements |
| `toHaveURL(url)` | Page has URL |
| `toHaveTitle(title)` | Page has title |

## Tips & Tricks

**Wait for specific element:**
```typescript
await page.waitForSelector('[data-testid="modal"]');
```

**Get element text:**
```typescript
const text = await page.locator('h1').textContent();
```

**Take screenshot:**
```typescript
await page.screenshot({ path: 'screenshot.png' });
```

**Record a test:**
```bash
npx playwright codegen https://example.com
```

**Run single test:**
```bash
npm run test:smoke -- --grep "should load the homepage"
```

**Run in different browser:**
```bash
npm run test:smoke -- --project=firefox
```
