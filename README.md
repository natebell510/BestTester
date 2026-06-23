# BestTester — Gold-Standard QA Platform

[![License: Apache 2.0](https://img.shields.io/badge/License-Apache_2.0-blue.svg)](LICENSE)
[![Node](https://img.shields.io/badge/node-%3E%3D20.x-brightgreen)](https://nodejs.org)
[![Playwright](https://img.shields.io/badge/playwright-latest-blue)](https://playwright.dev)
[![TypeScript](https://img.shields.io/badge/TypeScript-strict-3178C6)](https://www.typescriptlang.org)
[![Claude API](https://img.shields.io/badge/Claude-AI_Testing-000000)](https://claude.ai)
[![Docker](https://img.shields.io/badge/Docker-Containerized-2496ED)](https://www.docker.com)
[![Kubernetes](https://img.shields.io/badge/Kubernetes-Distributed-326CE5)](https://kubernetes.io)
[![Helm](https://img.shields.io/badge/Helm-Charts-0F1689)](https://helm.sh)

> **The industry-leading, production-grade Playwright + TypeScript QE framework** for UI, API, mobile, and AI testing at scale — with distributed Kubernetes execution, Claude vision-based assertions, interactive documentation, comprehensive example gallery, Docker containerization, GitHub Actions optimization, and complete observability via OpenTelemetry.

---

## Why BestTester?

| Advantage | Details |
|---|---|
| **Zero-config start** | Clone → `npm ci` → `npm run test:smoke` — works out of the box |
| **Full Page Object Model** | Every page extends `BasePage`; no inline selectors in spec files |
| **Claude AI Testing** | Vision-based assertions, semantic similarity, test generation, hallucination detection |
| **Interactive Docs** | Searchable documentation with getting started, guides, architecture, and 26+ examples |
| **Example Gallery** | Production-ready test patterns for UI, API, security, AI, and mobile testing |
| **Distributed K8s** | Kubernetes Job orchestration with Helm charts, dynamic worker scaling, result aggregation |
| **Docker Ready** | Multi-stage builds, docker-compose stack with Allure + Jaeger, SBOM generation |
| **CI/CD Optimized** | GitHub Actions with npm caching, Playwright browser cache, matrix sharding, change detection |
| **Observability** | OpenTelemetry tracing, Jaeger UI, distributed metrics, structured JSON logging |
| **Security testing** | OWASP Top 10 coverage, XSS/CSRF prevention, auth bypass detection, SQL injection fuzzing |
| **Multi-environment** | `TEST_ENV=dev\|staging\|prod` with per-environment `.env` files |
| **Mobile testing** | Dedicated mobile test suite with device emulation (Pixel 5, iPhone 13, iPad), touch/swipe helpers |
| **Multi-browser** | Chromium, Firefox, WebKit, mobile Chrome, mobile Safari via `ALL_BROWSERS=true` |
| **Mutation testing** | Stryker Mutator with configurable thresholds and HTML/JSON reports |
| **Data management** | Fluent builders, seed management with idempotent application, cleanup registry with audit trails |
| **Allure + HTML reports** | Dual reporting with Allure (GitHub Pages auto-publish) and Playwright HTML |
| **Code quality** | ESLint + Prettier + Husky + Gitleaks secret scanning + pre-commit hooks |
| **Type safety** | Strict TypeScript with Zod schema validation for API responses and requests |
| **Scaffolding CLI** | `scaffold:page`, `scaffold:test`, `scaffold:api` generators for consistent code structure |
| **File operations** | Download verification, Excel read/write, Word document generation, PDF parsing |
| **i18n testing** | Locale switcher, RTL detection, string validation across `en`, `fr`, `ar`, `ja` |
| **Auth matrix** | Multi-role testing (Admin, Manager, Employee) with cached storage state |
| **Performance testing** | Core Web Vitals measurement, performance budgets, trend tracking, regression detection |
| **Accessibility testing** | WCAG 2.2 AA compliance, axe-core integration, semantic markup validation |

---

## Architecture

```
┌────────────────────────────────────────────────────────────────────────────┐
│                    BestTester — Gold-Standard QA Platform                  │
├─────────┬─────────┬─────────┬─────────┬─────────┬─────────┬──────────┬────────┤
│UI Tests │API Tests│ Mobile  │AI Tests │Security │  i18n   │ File-Ops │ Perf   │
│(PW)     │(REST)   │(Emulate)│(Claude) │(OWASP)  │(Locale) │(xlsx/pdf)│(CWV)   │
├────────────────────────────────────────────────────────────────────────────┤
│  Page Objects (src/pages/)        │  API Clients (src/api/)         │
│  Mobile Pages (src/mobile/)       │  Security (src/security/)       │
│  AI Integration (src/ai/)         │  Data Builders (src/data/)      │
│  Fixtures (src/fixtures/)         │  i18n (src/i18n/)               │
├────────────────────────────────────────────────────────────────────────────┤
│  AI: Claude Vision │ Semantic Matching │ Test Generation │ Seed Mgr      │
│      Cleanup Registry │ Data Builders (Zod validated)                    │
├────────────────────────────────────────────────────────────────────────────┤
│  Execution: GitHub Actions (Optimized) │ Kubernetes (Distributed)        │
│  Infrastructure: Docker (Multi-stage) │ Helm Charts │ Docker Compose    │
├────────────────────────────────────────────────────────────────────────────┤
│  Reports: Allure │ Playwright HTML │ OTel Traces │ Jaeger │ Metrics      │
│  Observability: OpenTelemetry Tracing │ Winston Structured Logging       │
└────────────────────────────────────────────────────────────────────────────┘
```

---

## Quick Start

```bash
# 1. Clone
git clone https://github.com/your-org/BestTester.git && cd BestTester

# 2. Install
npm ci

# 3. Configure
cp .env.example .env   # edit with your credentials — NEVER commit .env

# 4. Install browsers
npm run setup

# 5. Run smoke tests
npm run test:smoke
```

---

## Directory Structure

```
BestTester/
├── .github/workflows/      # CI/CD: ci, smoke, docker-publish, docs deployment
├── config/                 # Playwright configs, global setup, per-environment .env (dev/staging/prod)
├── docs/                   # Interactive documentation (getting started, guides, examples)
│   ├── getting-started/    # quickstart, installation, first-test
│   ├── guides/             # architecture, test-writing, ai-testing, ci-cd, kubernetes
│   └── examples/           # linked to example gallery
├── examples/               # 26+ production-ready test patterns
│   ├── ui/                 # form-validation, file-upload, interactions, responsive
│   ├── api/                # error-handling, authentication, pagination
│   ├── ai/                 # vision-testing, semantic-similarity
│   ├── security/           # xss-prevention, csrf-protection, auth-bypass
│   └── README.md           # example gallery with learning path
├── k8s/                    # Kubernetes configuration
│   ├── job.yaml            # Kubernetes Job manifest
│   ├── configmap.yaml      # Non-secret configuration
│   ├── rbac.yaml           # ServiceAccount, Role, RoleBinding
│   ├── secret.yaml.template # Secrets template (not committed)
│   ├── helm/               # Helm chart for deployment
│   │   ├── Chart.yaml
│   │   ├── values.yaml
│   │   └── templates/      # job, configmap, secret, pvc, rbac
│   └── DEPLOYMENT_GUIDE.md # Complete K8s deployment guide
├── scripts/                # Utility scripts
│   ├── k8s-run.ts          # Kubernetes job runner with log streaming
│   ├── create-test.ts      # Interactive test generation CLI
│   └── other scaffolding scripts
├── src/
│   ├── ai/                 # Claude API integration, vision, semantic matching
│   ├── api/                # REST/GraphQL clients with Zod validation
│   ├── auth/               # Multi-role auth, storage state caching
│   ├── data/               # Fluent builders, seed manager, cleanup registry
│   ├── fixtures/           # Custom Playwright fixtures
│   ├── helpers/            # Wait helpers, formatters, utils
│   ├── observability/      # OpenTelemetry tracing, metrics
│   ├── page-objects/       # Page Object Model hierarchy
│   ├── mobile/             # Mobile page objects
│   ├── types/              # TypeScript interfaces
│   └── utils/              # Logger (Winston), file handlers, etc.
├── tests/                  # Comprehensive test suites
│   ├── ui/                 # UI tests (smoke, regression, visual, e2e)
│   ├── api/                # API tests with schema validation
│   ├── ai/                 # AI/LLM tests
│   ├── security/           # Security/OWASP testing
│   ├── mobile/             # Mobile device emulation
│   ├── performance/        # Performance & Core Web Vitals
│   ├── a11y/               # Accessibility (WCAG 2.2 AA)
│   ├── data/               # Data management tests
│   └── flakiness/          # Flaky test detection & quarantine
├── Dockerfile              # Multi-stage build with Playwright base
├── docker-compose.yml      # Full stack: app, testsuite, allure, otel, jaeger
├── otel-collector-config.yml # OpenTelemetry collector configuration
├── package.json            # 50+ npm scripts for all testing scenarios
└── README.md               # This file
```

---

## Running Tests

```bash
# All tests
npm test

# By type
npm run test:ui              # UI tests
npm run test:api             # API tests
npm run test:ai              # AI/LLM tests
npm run test:mobile          # Mobile device emulation tests
npm run test:file-ops        # File operation tests
npm run test:security        # Security tests
npm run test:i18n            # Internationalization tests
npm run test:auth-matrix     # Multi-role auth tests
npm run test:contracts       # Consumer-driven contract tests (Pact)
npm run test:a11y            # Accessibility tests (WCAG 2.2 AA)
npm run test:performance     # Performance & Core Web Vitals tests

# By tag
npm run test:smoke           # @smoke
npm run test:regression      # @regression
npm run test:e2e             # @e2e
npm run test:visual          # @visual
npm run test:a11y            # @a11y
npm run test:performance     # @performance

# Debug modes
npm run test:headed          # Headed browser
npm run test:debug           # Playwright inspector

# Mutation testing
npm run test:mutation        # Stryker mutation analysis
```

### Per Environment

```bash
TEST_ENV=dev npm test
TEST_ENV=staging npm test
TEST_ENV=prod npm test
```

### Cross-Browser

```bash
ALL_BROWSERS=true npm test   # Chromium + Firefox + WebKit + mobile Chrome + mobile Safari
```

### Mobile Testing

```bash
npm run test:mobile                              # Pixel 5 + iPhone 13
npm run test:mobile -- --project mobile-chrome   # Android only
npm run test:mobile -- --project mobile-safari   # iOS only
MOBILE_TABLET=true npm run test:mobile           # Include iPad
npm run test:mobile -- --headed                  # Watch execution
```

---

## AI-Powered Testing

### LLM Client (AWS Bedrock)
Built on AWS Bedrock Converse API with Amazon Nova Pro as the default model. Supports chat, summarization, and embeddings (Titan Embed v2).

### AI Assertions
- **Semantic similarity** — cosine similarity on Titan embeddings with configurable threshold
- **Hallucination detection** — keyword-based grounding checks
- **AI locator fallback** — sends DOM snapshot to LLM to resolve broken selectors

### LLM-as-Judge
Multi-dimensional evaluation system with 6 built-in rubrics:

| Rubric | Use Case | Pass Threshold |
|---|---|---|
| Standard | General response quality | 3.5 |
| RAG Faithfulness | Grounding in source documents | 4.0 |
| Customer Support | Empathy, accuracy, actionability | 3.5 |
| Code Generation | Correctness, security, structure | 4.0 |
| Summarization | Coverage, conciseness, faithfulness | 3.5 |
| Toxicity & Safety | Hate speech, PII, prompt injection | 4.5 |

Scores across 6 dimensions: relevance, accuracy, coherence, safety, faithfulness, instruction adherence.

**Anti-narcissistic bias**: Primary model (Nova Pro) and judge model (Claude Haiku) use different architectures to prevent self-evaluation bias. Borderline scores (2–3) trigger automatic strict re-evaluation.

### Semantic Assertions API

```typescript
import { semanticExpect } from '@ai/semantic-assert';

await semanticExpect(response).toBeRelevantTo(prompt);
await semanticExpect(response).toBeGroundedIn(sourceContext);
await semanticExpect(response).toBeSafe();
await semanticExpect(response).toNotHallucinate(knownFacts);
await semanticExpect(response).toBeBetterThan(alternativeResponse);
await semanticExpect(response).toHaveScore({ min: 4.0, rubric: RUBRICS.CODE_GENERATION });
```

---

## MCP Server

Model Context Protocol server for AI-driven test orchestration. Supports both `stdio` and `SSE` transports.

```bash
npm run mcp:server           # stdio mode
npm run mcp:server:sse       # SSE mode on port 3001
npm run mcp:generate         # AI test generator client
```

**Available MCP tools:**
| Tool | Description | Example |
|---|---|---|
| `navigate` | Open URL, return title + screenshot | `navigate({url: "https://example.com"})` |
| `screenshot` | Full-page screenshot of any URL | `screenshot({url: "https://example.com"})` |
| `get_page_text` | Extract visible text from a page | `get_page_text({url: "https://example.com"})` |
| `run_test` | Execute a specific test file | `run_test({testFile: "tests/ui/login.spec.ts"})` |
| `list_tests` | List all available test specs | `list_tests({})` |
| `generate_test_from_description` | Generate complete test file from natural language feature description | `generate_test_from_description({description: "Test user login flow"})` |
| `generate_page_object` | Analyze a URL and generate a full Page Object Model class | `generate_page_object({url: "https://example.com/login"})` |
| `generate_api_test` | Generate API test suite from OpenAPI 3.0 specification | `generate_api_test({openapi_spec_url: "https://api.example.com/openapi.json"})` |
| `analyze_test_coverage` | Analyze Page Object Model and identify coverage gaps | `analyze_test_coverage({page_object_content: "export class LoginPage { ... }"})` |

**Test Generator Examples:**

Generate a complete login test:
```javascript
const result = await client.callTool('generate_test_from_description', {
  description: 'User logs in with email and password, verifies dashboard appears'
});
// Returns TypeScript test file ready to run with npm run test:smoke
```

Generate a Page Object Model by analyzing a live page:
```javascript
const pom = await client.callTool('generate_page_object', {
  url: 'https://orangehrm-demo.com/web/index.php/auth/login'
});
// Returns class LoginPage with all selectors and helper methods
```

Generate API test suite from spec:
```javascript
const apiTest = await client.callTool('generate_api_test', {
  openapi_spec_url: 'https://api.example.com/v1/openapi.json'
});
// Returns complete test suite validating all endpoints and schemas
```

Identify test coverage gaps:
```javascript
const gaps = await client.callTool('analyze_test_coverage', {
  page_object_content: pomClassContent
});
// Returns array of missing test scenarios and accessibility checks
```

---

## AI Agents

### Code Review Agent
```bash
npm run agent:review -- --file tests/ui/login.spec.ts
npm run agent:review -- --file tests/ui/login.spec.ts --slack   # post to Slack
```

### Test Healer Agent
Auto-detects broken locators in failed tests and suggests AI-powered fixes on a new git branch.
```bash
npm run agent:heal -- --test-result reports/playwright-report/results.json
```

### Suggestion Agent
Analyzes page objects + existing test coverage and generates 5–10 new test case suggestions.
```bash
npm run agent:suggest -- --page src/pages/employee.page.ts
```

### Jenkins Trigger Agent
```bash
npm run agent:jenkins -- --job playwright-tests --params ENV=staging
npm run agent:jenkins -- --job playwright-tests --build 42
npm run agent:jenkins -- --job playwright-tests --build 42 --logs
```

### Jira Sync Agent
Auto-creates/updates/closes Jira bugs from test results. Attaches JUnit XML and links test executions.
```bash
npm run agent:jira -- --build latest
npm run agent:jira -- --junit reports/playwright-report/junit.xml --build 42
npm run agent:jira -- --junit reports/playwright-report/junit.xml --dry-run
```

### Run-and-Report Agent
Full workflow: trigger Jenkins → stream console → download artifacts → sync to Jira → notify Slack.
```bash
npm run agent:run-and-report
npm run agent:run-and-report -- --suite smoke --jira-key SCRUM-5
npm run agent:run-and-report -- --suite regression --jira-key SCRUM-5 --dry-run
```

### Slack Bot Agent
```bash
npx ts-node agents/slack-bot-agent.ts --report reports/playwright-report/results.json
```

---

## Contract Testing

Consumer-driven contract testing using Pact to catch API breaking changes before they reach E2E tests.

**Available contracts:**
| Contract | Endpoints | Tests |
|---|---|---|
| `auth.contract.spec.ts` | Login, token validation, auth errors | 3 |
| `employee.contract.spec.ts` | CRUD operations on employees | 5 |
| `leave.contract.spec.ts` | Leave types, requests, validation | 4 |

**Running contract tests:**
```bash
# Run all contracts
npm run test:contracts

# Run specific contract
npm run test:contracts -- --grep "Employee API Contract"

# Publish to Pact broker (CI only)
PACT_BROKER_URL=https://pact-broker.example.com npm run test:contracts
```

**Pact configuration** (`pact.config.ts`):
- Consumer: `BestTester`
- Providers: OrangeHRM-Auth, OrangeHRM-Employee, OrangeHRM-Leave
- Broker: self-hosted or PactFlow
- Pact files stored in: `./pacts/`

**Workflow:**
1. Consumer runs contract tests → generates Pact files
2. Pact files published to broker
3. Provider verifies contracts against its implementation
4. CI blocks deployment if verification fails

---

## Accessibility Testing

Comprehensive WCAG 2.2 AA compliance testing using Axe and Playwright.

**AccessibilityChecker features:**
- Full page scans with detailed violation reports
- Component-level accessibility checks
- Color contrast validation
- WCAG compliance mapping
- Automated report generation

**Running accessibility tests:**
```bash
# Run all a11y tests
npm run test:a11y

# Run specific page accessibility
npm run test:a11y -- --grep "Login Page"

# Generate detailed report
npm run test:a11y -- --reporter=html
```

**Usage in tests:**
```typescript
import { AccessibilityChecker } from '../../src/a11y/accessibility-checker';

const a11yChecker = new AccessibilityChecker();

// Check entire page (WCAG 2.2 AA)
const result = await a11yChecker.checkPage(page, {
  standards: 'wcag22aa',
  disableRules: ['skip-link'],
});

// Check specific component
const componentResult = await a11yChecker.checkComponent(page, '[role="main"]');

// Check color contrast only
const contrastIssues = await a11yChecker.checkColorContrast(page);

// Generate report
const report = a11yChecker.generateA11yReport(result.violations);
```

**Supported standards:**
- WCAG 2.0 Level A/AA
- WCAG 2.1 Level A/AA
- WCAG 2.2 Level A/AA (recommended)

**Test coverage:**
- [x] Login page a11y tests
- [x] Dashboard a11y tests
- [ ] Employee list a11y tests
- [ ] Hire flow a11y tests

---

## Performance Testing

Core Web Vitals monitoring with configurable performance budgets.

**Metrics collected:**
- **LCP** (Largest Contentful Paint): page load speed
- **INP** (Interaction to Next Paint): responsiveness
- **CLS** (Cumulative Layout Shift): visual stability
- **TTFB** (Time to First Byte): server responsiveness
- **FCP** (First Contentful Paint): perceived load speed

**Performance budgets by environment:**
| Metric | Dev | Staging | Prod |
|--------|-----|---------|------|
| LCP Good | <3000ms | <2500ms | <2000ms |
| LCP Fail | >6000ms | >5000ms | >4000ms |
| CLS Good | <0.1 | <0.1 | <0.1 |
| TTFB Good | <800ms | <800ms | <600ms |

**Running performance tests:**
```bash
# Run all performance tests
npm run test:performance

# Run with custom environment
TEST_ENV=prod npm run test:performance

# Generate HTML performance report
npm run test:performance && open reports/performance-report.html
```

**Usage in tests:**
```typescript
import { PerformanceCollector } from '../../src/performance/performance-collector';
import { PerformanceBudget } from '../../src/performance/performance-budget';

const collector = new PerformanceCollector();
const budget = new PerformanceBudget();

await page.goto(url);
await collector.waitForMetricsStability(page);
const metrics = await collector.collectMetrics(page);

const violations = budget.checkMetrics(metrics, 'prod');
expect(violations.filter(v => v.status === 'fail')).toHaveLength(0);
```

**Historical trend tracking:**
- Last 10 runs stored in `reports/performance-history.json`
- Trend analysis via `PerformanceReporter.getTrendData(metric)`
- HTML report auto-generated after each test run

---

## Visual Regression Testing

Advanced visual regression with per-environment and per-browser baseline management.

**Features:**
- **Environment-based baselines**: dev/staging/prod stored separately
- **Browser-based baselines**: chromium/firefox/webkit stored separately
- **Dynamic content masking**: auto-mask dates, usernames, timestamps
- **Baseline metadata tracking**: store snapshots with timestamps and descriptions
- **Cleanup utilities**: delete old baselines, maintenance tools

**Baseline organization:**
```
reports/baselines/
├── login-page-dev-chromium.png
├── login-page-staging-chromium.png
├── login-page-prod-chromium.png
├── login-page-dev-firefox.png
├── metadata-dev-chromium.json
└── metadata-prod-chromium.json
```

**Running visual tests:**
```bash
# Run visual tests
npm run test:visual

# Update/regenerate baselines
npm run visual:update

# For specific environment
TEST_ENV=prod npm run test:visual

# For specific browser
BROWSER_NAME=firefox npm run test:visual
```

**Usage in tests:**
```typescript
import { BaselineManager } from '../../src/visual/baseline-manager';

const baselineManager = new BaselineManager('prod', 'chromium');

// Save new baseline
await baselineManager.saveBaseline(page, 'login-page', 'Production login baseline');

// Load baseline (returns path if exists)
const baselinePath = baselineManager.loadBaseline('login-page');

// Update baseline metadata
baselineManager.updateBaseline('login-page', 'Updated description');

// List all baselines
const baselines = baselineManager.listBaselines();

// Get statistics
const stats = baselineManager.getStatistics();
// Returns: { totalBaselines, byEnvironment, byBrowser }

// Clean old baselines
const deleted = await baselineManager.clearOldBaselines(30); // days
```

**Diff reporting:**
- Visual diffs auto-generated with max pixel threshold
- PR comments show side-by-side comparisons
- Allure integration embeds diff images in reports

---

## Mobile Testing

Dedicated mobile test suite using Playwright device emulation against [SauceDemo](https://www.saucedemo.com) — a free, publicly available e-commerce demo app.

**Device profiles:**
| Project | Device | Viewport | Touch |
|---|---|---|---|
| `mobile-chrome` | Pixel 5 | 393×851 | ✓ |
| `mobile-safari` | iPhone 13 | 390×844 | ✓ |
| `tablet` | iPad (gen 7) | 810×1080 | ✓ |

**Mobile page objects** extend `BaseMobilePage` which provides:
- `swipe(direction, distance)` — simulate touch swipe gestures
- `tap(selector)` — touch tap interaction
- `isResponsive()` — assert viewport is mobile-sized (<768px)
- `getViewportSize()` — retrieve current device dimensions

**Test coverage:**
- Login flows (valid, invalid, locked user)
- Product browsing and cart management
- Responsive layout assertions
- Burger menu navigation
- Touch scroll interactions

### Adding a Mobile Page Object

```typescript
import { Page } from '@playwright/test';
import { BaseMobilePage } from './base-mobile.page';

export class MobileCheckoutPage extends BaseMobilePage {
  private readonly firstNameInput = this.page.locator('[data-test="firstName"]');

  constructor(page: Page) { super(page); }

  async fillName(name: string): Promise<void> { await this.firstNameInput.fill(name); }
}
```

Then register in `src/fixtures/mobile.fixture.ts`.

---

## Security Testing

- **SQLi/XSS fuzzer** — automated form fuzzing with common injection payloads, validates no 500 errors or reflected XSS
- **Security header validator** — asserts CSP, HSTS (≥1 year), X-Frame-Options, X-Content-Type-Options, Referrer-Policy
- **OWASP ZAP integration** — proxy mode for passive/active scanning with spider and alert retrieval

---

## CI/CD Pipelines

| Workflow | Trigger | What it does |
|---|---|---|
| `ci.yml` | Push / PR | Lint → smoke tests → Playwright report → Slack |
| `nightly.yml` | Cron 2 AM UTC | Full regression → Allure report → Slack → auto-create GitHub issue on failure |
| `smoke.yml` | Manual / reusable | Smoke suite only |
| `pr-gate.yml` | Pull request | Quality gate checks |
| `api-tests.yml` | Manual / schedule | API smoke + regression |
| `ai-tests.yml` | Manual / schedule | AI/LLM validation tests |
| `security-scan.yml` | Manual / schedule | Security test suite |
| `mutation.yml` | Manual | Stryker mutation testing |
| `report.yml` | Post-nightly | Publish Allure to GitHub Pages |
| `copilot-review.yml` | PR | AI-assisted code review |

### Jenkins

- `Jenkinsfile` — full pipeline with parameterized suite selection
- `Jenkinsfile.single-test` — run a single test file remotely
- EC2 provisioning scripts for Jenkins server setup
- Remote job creation and configuration utilities

---

## Reporting

```bash
npm run report:allure        # Generate + open Allure report
npm run report:playwright    # Open Playwright HTML report
```

Reports are generated in 4 formats: HTML, JSON, JUnit XML, and Allure. Allure is auto-published to GitHub Pages on nightly runs.

---

## Scaffolding

```bash
npm run scaffold:page -- --name MyFeature     # → src/pages/my-feature.page.ts + test stub
npm run scaffold:test -- --name my-feature    # → tests/ui/regression/my-feature.spec.ts
npm run scaffold:api  -- --name my-resource   # → src/api/my-resource.api.ts
```

---

## Adding a New Page Object

```typescript
import { Page } from '@playwright/test';
import { BasePage } from './base.page';

export class MyFeaturePage extends BasePage {
  private readonly submitButton = this.page.getByRole('button', { name: 'Submit' });

  constructor(page: Page) { super(page); }

  async goto(): Promise<void> { await this.navigate('/my-feature'); }
  async submit(): Promise<void> { await this.submitButton.click(); }
}
```

Then register in `src/fixtures/base.fixture.ts`.

---

## Tech Stack

| Category | Technologies |
|---|---|
| Test framework | Playwright, TypeScript |
| Mobile testing | Playwright device emulation (Pixel 5, iPhone 13, iPad) |
| AI/LLM | AWS Bedrock (Nova Pro, Claude Haiku, Titan Embeddings), OpenAI |
| MCP | @modelcontextprotocol/sdk (stdio + SSE) |
| API testing | Axios, Zod schema validation |
| Security | OWASP ZAP, custom SQLi/XSS fuzzer |
| Data | Faker.js, ExcelJS, pdf-parse, PDFKit, docx |
| CI/CD | GitHub Actions, Jenkins |
| Reporting | Allure, Playwright HTML, JUnit XML |
| Integrations | Jira (REST API), Slack (Webhooks + Web API), GitHub API, 1Password CLI |
| Code quality | ESLint, Prettier, Husky, lint-staged |
| Mutation testing | Stryker Mutator |
| Logging | Winston |
| Version control | simple-git |
| Secret management | 1Password CLI (`op`) |

---

## 1Password Integration

Securely manage secrets via the [1Password CLI](https://developer.1password.com/docs/cli/get-started) instead of storing them in `.env`.

1. Install the 1Password CLI (`op`): https://developer.1password.com/docs/cli/get-started
2. Create a [Service Account](https://developer.1password.com/docs/service-accounts) and paste the token into `OP_SERVICE_ACCOUNT_TOKEN` in `.env`
3. Use the `OnePassword` utility in global-setup, fixtures, or scripts:

```typescript
import { OnePassword } from '@utils/one-password';

const op = new OnePassword('BestTester'); // vault name

// Inject all fields from a vault item into process.env
op.injectEnv('BestTester Secrets');

// Or map specific fields to env vars
op.injectEnv('BestTester Secrets', {
  SLACK_BOT_TOKEN: 'Slack Bot Token',
  JIRA_API_TOKEN: 'Jira API Token',
  AWS_SECRET_ACCESS_KEY: 'AWS Secret Key',
});

// Create a new secret
op.createItem('API Credentials', { apiKey: 'sk-abc123' });

// Update an existing field
op.setField('BestTester Secrets', 'GitHub Token', 'ghp_new...');
```

| Method | Description |
|---|---|
| `getField(item, field)` | Read a single secret value |
| `getItem(item)` | Read all fields from an item |
| `listItems()` | List all vault items |
| `createItem(title, fields)` | Create a new item |
| `setField(item, field, value)` | Update a field on an existing item |
| `deleteItem(item)` | Delete an item |
| `injectEnv(item, mapping?)` | Bulk-inject fields into `process.env` |
| `whoAmI()` | Verify CLI authentication |

---

## Contributing

See [CONTRIBUTING.md](CONTRIBUTING.md) for full guidelines.

1. Fork and create a feature branch: `git checkout -b feat/my-feature`
2. Follow ESLint + Prettier rules (enforced by Husky pre-commit hooks)
3. All tests must use Page Object Model — no inline selectors in spec files
4. No `page.waitForTimeout()` — use Playwright auto-waiting
5. Every test file must have a JSDoc block with `@file`, `@description`, `@tags`
6. Run `npm run lint && npm run typecheck && npm run test:smoke` before opening a PR
7. Open a PR against `develop`

---

## Keywords

`playwright`, `typescript`, `test-automation`, `e2e-testing`, `api-testing`, `ai-testing`, `llm-testing`, `aws-bedrock`, `page-object-model`, `playwright-typescript`, `playwright-framework`, `playwright-boilerplate`, `playwright-template`, `test-framework`, `qa-automation`, `qe-framework`, `selenium-alternative`, `ui-testing`, `visual-regression`, `security-testing`, `owasp-zap`, `mutation-testing`, `stryker`, `allure-report`, `ci-cd`, `github-actions`, `jenkins`, `jira-integration`, `slack-bot`, `mcp`, `model-context-protocol`, `llm-as-judge`, `ai-assertions`, `semantic-testing`, `hallucination-detection`, `cross-browser-testing`, `i18n-testing`, `mobile-testing`, `device-emulation`, `responsive-testing`, `touch-testing`, `data-factory`, `test-data-management`, `download-verification`, `excel-testing`, `pdf-testing`, `playwright-best-practices`, `playwright-page-object`, `playwright-fixtures`, `playwright-ci-cd`, `playwright-ai`, `bedrock-testing`, `nova-pro`, `claude-haiku`, `titan-embeddings`

---

## License

Apache License 2.0 — see [LICENSE](LICENSE) for details.

You are free to use, modify, and distribute this framework in personal and commercial projects. Contributions are welcome and will be licensed under the same terms.
