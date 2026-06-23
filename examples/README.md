# BestTester Example Gallery

Real-world, production-ready test patterns for every testing scenario.

## UI Patterns (10+ examples)

### Forms & Input
- **[form-validation.spec.ts](./ui/form-validation.spec.ts)** — Real-time validation, error handling, field requirements
- **[form-submission.spec.ts](./ui/form-submission.spec.ts)** — Multi-step forms, conditional fields, success states
- **[file-upload.spec.ts](./ui/file-upload.spec.ts)** — File uploads, drag-drop, progress tracking, error recovery

### Interactions
- **[drag-drop.spec.ts](./ui/drag-drop.spec.ts)** — Reordering lists, drag to specific zones, visual feedback
- **[modal-dialogs.spec.ts](./ui/modal-dialogs.spec.ts)** — Modal lifecycle, backdrop clicks, focus management
- **[tooltips-popovers.spec.ts](./ui/tooltips-popovers.spec.ts)** — Show/hide on hover, keyboard interaction, positioning

### Advanced UI
- **[iframe-handling.spec.ts](./ui/iframe-handling.spec.ts)** — Cross-frame communication, nested frames, content access
- **[shadow-dom.spec.ts](./ui/shadow-dom.spec.ts)** — Piercing shadow boundaries, slot content, styling
- **[responsive-design.spec.ts](./ui/responsive-design.spec.ts)** — Viewport changes, mobile gestures, adaptive layouts
- **[carousel-pagination.spec.ts](./ui/carousel-pagination.spec.ts)** — Navigation, infinite scroll, state persistence

## API Patterns (5+ examples)

### Core API
- **[basic-rest-api.spec.ts](./api/basic-rest-api.spec.ts)** — CRUD operations, schema validation, assertions
- **[authentication.spec.ts](./api/authentication.spec.ts)** — Bearer tokens, session cookies, token refresh
- **[graphql-api.spec.ts](./api/graphql-api.spec.ts)** — Queries, mutations, subscriptions, schema validation

### Advanced API
- **[error-handling.spec.ts](./api/error-handling.spec.ts)** — Error codes, retry logic, timeout handling, recovery
- **[pagination-sorting.spec.ts](./api/pagination-sorting.spec.ts)** — Page-based pagination, cursor-based pagination, sorting
- **[rate-limiting.spec.ts](./api/rate-limiting.spec.ts)** — Rate limit headers, backoff strategies, queue management

## Security Patterns (3+ examples)

### OWASP Coverage
- **[xss-prevention.spec.ts](./security/xss-prevention.spec.ts)** — Input sanitization, output encoding, event handler escaping
- **[csrf-protection.spec.ts](./security/csrf-protection.spec.ts)** — CSRF tokens, same-origin verification, state-changing requests
- **[auth-bypass.spec.ts](./security/auth-bypass.spec.ts)** — Access control, privilege escalation, session hijacking

## AI Patterns (5+ examples)

### LLM Integration
- **[vision-testing.spec.ts](./ai/vision-testing.spec.ts)** — Screenshot evaluation, design compliance, accessibility checks
- **[semantic-similarity.spec.ts](./ai/semantic-similarity.spec.ts)** — Content meaning comparison, hallucination detection
- **[test-generation.spec.ts](./ai/test-generation.spec.ts)** — Auto-generating tests from descriptions, code review agents
- **[judgment-rubrics.spec.ts](./ai/judgment-rubrics.spec.ts)** — Flexible evaluation criteria, scoring systems, feedback loops
- **[multi-modal-assertions.spec.ts](./ai/multi-modal-assertions.spec.ts)** — Combining vision + text, complex evaluations

## Mobile Patterns (3+ examples)

### Device Testing
- **[touch-interactions.spec.ts](./mobile/touch-interactions.spec.ts)** — Tap, swipe, long-press, multi-touch
- **[orientation-changes.spec.ts](./mobile/orientation-changes.spec.ts)** — Portrait/landscape, state preservation
- **[network-throttling.spec.ts](./mobile/network-throttling.spec.ts)** — Slow 3G, fast 4G, offline handling

## Performance Patterns (2+ examples)

### Performance Testing
- **[page-load-metrics.spec.ts](./performance/page-load-metrics.spec.ts)** — LCP, FID, CLS, TTFB measurement
- **[performance-budgets.spec.ts](./performance/performance-budgets.spec.ts)** — Budget enforcement, trend tracking, regression detection

## Data Patterns (2+ examples)

### Test Data Management
- **[data-builders.spec.ts](./data/data-builders.spec.ts)** — Fluent builders, schema validation, data variations
- **[seed-management.spec.ts](./data/seed-management.spec.ts)** — Idempotent seeds, audit trails, cleanup

---

