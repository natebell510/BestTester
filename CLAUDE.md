# CLAUDE.md — BestTester Improvement Roadmap

> **Mission:** Elevate BestTester from a comprehensive Playwright framework into the **gold-standard, industry-leading QA platform** — the definitive reference implementation for modern test engineering.
>
> **Instructions for Claude Code:** Work through each task sequentially within a phase. Each task includes acceptance criteria. Commit after completing each task with the prefix `feat:`, `fix:`, `refactor:`, or `chore:`. Run `npm run lint && npm run typecheck` after every change. Run `npm run test:smoke` before committing. Open PRs against `develop`.

---

## Phase 1 — Foundation Hardening

### TASK-001: Upgrade to Playwright v1.45+ and Latest Dependencies

**Goal:** Ensure the framework runs on the latest stable Playwright and all peer dependencies are current.

**Steps:**
1. Run `npx npm-check-updates -u` to identify outdated packages
2. Update `@playwright/test` to latest stable (≥1.45)
3. Update AWS SDK v3 packages (`@aws-sdk/client-bedrock-runtime`, etc.) to latest
4. Update `@modelcontextprotocol/sdk` to latest
5. Update all dev dependencies (ESLint, TypeScript, Prettier, Husky)
6. Fix any breaking changes introduced by upgrades
7. Verify `npm run test:smoke` passes after upgrades

**Acceptance Criteria:**
- `npm audit` returns 0 high/critical vulnerabilities
- All tests pass
- TypeScript strict mode has no new errors

---

### TASK-002: Strict TypeScript Configuration Upgrade

**Goal:** Enforce maximum type safety across the entire codebase.

**Steps:**
1. In `tsconfig.json`, enable:
   ```json
   {
     "strict": true,
     "noUncheckedIndexedAccess": true,
     "exactOptionalPropertyTypes": true,
     "noImplicitOverride": true,
     "noPropertyAccessFromIndexSignature": true
   }
   ```
2. Fix all resulting TypeScript errors (do not use `@ts-ignore` or `any` suppressions)
3. Replace all `any` types with proper interfaces or generics
4. Add Zod schema validation to ALL API response types (not just regression tests)
5. Create `src/types/index.ts` barrel export for all shared types

**Acceptance Criteria:**
- Zero TypeScript errors with strict config
- Zero `any` types in `src/` (use `unknown` with type guards where needed)
- All API responses validated with Zod schemas

---

### TASK-003: Enhanced ESLint Ruleset

**Goal:** Enforce QA-specific code quality rules that prevent flaky test patterns.

**Steps:**
1. Install `eslint-plugin-playwright` and configure all recommended rules
2. Add custom rules to `eslint.config.mjs`:
    - Forbid `page.waitForTimeout()` (already a CONTRIBUTING rule — enforce via lint)
    - Forbid hardcoded `sleep`/`delay` calls
    - Forbid `.pause()` in committed code
    - Require `data-testid` or ARIA role selectors (warn on CSS class selectors)
    - Enforce `expect` assertions in every test (no empty tests)
    - Require `test.describe` blocks for organization
3. Add `eslint-plugin-security` for security anti-patterns
4. Configure `@typescript-eslint/naming-convention` for consistent naming

**Acceptance Criteria:**
- `npm run lint` passes with 0 errors
- `eslint-plugin-playwright` fully configured
- Pre-commit hook catches violations before they reach CI

---

### TASK-004: Test Isolation & Parallel Execution Hardening

**Goal:** Guarantee zero test interdependencies and maximize parallel execution speed.

**Steps:**
1. Audit all test files for shared mutable state — fix any found
2. Add `test.use({ storageState: undefined })` reset in fixtures where auth state leaks
3. Configure `fullyParallel: true` in `playwright.config.ts` for all projects
4. Implement worker-scoped fixtures for expensive setup (browser launch, auth)
5. Add `test.setTimeout()` at suite level with sensible defaults per test type:
    - UI smoke: 30s
    - API: 10s
    - AI/LLM: 60s
    - Security: 120s
6. Create `src/fixtures/worker-isolation.fixture.ts` that guarantees clean state per worker

**Acceptance Criteria:**
- All tests pass when run with `--workers=8`
- No test order dependencies (verified by running with `--shuffle`)
- CI wall-clock time reduced by ≥20%

---

### TASK-005: Environment Configuration Validation

