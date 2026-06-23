# BestTester Documentation

Welcome to BestTester — the **gold-standard, industry-leading QA platform** for modern test engineering.

BestTester is a production-grade Playwright + TypeScript framework for **UI, API, mobile, and AI testing** at scale, with first-class support for distributed execution, advanced observability, and intelligent test assistance.

## Quick Navigation

### 🚀 Getting Started

- [5-Minute Quickstart](./getting-started/quickstart.md) — Get running in minutes
- [Installation](./getting-started/installation.md) — Detailed setup guide
- [Your First Test](./getting-started/first-test.md) — Write your first test

### 📚 Guides

- [Architecture Guide](./guides/architecture.md) — Understand the framework design
- [Test Writing Guide](./guides/test-writing.md) — Learn all test patterns and best practices
- [AI Testing Guide](./guides/ai-testing.md) — Leverage Claude for intelligent testing
- [CI/CD Integration](./guides/ci-cd-integration.md) — Set up GitHub Actions pipelines
- [Kubernetes Guide](./guides/kubernetes.md) — Run distributed tests on K8s

### 💡 Examples

- [UI Test Patterns](./examples/ui-patterns.md) — 10+ UI testing patterns
- [API Test Patterns](./examples/api-patterns.md) — REST, GraphQL, and authentication
- [AI Test Patterns](./examples/ai-patterns.md) — Vision, semantic similarity, LLM judges
- [Security Patterns](./examples/security-patterns.md) — OWASP Top 10 test coverage

### 📖 Reference

- [API Reference](./reference/api.md) — Complete API documentation
- [Fixtures Reference](./reference/fixtures.md) — Custom fixture examples
- [Helper Functions](./reference/helpers.md) — Utility function guide

### 🤝 Contributing

- [Contributing Guide](./contributing.md) — How to contribute
- [Changelog](./changelog.md) — Release notes and updates

---

## What's Included?

### Core Testing
- ✅ **UI Testing** with Playwright and Page Objects
- ✅ **API Testing** with Zod schema validation
- ✅ **Mobile Testing** with device emulation
- ✅ **Security Testing** with OWASP coverage
- ✅ **Performance Testing** with budget validation
- ✅ **Accessibility Testing** with axe integration
- ✅ **Visual Regression** with Playwright snapshots
- ✅ **Contract Testing** with Pact framework

### AI & LLMs
- 🤖 **Vision-Based Assertions** with Claude Sonnet
- 🤖 **LLM Judge System** for flexible evaluations
- 🤖 **Test Generation** from natural language
- 🤖 **Self-Healing Tests** via agents
- 🤖 **Hallucination Detection** for AI content

### CI/CD & DevOps
- 🔄 **GitHub Actions** with matrix testing
- 🔄 **Docker & Compose** for containerization
- ☸️ **Kubernetes** for distributed execution
- ☸️ **Helm Charts** for easy deployment
- 📊 **Allure Reports** with historical trends

### Observability
- 📈 **OpenTelemetry** tracing and metrics
- 📈 **Jaeger** distributed tracing UI
- 📊 **Dashboard** with health scores
- 📊 **Performance Tracking** with budgets

### Developer Experience
- 🎯 **VS Code Integration** with debug configs
- 🎯 **Interactive CLI** for test scaffolding
- 🎯 **Pre-commit Hooks** for code quality
- 🎯 **TypeScript** with strict mode enabled

---

## Key Features at a Glance

### Structured Test Organization

```typescript
// Page Objects for clean UI tests
class LoginPage extends BasePage {
  async login(email: string, password: string) {
    await this.emailField.fill(email);
    await this.passwordField.fill(password);
    await this.submitButton.click();
  }
}

// Fixtures for shared setup
export const test = base.extend({
  authenticatedPage: async ({ page }, use) => {
    const login = new LoginPage(page);
    await login.login('admin@test.com', 'password');
    await use(page);
  },
});
```

### Fluent Data Builders

```typescript
const employee = new EmployeeBuilder()
  .withName('Jane Smith')
  .withEmail('jane@test.com')
  .withRole('Engineer')
  .build(); // Validates with Zod
```

### AI-Powered Testing

```typescript
const result = await judge.evaluate({
  screenshot,
  rubric: 'The page should have professional design',
});
expect(result.score).toBeGreaterThan(0.8);
```

### Distributed Execution

```bash
# Run tests on Kubernetes with automatic result aggregation
npm run k8s:run -- smoke 8 production
```

### Advanced Reporting

```bash
# Generate Allure report with AI insights
npm run report:allure

# View interactive dashboard
npm run report:dashboard
```

---

## Common Commands

```bash
# Development
npm run test:smoke        # Quick smoke tests
npm run test:ui          # UI tests only
npm run test:api         # API tests only
npm run test:debug       # Debug mode
npm run test:headed      # Headed browser

# Code Quality
npm run lint             # ESLint check
npm run lint:fix         # Auto-fix violations
npm run typecheck        # TypeScript verification
npm run format           # Prettier formatting

# Reports
npm run report:allure    # Allure report
npm run report:playwright # Playwright report
npm run report:dashboard  # AI dashboard

# Scaffolding
npm run scaffold:page    # Create Page Object
npm run scaffold:test    # Create test file
npm run scaffold:api     # Create API client

# Docker & K8s
docker-compose up -d     # Start local stack
npm run k8s:run -- smoke 4
```

---

## Architecture Overview

```
Test Execution Layer (Playwright, GitHub Actions, K8s)
    ↓
Test Organization Layer (Fixtures, Page Objects, Helpers)
    ↓
Data & Utilities Layer (Builders, Cleanup, Observability)
    ↓
External Services (APIs, Databases, LLMs, Slack, K8s)
```

---

## Performance

- **CI wall-clock**: 5 minutes for full test suite (with sharding)
- **Parallelism**: 12 concurrent tests (4 workers × 3 browsers)
- **Scalability**: 100+ concurrent tests via Kubernetes

---

## Support

- 📖 [Full Documentation](/) — Complete reference
- 🐛 [Report Issues](https://github.com/yourusername/besttester/issues)
- 💬 [Discussions](https://github.com/yourusername/besttester/discussions)
- ❓ [FAQ](./faq.md)

---

## License

Apache License 2.0 — See [LICENSE](../LICENSE) for details

---

## Next Steps

👉 **New to BestTester?** Start with the [5-Minute Quickstart](./getting-started/quickstart.md)

👉 **Want to learn patterns?** Check the [Example Gallery](./examples/)

👉 **Need specific guidance?** Browse the [Guides](./guides/)

---

**Made with ❤️ for modern QA engineers**