## Quick Start

Each example includes:
- ✅ Complete, runnable code
- ✅ Clear test descriptions
- ✅ Best practice patterns
- ✅ Common pitfall warnings
- ✅ When to use guidance

### Run All Examples

```bash
npm run test:smoke  # Run all examples
```

### Run Specific Category

```bash
npm run test:ui -- examples/ui/          # UI examples
npm run test:api -- examples/api/        # API examples
npm run test:security -- examples/security/
npm run test:ai -- examples/ai/
npm run test:mobile -- examples/mobile/
npm run test:performance -- examples/performance/
```

### Run Single Example

```bash
npm run test:smoke -- form-validation.spec.ts
```

### Debug Example

```bash
npm run test:debug -- examples/ui/form-validation.spec.ts
```

---

## Learning Path

**New to BestTester?** Start here:

1. [form-validation.spec.ts](./ui/form-validation.spec.ts) — Learn basic UI testing
2. [basic-rest-api.spec.ts](./api/basic-rest-api.spec.ts) — Learn API testing
3. [data-builders.spec.ts](./data/data-builders.spec.ts) — Learn data management
4. [error-handling.spec.ts](./api/error-handling.spec.ts) — Learn error scenarios
5. [vision-testing.spec.ts](./ai/vision-testing.spec.ts) — Learn AI testing

**Intermediate patterns:**

6. [file-upload.spec.ts](./ui/file-upload.spec.ts) — Advanced UI interactions
7. [authentication.spec.ts](./api/authentication.spec.ts) — Auth flows
8. [xss-prevention.spec.ts](./security/xss-prevention.spec.ts) — Security testing

**Advanced patterns:**

9. [iframe-handling.spec.ts](./ui/iframe-handling.spec.ts) — Complex DOM interactions
10. [graphql-api.spec.ts](./api/graphql-api.spec.ts) — Modern APIs
11. [semantic-similarity.spec.ts](./ai/semantic-similarity.spec.ts) — Advanced AI

---

## Key Patterns Across Examples

### Error Handling

All examples include proper error handling:

```typescript
test('should handle errors gracefully', async ({ page, request }) => {
  try {
    // Action that might fail
    const response = await request.get('/api/endpoint');
    expect(response.ok()).toBe(true);
  } catch (error) {
    // Handle specific error
    expect(error).toBeDefined();
  }
});
```

### Assertions

Examples demonstrate multiple assertion types:

```typescript
// UI assertions
await expect(element).toBeVisible();
await expect(element).toContainText('text');
await expect(page).toHaveURL(/pattern/);

// API assertions
expect(response.status()).toBe(200);
expect(data).toMatchSchema(mySchema);

// AI assertions
expect(result.score).toBeGreaterThan(0.8);
```

### Test Organization

All examples follow consistent structure:

```typescript
test.describe('Feature @tag', () => {
  test.beforeEach(async ({ page }) => {
    // Setup
  });

  test('should do something', async ({ page }) => {
    // Implementation
  });
});
```

---

## Common Assertions

| Assertion | Usage |
|-----------|-------|
| `toBeVisible()` | Element is in viewport |
| `toBeHidden()` | Element not visible |
| `toContainText()` | Contains substring |
| `toHaveURL()` | Page has URL |
| `toHaveAttribute()` | Element has attribute |
| `toHaveCount()` | Collection size |
| `toBeEnabled()` | Input enabled |
| `toMatchSchema()` | Zod validation |

---

## Tips & Tricks

### Waiting for Elements

```typescript
// Wait for element to appear
await expect(element).toBeVisible();

// Wait for specific state
await page.waitForLoadState('networkidle');

// Wait for function
await page.waitForFunction(() => {
  return document.querySelectorAll('.item').length > 5;
});
```

### Screenshot on Failure

```typescript
test('should do something', async ({ page }) => {
  try {
    await expect(element).toBeVisible();
  } catch (e) {
    await page.screenshot({ path: 'failure.png' });
    throw e;
  }
});
```

### Debugging

```typescript
// Run in debug mode
npm run test:debug

// Add console logging
console.log('Debug info:', await element.textContent());

// Use page.pause() during test
await page.pause(); // Pauses and opens inspector
```

---

## Contributing

Found a pattern worth sharing? [Submit a PR](../CONTRIBUTING.md) with your example!

Requirements:
- ✅ Complete, runnable code
- ✅ Clear JSDoc comments
- ✅ All tests pass
- ✅ Links to relevant docs

---

## Next Steps

- [Test Writing Guide](../docs/guides/test-writing.md) — Learn all patterns
- [API Reference](../docs/reference/api.md) — Complete API docs
- [Contributing](../docs/contributing.md) — Submit your patterns

---

**Made with ❤️ for test engineers**