**Goal:** Fail fast on misconfiguration instead of cryptic runtime errors.

**Steps:**
1. Create `src/config/env-validator.ts` using Zod to validate all required env vars at startup
2. Define schemas for each environment tier (dev/staging/prod) with required vs optional fields
3. Add validation call in `config/global-setup.ts`
4. Create `src/config/config.ts` typed config singleton (no raw `process.env` access outside this file)
5. Update all files to import from config singleton instead of `process.env` directly
6. Add `.env.example` documentation with descriptions for every variable

**Acceptance Criteria:**
- Missing required env vars produce a clear error with the variable name and description
- No raw `process.env.VARIABLE` access outside `src/config/config.ts`
- Config singleton is typed — no `string | undefined` propagation

---

## Phase 2 — AI & LLM Capabilities Upgrade

### TASK-006: Multi-Model LLM Router

**Goal:** Support multiple LLM providers with automatic fallback and cost optimization.

**Steps:**
1. Create `src/ai/llm-router.ts` — a provider-agnostic router supporting:
    - AWS Bedrock (Nova Pro, Claude Sonnet 3.5/3.7, Titan)
    - OpenAI (GPT-4o, GPT-4o-mini)
    - Anthropic Direct API (Claude Opus 4, Sonnet 4)
2. Implement routing strategies:
    - `cost-optimized`: use cheapest model that meets quality threshold
    - `latency-optimized`: use fastest available model
    - `quality-optimized`: use highest-capability model
    - `fallback`: try primary, fall back to secondary on error/timeout
3. Add per-call model override via options parameter
4. Implement retry with exponential backoff (3 retries, 1s/2s/4s)
5. Add request/response logging via Winston with token usage tracking
6. Create `src/ai/model-registry.ts` with model capabilities metadata (context window, cost per token, supports vision, etc.)

**Acceptance Criteria:**
- All existing AI tests pass with new router
- Fallback triggers correctly when primary model returns 429 or 5xx
- Token usage logged per test run
- Provider can be switched via `LLM_PROVIDER` env var

---

### TASK-007: Vision-Based AI Assertions

**Goal:** Add screenshot-based visual intelligence using multimodal LLMs.

**Steps:**
1. Create `src/ai/vision-assert.ts` with these capabilities:
    - `assertPageLooksCorrect(page, description)` — LLM evaluates screenshot vs description
    - `assertNoVisualRegressions(page, baselineDescription)` — compare vs stored baseline description
    - `assertAccessibilityFromScreenshot(page)` — identify visual a11y issues
    - `detectUIAnomalies(page, expectedElements[])` — find missing/unexpected elements
    - `extractDataFromScreenshot(page, schema)` — structured data extraction from UI
2. Use Claude Sonnet vision capabilities via Bedrock
3. Cache baseline descriptions in `src/ai/baselines/` as JSON
4. Integrate with `semanticExpect` API for consistent assertion style
5. Add `tests/ai/vision.spec.ts` with example tests

**Acceptance Criteria:**
- Vision assertions work in CI (headless mode)
- Baseline descriptions auto-generated on first run
- `assertPageLooksCorrect` correctly identifies broken layouts

---

### TASK-008: Agentic Test Healer v2 — Auto-Fix & Auto-Commit

**Goal:** Upgrade the test healer from suggestion mode to autonomous fix-and-verify mode.

**Steps:**
1. Enhance `agents/heal-agent.ts`:
    - Parse Playwright HTML report JSON to extract failed tests with locator info
    - Take screenshot of failed state
    - Send DOM + screenshot to Claude Sonnet vision model
    - Generate candidate fixes (up to 3 alternatives per broken locator)
    - Apply fix #1 and re-run the specific test
    - If test passes → create git commit on `fix/healer-TIMESTAMP` branch
    - If test fails → try fix #2, then fix #3
    - If all fail → create GitHub issue with full diagnostic report
2. Add `--auto-commit` flag to enable autonomous commit behavior
3. Send healing summary to Slack via existing Slack utility
4. Track healing history in `reports/healing-history.json`

**Acceptance Criteria:**
- Healer successfully fixes simple locator changes (e.g., `data-testid` renames)
- GitHub issue created when healer cannot fix
- Healing history persisted and queryable

---

### TASK-009: LLM-as-Judge v2 — Expanded Rubrics & Calibration

