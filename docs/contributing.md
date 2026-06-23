# Contributing Guide

Thank you for contributing to BestTester! We welcome contributions of all kinds.

## Code of Conduct

Be respectful and constructive. Everyone deserves a welcoming, inclusive environment.

## Getting Started

1. Fork the repository
2. Clone your fork
3. Create a feature branch
4. Make your changes
5. Submit a pull request

## Development Setup

```bash
git clone https://github.com/yourusername/besttester.git
cd besttester
npm install
npm run setup
```

## Making Changes

### Running Tests

Before committing, ensure all tests pass:

```bash
npm run lint
npm run typecheck
npm run test:smoke
```

### Code Style

- **TypeScript**: Strict mode enabled, no `any` types
- **Formatting**: Prettier (auto-run via pre-commit)
- **Linting**: ESLint with custom Playwright rules
- **Naming**: Use camelCase for functions, PascalCase for classes

### Commit Messages

Follow conventional commits:

```
<type>(<scope>): <subject>

<body>

<footer>
```

Types:
- `feat`: New feature
- `fix`: Bug fix
- `refactor`: Code reorganization
- `test`: Test additions/fixes
- `docs`: Documentation
- `chore`: Build, deps, etc.

Example:
```
feat(ai): add vision-based assertion with Claude

- Implement LLMJudge.evaluate() for screenshot evaluation
- Add flexible rubric system for evaluations
- Support custom thresholds and models

Fixes #123
```

## Adding Tests

### Test File Structure

```typescript
import { test, expect } from '@playwright/test';
import { MyPage } from '@src/page-objects/MyPage.page';

test.describe('Feature Name @tag', () => {
  let page: MyPage;

  test.beforeEach(async ({ page: browserPage }) => {
    page = new MyPage(browserPage);
  });

  test('should do something', async () => {
    // Test implementation
  });
});
```

### Guidelines

- One logical concept per test
- Descriptive test names (no "test 1", "test 2")
- Use Page Objects for UI tests
- Tag tests with `@category` for filtering
- Validate behavior, not implementation

## Adding Documentation

Documentation lives in `docs/` and must be updated for:
- New features
- API changes
- Configuration options
- Examples

Format:
- Markdown with proper headings
- Code examples with language tags
- Links to related docs

## Submitting a Pull Request

### Before Submitting

1. Update tests for your changes
2. Update docs if needed
3. Run full test suite: `npm run test:smoke`
4. Run linter: `npm run lint`
5. Run type check: `npm run typecheck`

### PR Description

Include:
- **What**: Brief description of changes
- **Why**: Motivation for the change
- **Testing**: How you tested the changes
- **Checklist**:
  - [ ] Tests pass
  - [ ] Docs updated
  - [ ] No breaking changes (or noted)

Example:

```markdown
## What
Add support for WebSocket testing in API clients

## Why
Users need to test real-time features like WebSocket connections.

## Testing
- Added 5 new tests in `tests/api/websocket.spec.ts`
- Tested with local Node.js WebSocket server
- All existing tests pass

## Checklist
- [x] Tests pass
- [x] Docs updated
- [x] No breaking changes
```

## Code Review Process

1. Automated checks run (lint, type, tests)
2. Maintainers review your code
3. Feedback and suggestions provided
4. You make requested changes
5. PR approved and merged

## Common Issues

### Pre-commit Hook Failures

```bash
# Fix formatting
npm run lint:fix
npm run format

# Try commit again
git commit -m "your message"
```

### Tests Failing in CI

Check CI output for specific failures:

```bash
# Run tests locally
npm run test:smoke

# Debug specific test
npm run test:debug -- --grep "specific test name"
```

### TypeScript Errors

Ensure strict mode compliance:

```bash
npm run typecheck

# Fix errors (no @ts-ignore allowed)
# Consider restructuring code or adding proper types
```

## Project Structure

```
besttester/
├── src/              # Source code
├── tests/            # Test files
├── scripts/          # CLI scripts
├── k8s/              # Kubernetes config
├── .github/          # GitHub Actions
├── config/           # Configuration
└── docs/             # Documentation
```

## Adding New Test Type

To add a new test type (e.g., `@blockchain`):

1. Create `tests/blockchain/` directory
2. Add script to `package.json`:
   ```json
   "test:blockchain": "playwright test --config config/playwright.config.ts --grep \"@blockchain\""
   ```
3. Add workflow step in `.github/workflows/ci.yml`
4. Document in `docs/guides/test-writing.md`
5. Add example in `examples/`

## Performance Considerations

- Keep individual tests under 30s
- Use fixtures for expensive setup
- Avoid network calls where possible
- Use `test.slow()` for inherently slow tests

## Documentation Updates

When updating docs:

1. Update the relevant `.md` file
2. Add/update links in `docs/README.md`
3. Update examples if needed
4. Check all links work

## Release Process

Maintainers follow semantic versioning:

1. Update version in `package.json`
2. Update `CHANGELOG.md`
3. Create git tag
4. Push to GitHub
5. GitHub Actions publishes to npm

## Questions?

- Open a discussion: https://github.com/yourusername/besttester/discussions
- Check existing issues: https://github.com/yourusername/besttester/issues
- Read the docs: https://yourusername.github.io/besttester/

## License

By contributing, you agree your contributions are licensed under Apache License 2.0.

---

Thank you for helping make BestTester better! 🎉
