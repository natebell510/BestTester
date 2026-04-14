# Contributing to BestTester

## Adding a New Page Object

```bash
npm run scaffold:page -- --name MyFeaturePage
```
This generates `src/pages/my-feature.page.ts`, `tests/ui/regression/my-feature.spec.ts`, and updates the barrel export.

## Adding a New Test

```bash
npm run scaffold:test -- --name my-feature.spec
```

## Adding a New API Client

```bash
npm run scaffold:api -- --name my-resource.api
```

## Code Standards

- All page objects extend `BasePage` — no inline selectors in spec files
- No `page.waitForTimeout()` — use Playwright auto-waiting
- Every test file must have a JSDoc block with `@file`, `@description`, `@tags`
- Run `npm run lint` and `npm run typecheck` before opening a PR

## Pre-commit / Pre-push Hooks

Husky runs automatically:
- **pre-commit**: ESLint fix + Prettier on staged `.ts` files
- **pre-push** to `main`/`develop`: smoke tests (`@smoke` tag, < 2 min)

## Pull Request Checklist

- [ ] Tests use Page Object Model
- [ ] New factories registered via `TeardownRegistry`
- [ ] `npm run lint` passes
- [ ] `npm run typecheck` passes
- [ ] `npm run test:smoke` passes
- [ ] PR targets `develop` branch