**Goal:** Add production-grade evaluation capabilities used in enterprise AI QA.

**Steps:**
1. Add new rubrics to `src/ai/judge/`:
    - `MULTIMODAL` — evaluate image + text response quality
    - `TOOL_USE` — evaluate function calling accuracy and efficiency
    - `REASONING_CHAIN` — evaluate chain-of-thought correctness
    - `CONSISTENCY` — evaluate response consistency across multiple runs (variance score)
2. Implement **calibration dataset**: create `src/ai/judge/calibration/` with 20 golden examples per rubric with expected scores
3. Add **judge agreement score** — run two different judge models and flag disagreements >1.0 point
4. Implement **pairwise A/B testing** harness: `judgeCompare(responseA, responseB, rubric)` returns winner + margin
5. Add judge performance metrics dashboard as HTML report

**Acceptance Criteria:**
- Calibration tests pass (judge scores within ±0.5 of golden scores)
- A/B harness works end-to-end
- New rubrics integrated into `semanticExpect` API

---

### TASK-010: AI Test Generator via MCP

**Goal:** Enable AI agents to autonomously generate test files from natural language or page analysis.

**Steps:**
1. Enhance `mcp/` server with new tools:
    - `generate_test_from_description` — takes feature description, returns complete spec file
    - `generate_page_object` — crawls a URL and generates a full POM class
    - `generate_api_test` — takes OpenAPI spec URL, generates API test suite
    - `analyze_test_coverage` — returns coverage gaps for a given page object
2. Create `src/ai/test-generator.ts` with structured prompts for each generation type
3. Generated tests must pass ESLint and TypeScript compilation before being returned
4. Add `tests/ai/generator-validation.spec.ts` to test the generator itself
5. Document MCP tools in README with example prompts

**Acceptance Criteria:**
- `mcp:generate` produces TypeScript-valid test files
- Generated tests pass lint and typecheck
- Generator correctly identifies existing POM patterns and follows them

---

## Phase 3 — Testing Capabilities Expansion

### TASK-011: Contract Testing with Pact

**Goal:** Add consumer-driven contract testing to catch API breaking changes before they reach E2E tests.

**Steps:**
1. Install `@pact-foundation/pact` and `@pact-foundation/pact-core`
2. Create `tests/contracts/` directory
3. Implement consumer contracts for all API clients in `src/api/`:
    - `auth.api.ts` → `tests/contracts/auth.contract.spec.ts`
    - `employee.api.ts` → `tests/contracts/employee.contract.spec.ts`
    - `leave.api.ts` → `tests/contracts/leave.contract.spec.ts`
4. Add Pact broker configuration (use PactFlow or self-hosted)
5. Add `npm run test:contracts` script
6. Add `contract-tests.yml` GitHub Actions workflow
7. Add contract verification step to CI pipeline (before E2E tests)

**Acceptance Criteria:**
- Contract tests pass against OrangeHRM demo API
- Breaking API changes detected before UI tests run
- Pact files published to broker

---

### TASK-012: Accessibility Testing Suite

**Goal:** Add comprehensive WCAG 2.2 AA compliance testing.

**Steps:**
1. Install `@axe-core/playwright` and `axe-playwright`
2. Create `src/a11y/accessibility-checker.ts` with:
    - `checkPage(page, options)` — full page axe scan
    - `checkComponent(page, selector, options)` — component-level scan
    - `checkColorContrast(page)` — dedicated contrast check
    - `generateA11yReport(violations)` — structured violation report
3. Create `tests/a11y/` directory with tests for all major page types
4. Add custom violation formatter that maps axe violations to WCAG criteria
5. Add `a11y-scan.yml` GitHub Actions workflow
6. Integrate a11y checks into `BasePage` as optional `assertAccessible()` method
7. Add `npm run test:a11y` script

**Acceptance Criteria:**
- A11y tests run on all major page objects
- WCAG violations fail tests with clear remediation guidance
- A11y report generated in Allure format

---

### TASK-013: Performance Testing Integration

**Goal:** Add Core Web Vitals and performance budget enforcement.

**Steps:**
1. Create `src/performance/` module:
    - `performance-collector.ts` — collects LCP, FID/INP, CLS, TTFB via Playwright CDP
    - `performance-budget.ts` — configurable thresholds per page/environment
    - `performance-reporter.ts` — generates trend reports
2. Create `tests/performance/` with tests for critical user journeys:
    - Login page load
    - Dashboard render
    - Data-heavy list pages
3. Performance budgets (configurable in `config/`):
    - LCP: <2.5s (good), <4s (warn), >4s (fail)
    - CLS: <0.1 (good), <0.25 (warn), >0.25 (fail)
    - TTFB: <800ms (good), <1800ms (warn)
4. Add `performance-scan.yml` GitHub Actions workflow
5. Store historical performance data in `reports/performance-history.json`
6. Add trend chart to Allure report

**Acceptance Criteria:**
- Performance metrics collected in CI
- Budget violations fail the test with current value vs threshold
- 5-run trend history maintained

---

### TASK-014: GraphQL API Testing Support

**Goal:** Add first-class GraphQL testing alongside existing REST support.

**Steps:**
1. Create `src/api/graphql-client.ts` — typed GraphQL client using `graphql-request`
2. Add GraphQL schema introspection utility: `src/api/schema-introspector.ts`
3. Implement GraphQL-specific Zod validation that validates against introspected schema
4. Create `tests/api/graphql/` directory with example tests
5. Add subscription testing support (WebSocket)
6. Add `npm run test:graphql` script
7. Scaffold command: `npm run scaffold:graphql -- --name my-query`

**Acceptance Criteria:**
- GraphQL client supports queries, mutations, and subscriptions
- Schema validation catches type mismatches
- Scaffold generates typed query files

---

### TASK-015: Advanced Visual Regression with Baseline Management

**Goal:** Upgrade visual regression from basic screenshots to production-grade baseline management.

**Steps:**
1. Enhance `tests/ui/visual/` with:
    - Per-environment baselines (dev/staging/prod stored separately)
    - Per-browser baselines (chromium/firefox/webkit stored separately)
    - Dynamic content masking (dates, user names, prices)
    - Full-page vs viewport capture options
2. Create `src/visual/baseline-manager.ts`:
    - Auto-approve on first run
    - CLI tool to update baselines: `npm run visual:update`
    - Visual diff report with side-by-side comparison
3. Add pixel threshold and structural similarity (SSIM) options
4. Integrate with Allure to embed diff images in reports
5. Add `visual-regression.yml` GitHub Actions workflow that comments diff on PRs

**Acceptance Criteria:**
- Baselines organized by env + browser
- Dynamic content masked automatically for date/time fields
- PR comments show visual diffs

---

## Phase 4 — Security & Compliance Hardening

### TASK-016: OWASP Top 10 (2021) Complete Test Coverage

**Goal:** Cover all OWASP Top 10 2021 categories with automated tests.

**Steps:**
1. Map current security tests to OWASP categories — identify gaps
2. Add tests for uncovered categories:
    - A01: Broken Access Control — test horizontal/vertical privilege escalation
    - A02: Cryptographic Failures — verify HTTPS enforcement, secure cookies
    - A03: Injection — expand SQLi/XSS/LDAP/NoSQL payloads (use SecLists)
    - A04: Insecure Design — test rate limiting, CAPTCHA bypass
    - A05: Security Misconfiguration — expand header checks (CORP, COOP, COEP)
    - A06: Vulnerable Components — integrate `npm audit` into CI as blocking check
    - A07: Auth Failures — test account enumeration, brute force protection
    - A08: Data Integrity Failures — test CSRF, serialization
    - A09: Logging Failures — verify audit log generation
    - A10: SSRF — test request forgery where applicable
3. Organize in `tests/security/owasp/` with one file per category
4. Create OWASP compliance report template

**Acceptance Criteria:**
- All 10 OWASP categories have at least 2 test cases
- Security scan CI workflow runs OWASP tests
- OWASP compliance matrix in reports

---

### TASK-017: Secret Scanning & Supply Chain Security

**Goal:** Prevent secrets from entering the codebase and ensure supply chain integrity.

**Steps:**
1. Install and configure `detect-secrets` (or `gitleaks`) pre-commit hook
2. Add `gitleaks.toml` configuration file
3. Add `secret-scan.yml` GitHub Actions workflow that blocks PRs with detected secrets
4. Configure `npm audit` as blocking CI step (fail on high/critical)
5. Add `npm run security:audit` script that combines:
    - `npm audit --audit-level=high`
    - `gitleaks detect`
    - License compliance check (`license-checker`)
6. Add `SECURITY.md` with vulnerability disclosure policy

**Acceptance Criteria:**
- Pre-commit hook blocks commits with secrets
- CI fails on leaked secrets
- `npm run security:audit` provides unified security health report

---

## Phase 5 — Reporting & Observability

### TASK-018: Unified Test Intelligence Dashboard

**Goal:** Create a single HTML dashboard that aggregates all report types into actionable insights.

**Steps:**
1. Create `src/reporting/dashboard-generator.ts`:
    - Aggregates data from: Allure JSON, Playwright JSON, JUnit XML, performance history, mutation scores, coverage data
    - Generates `reports/dashboard/index.html`
2. Dashboard sections:
    - **Health Score** — weighted composite score (pass rate, performance, mutation, coverage)
    - **Test Trend** — 7-day pass/fail trend chart
    - **Flaky Tests** — tests that have both passed and failed in last 10 runs
    - **Slowest Tests** — top 10 by duration with optimization suggestions
    - **AI Evaluation Summary** — LLM judge scores per rubric over time
    - **Coverage Heatmap** — which features are most/least tested
3. Add `npm run report:dashboard` script
4. Publish dashboard to GitHub Pages alongside Allure

**Acceptance Criteria:**
- Dashboard auto-generated after every CI run
- Health score accurately reflects framework state
- Flaky test detection works across 10 historical runs

---

### TASK-019: Distributed Tracing & Observability

**Goal:** Add OpenTelemetry tracing to understand test execution patterns at scale.

**Steps:**
1. Install `@opentelemetry/sdk-node`, `@opentelemetry/auto-instrumentations-node`
2. Create `src/observability/tracer.ts`:
    - Trace each test as a span with attributes (test name, suite, tags, environment)
    - Trace each page action as a child span
    - Trace each API call with status codes and latency
3. Export traces to:
    - Console (dev mode)
    - OTLP endpoint (CI mode — configurable via `OTEL_EXPORTER_OTLP_ENDPOINT`)
4. Add `src/observability/metrics.ts`:
    - Custom metrics: test_duration, assertion_count, locator_resolution_time, llm_latency
5. Add OpenTelemetry configuration to `config/`

**Acceptance Criteria:**
- Test execution traces visible in any OTLP-compatible backend
- LLM call latency tracked as histogram metric
- No performance overhead >5% vs baseline

---

### TASK-020: Flaky Test Detection & Quarantine System

**Goal:** Automatically detect and quarantine flaky tests to protect CI reliability.

**Steps:**
1. Create `src/flakiness/flaky-detector.ts`:
    - Track test results across runs in `reports/test-history.json`
    - Calculate flakiness score: `failures / total_runs` in last 20 runs
    - Flag tests with score >0.1 (>10% flakiness) as flaky
2. Create `src/flakiness/quarantine-manager.ts`:
    - Maintain `quarantine.json` list of flaky test IDs
    - Quarantined tests run in separate `test:quarantine` suite
    - Quarantined tests skipped in `test:regression` (but logged as quarantined)
3. Add Slack alert when new test becomes flaky
4. Add `npm run test:quarantine` script
5. Add auto-unquarantine: if test passes 5 consecutive runs, remove from quarantine

**Acceptance Criteria:**
- Flaky test detection works after 20 runs of seeded flaky test
- Quarantined tests do not fail CI
- Auto-unquarantine triggers correctly

---

## Phase 6 — Developer Experience

### TASK-021: Interactive Test Authoring CLI

**Goal:** Make test creation effortless with an intelligent guided CLI.

**Steps:**
1. Create `scripts/create-test.ts` — interactive wizard using `enquirer` or `@clack/prompts`:
    - Asks: test type (UI/API/AI/Mobile/Security)
    - Asks: feature name
    - Asks: test scenarios (natural language)
    - Sends scenarios to LLM → generates complete spec file
    - Shows preview, asks to confirm
    - Creates file in correct directory
    - Runs `npm run lint` on generated file
    - Optionally opens in VS Code
2. Add `npm run create:test` script
3. Integrate with MCP server as a new tool: `create_test_interactive`

**Acceptance Criteria:**
- CLI produces valid, lint-passing test file in <30 seconds
- Generated test follows all CONTRIBUTING.md conventions
- Works offline by falling back to template generation

---

### TASK-022: VS Code Extension Integration

**Goal:** Provide VS Code developer experience enhancements.

**Steps:**
1. Create `.vscode/` directory with:
    - `settings.json` — Playwright Test extension config, TypeScript settings, ESLint settings
    - `extensions.json` — recommended extensions list:
        - `ms-playwright.playwright`
        - `dbaeumer.vscode-eslint`
        - `esbenp.prettier-vscode`
        - `streetsidesoftware.code-spell-checker`
        - `usernamehw.errorlens`
        - `github.copilot`
    - `launch.json` — debug configurations for:
        - Debug current test file
        - Debug smoke suite
        - Debug with Playwright inspector
        - Debug single test by title
    - `tasks.json` — common npm scripts as VS Code tasks
2. Create `src/snippets/playwright.code-snippets` with TypeScript snippets:
    - `pwtest` → full test template with JSDoc
    - `pwpage` → page object class template
    - `pwapi` → API client method template
    - `pwfixture` → fixture template

**Acceptance Criteria:**
- All debug configurations work in VS Code
- Snippets produce lint-valid code
- Extensions automatically suggested on first open

---

### TASK-023: Test Data Management System v2

**Goal:** Upgrade data factories with database seeding, versioning, and cleanup guarantees.

**Steps:**
1. Enhance `src/data/` module:
    - Create `src/data/seed-manager.ts` — idempotent database seeding with version tracking
    - Create `src/data/cleanup-registry.ts` — guaranteed cleanup even on test failure (using `test.afterAll` with try/finally)
    - Create `src/data/data-builder.ts` — fluent builder pattern for complex test data:
      ```typescript
      const employee = await DataBuilder.employee()
        .withRole('Manager')
        .withDepartment('Engineering')
        .withSubordinates(3)
        .build();
      ```
2. Add `src/data/snapshots/` — save/restore data state between test suites
3. Add data validation: all created test data must match Zod schemas
4. Add cleanup audit log: `reports/cleanup-audit.json` tracking all created/deleted resources

**Acceptance Criteria:**
- Cleanup always runs even when tests abort
- Fluent builder works for all existing entity types
- No orphaned test data after full suite run

---

## Phase 7 — CI/CD & Infrastructure

### TASK-024: GitHub Actions Optimization

**Goal:** Reduce CI time and cost while improving reliability.

**Steps:**
1. Add job-level caching strategy to all workflows:
    - Cache `node_modules` keyed on `package-lock.json` hash
    - Cache Playwright browsers keyed on Playwright version
    - Cache TypeScript compilation output
2. Implement matrix sharding for regression tests:
    - Split into 4 shards: `--shard=1/4`, `--shard=2/4`, etc.
    - Merge shard results in post-job
3. Add `paths` filters to workflows — only run relevant tests when specific dirs change:
    - `tests/api/**` changed → only run `api-tests.yml`
    - `tests/security/**` changed → only run `security-scan.yml`
4. Add workflow concurrency controls (cancel in-progress on new push)
5. Add OIDC-based AWS authentication (replace long-lived credentials)
6. Add GitHub Environments with required reviewers for production test runs

**Acceptance Criteria:**
- CI time reduced by ≥30% via caching + sharding
- OIDC auth works for AWS Bedrock calls in CI
- Concurrent workflow cancellation works

---

### TASK-025: Docker & Containerization

**Goal:** Fully containerize the framework for consistent execution across any environment.

**Steps:**
1. Create `Dockerfile` using `mcr.microsoft.com/playwright` as base:
   ```dockerfile
   FROM mcr.microsoft.com/playwright:v1.45.0-jammy
   WORKDIR /app
   COPY package*.json ./
   RUN npm ci
   COPY . .
   RUN npm run typecheck
   ENTRYPOINT ["npm", "run"]
   CMD ["test:smoke"]
   ```
2. Create `docker-compose.yml` with services:
    - `testsuite` — main test runner
    - `allure` — Allure report server
    - `otel-collector` — OpenTelemetry collector
3. Add `npm run docker:build` and `npm run docker:run` scripts
4. Create `scripts/docker-entrypoint.sh` for environment setup
5. Add Docker Hub CI publishing workflow
6. Update Jenkins pipeline to use Docker executor

**Acceptance Criteria:**
- `docker run besttester:latest test:smoke` passes
- Docker image size <2GB
- docker-compose brings up full stack including reporting

---

### TASK-026: Kubernetes Test Execution

**Goal:** Enable distributed test execution on Kubernetes for large-scale parallelization.

**Steps:**
1. Create `k8s/` directory with:
    - `job.yaml` — Kubernetes Job for running test suites
    - `configmap.yaml` — non-secret configuration
    - `secret.yaml.template` — secret template (no real secrets committed)
    - `rbac.yaml` — RBAC for pod access
2. Create `scripts/k8s-run.ts` — submits K8s Job and streams logs
3. Support dynamic worker scaling: `WORKER_COUNT` env var controls job parallelism
4. Add result collection: Jobs write to shared PVC, collector aggregates reports
5. Add Helm chart in `k8s/helm/` for easy deployment

**Acceptance Criteria:**
- Test job submits and completes successfully
- Results aggregated from all worker pods
- Helm chart installs cleanly on local k3d cluster

---

## Phase 8 — Documentation & Community

### TASK-027: Interactive Documentation Site

**Goal:** Replace static README with a searchable documentation site.

**Steps:**
1. Install `mintlify` or `docusaurus` and initialize in `docs/`
2. Create documentation sections:
    - Getting Started (5-minute quickstart)
    - Architecture Guide (with Mermaid diagrams)
    - Test Writing Guide (with examples for each test type)
    - AI Testing Guide (LLM assertions, judge system, vision)
    - CI/CD Integration Guide
    - API Reference (auto-generated from TypeDoc)
    - Contributing Guide
    - Changelog
3. Add TypeDoc to generate API docs from JSDoc comments
4. Add `docs.yml` GitHub Actions workflow to publish on push to main
5. Add search functionality

**Acceptance Criteria:**
- Documentation site deploys to GitHub Pages
- All major features documented with code examples
- API reference auto-generated and up-to-date

---

### TASK-028: Example Test Gallery

**Goal:** Provide a comprehensive gallery of real-world test patterns.

**Steps:**
1. Create `examples/` directory with annotated example tests:
    - `examples/ui/` — 10 UI test patterns (form submission, file upload, drag-drop, iframe, shadow DOM, etc.)
    - `examples/api/` — 5 API patterns (auth flows, pagination, error handling, retry, schema evolution)
    - `examples/ai/` — 5 AI test patterns (hallucination detection, semantic similarity, LLM judge, vision)
    - `examples/security/` — 3 security patterns (XSS, CSRF, auth bypass)
    - `examples/mobile/` — 3 mobile patterns (gesture, orientation, network throttling)
2. Each example file includes:
    - JSDoc header explaining the pattern
    - When to use this pattern
    - Common pitfalls
    - Link to documentation
3. All examples must pass `npm run test:smoke`

**Acceptance Criteria:**
- All 26+ example tests pass
- Each example has complete JSDoc documentation
- Examples linked from docs site

---

## Appendix: Quality Gates

Every PR must pass all gates before merge:

| Gate | Command | Threshold |
|------|---------|-----------|
| Lint | `npm run lint` | 0 errors |
| Type Check | `npm run typecheck` | 0 errors |
| Smoke Tests | `npm run test:smoke` | 100% pass |
| Security Audit | `npm run security:audit` | 0 high/critical |
| Mutation Score | `npm run test:mutation` | ≥70% killed |
| Bundle Size | `npm run build` | <50MB |

## Appendix: Naming Conventions

| Entity | Convention | Example |
|--------|-----------|---------|
| Test files | `kebab-case.spec.ts` | `employee-search.spec.ts` |
| Page Objects | `PascalCase.page.ts` | `EmployeeListPage.ts` |
| API Clients | `PascalCase.api.ts` | `EmployeeAPI.ts` |
| Fixtures | `camelCase.fixture.ts` | `authMatrix.fixture.ts` |
| Utilities | `camelCase.ts` | `dateFormatter.ts` |
| Test tags | `@kebab-case` | `@smoke`, `@regression`, `@e2e` |
| Env vars | `UPPER_SNAKE_CASE` | `TEST_ENV`, `LLM_PROVIDER` |

## Appendix: Commit Message Format

```
<type>(<scope>): <subject>

<body>

<footer>
```

Types: `feat`, `fix`, `refactor`, `test`, `docs`, `chore`, `perf`, `security`

Example: `feat(ai): add vision-based assertion with Claude Sonnet multimodal`
