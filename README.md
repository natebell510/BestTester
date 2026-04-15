# BestTester

[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](LICENSE)
[![Node](https://img.shields.io/badge/node-%3E%3D20.x-brightgreen)](https://nodejs.org)
[![Playwright](https://img.shields.io/badge/playwright-latest-blue)](https://playwright.dev)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.x-3178C6)](https://www.typescriptlang.org)
[![AWS Bedrock](https://img.shields.io/badge/AWS_Bedrock-AI_Testing-FF9900)](https://aws.amazon.com/bedrock/)
[![MCP](https://img.shields.io/badge/MCP-Model_Context_Protocol-purple)](https://modelcontextprotocol.io)

> **Production-grade, plug-and-play Playwright + TypeScript QE framework** for UI, API, AI-powered, security, i18n, and file-operations testing — with built-in CI/CD, AI agents, LLM-as-Judge evaluation, MCP server, Jenkins orchestration, Jira sync, and Slack reporting.

---

## Why BestTester?

| Advantage | Details |
|---|---|
| **Zero-config start** | Clone → `npm ci` → `npm run test:smoke` — works out of the box with OrangeHRM demo |
| **Full Page Object Model** | Every page extends `BasePage`; no inline selectors in spec files |
| **AI-native testing** | LLM-powered assertions, semantic similarity, AI locator fallback, hallucination detection |
| **LLM-as-Judge** | Multi-dimensional rubric scoring (relevance, accuracy, coherence, safety, faithfulness) via AWS Bedrock with anti-narcissistic-bias dual-model design |
| **MCP integration** | Model Context Protocol server (stdio + SSE) lets AI agents navigate, screenshot, run tests, and list specs |
| **7 CLI agents** | Code review, test healer, suggestion generator, Jenkins trigger, Jira sync, Slack bot, run-and-report — all from the terminal |
| **Security testing** | SQLi/XSS fuzzer, security header validator, OWASP ZAP proxy integration |
| **Multi-environment** | `TEST_ENV=dev|staging|prod` with per-environment `.env` files |
| **Multi-browser** | Chromium, Firefox, WebKit, mobile Chrome, mobile Safari via `ALL_BROWSERS=true` |
| **Mutation testing** | Stryker Mutator with configurable thresholds and HTML/JSON reports |
| **Full CI/CD** | 10 GitHub Actions workflows: CI, nightly, smoke, PR gate, security scan, mutation, AI tests, API tests, report publishing, Copilot review |
| **Jenkins pipeline** | Jenkinsfile with EC2 provisioning scripts, single-test trigger, remote job management |
| **Jira integration** | Auto-create/update/close bugs from test results, attach JUnit XML, link test executions to stories |
| **Slack notifications** | Real-time build results, failure alerts, and report links posted to Slack channels |
| **Allure + HTML reports** | Dual reporting with Allure (GitHub Pages auto-publish) and Playwright HTML |
| **Data factories** | Faker-powered factories with auto-teardown registry for clean test isolation |
| **File operations** | Download verification, Excel read/write, Word document generation, PDF parsing with content assertions |
| **i18n testing** | Locale switcher, RTL detection, string validation across `en`, `fr`, `ar`, `ja` |
| **Auth matrix** | Multi-role testing (Admin, Manager, Employee) with cached storage state |
| **Scaffolding CLI** | `scaffold:page`, `scaffold:test`, `scaffold:api` generators for consistent code structure |
| **Code quality** | ESLint + Prettier + Husky pre-commit/pre-push hooks + lint-staged |
| **Type safety** | Strict TypeScript with Zod schema validation for API responses |

---

## Architecture

```
┌──────────────────────────────────────────────────────────────────┐
│                          BestTester                              │
├──────────┬──────────┬──────────┬──────────┬──────────┬───────────┤
│ UI Tests │ API Tests│ AI Tests │ Security │  i18n    │ File-Ops  │
│(Playwright│(Axios/PW)│(Bedrock) │(ZAP/Fuzz)│(Locale)  │(xlsx/pdf) │
├──────────┴──────────┴──────────┴──────────┴──────────┴───────────┤
│  Page Object Model (src/pages/)    │  API Layer (src/api/)       │
│  AI Helpers (src/ai/)              │  Security (src/security/)   │
│  Fixtures (src/fixtures/)          │  Data Factories (src/data/) │
│  Utils (src/utils/)                │  i18n (src/i18n/)           │
├──────────────────────────────────────────────────────────────────┤
│  AI: LLM Client │ AI Assert │ Semantic Assert │ LLM Judge       │
│      AI Locator │ Embeddings (Titan) │ MCP Server (stdio/SSE)   │
├──────────────────────────────────────────────────────────────────┤
│  Agents: Code Review │ Test Healer │ Suggestions │ Jenkins       │
│          Jira Sync   │ Slack Bot   │ Run-and-Report              │
├──────────────────────────────────────────────────────────────────┤
│  CI/CD: GitHub Actions (10 workflows) │ Jenkins (EC2)            │
│  Reports: Allure │ Playwright HTML │ Slack │ JUnit XML │ Jira    │
└──────────────────────────────────────────────────────────────────┘
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
├── .github/workflows/      # 10 CI/CD pipelines (ci, nightly, smoke, pr-gate, security, mutation, ai, api, report, copilot-review)
├── agents/                  # 7 AI CLI agents (review, heal, suggest, jenkins, jira-sync, slack-bot, run-and-report)
├── config/                  # Playwright config, global-setup, per-environment .env files (dev/staging/prod)
├── mcp/                     # MCP server (stdio + SSE) and AI test generator client
├── mutation/                # Stryker mutation testing config and HTML/JSON reports
├── scripts/                 # Shell & TS utilities (Jenkins provisioning, Slack, scaffolding, EC2)
├── src/
│   ├── ai/                  # LLM client (Bedrock), AI assertions, semantic assertions, AI locator
│   │   └── judge/           # LLM-as-Judge: multi-rubric evaluation, safety checks, pairwise comparison
│   ├── api/                 # API client layer (BaseAPI + auth, employee, leave clients)
│   ├── auth/                # Multi-role auth (Admin/Manager/Employee), storage state caching
│   ├── components/          # Reusable UI components (form, modal, navbar, table)
│   ├── constants/           # Shared constants
│   ├── data/                # Test data factories (Faker) + teardown registry
│   ├── fixtures/            # Custom Playwright fixtures (base, api, auth)
│   ├── i18n/                # Locale switcher, RTL detection, string validator
│   ├── pages/               # Page Object Model (login, dashboard, employee, leave, reports)
│   ├── security/            # SQLi/XSS fuzzer, security header validator, OWASP ZAP client
│   ├── types/               # TypeScript interfaces (API responses, config, employee, Jira)
│   └── utils/               # Logger (Winston), Slack, Jenkins, Jira, file-handler, download-verifier, Excel, webhook
├── tests/
│   ├── ai/                  # AI/LLM response validation and content tests
│   ├── api/smoke/           # API smoke tests
│   ├── api/regression/      # API regression tests with Zod schema validation
│   ├── auth-matrix/         # Multi-role access control tests
│   ├── file-ops/            # File download, Excel, Word, PDF tests
│   ├── i18n/                # Internationalization smoke tests
│   ├── security/            # Security header and penetration tests
│   ├── ui/smoke/            # UI smoke suite (@smoke)
│   ├── ui/regression/       # UI regression suite (@regression)
│   ├── ui/e2e/              # End-to-end journeys (@e2e)
│   └── ui/visual/           # Visual regression tests (@visual)
├── Jenkinsfile              # Main Jenkins pipeline
├── Jenkinsfile.single-test  # Single-test Jenkins pipeline
└── README.md
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
npm run test:file-ops        # File operation tests
npm run test:security        # Security tests
npm run test:i18n            # Internationalization tests
npm run test:auth-matrix     # Multi-role auth tests

# By tag
npm run test:smoke           # @smoke
npm run test:regression      # @regression
npm run test:e2e             # @e2e
npm run test:visual          # @visual

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
| Tool | Description |
|---|---|
| `navigate` | Open URL, return title + screenshot |
| `screenshot` | Full-page screenshot of any URL |
| `get_page_text` | Extract visible text from a page |
| `run_test` | Execute a specific test file |
| `list_tests` | List all available test specs |

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
| AI/LLM | AWS Bedrock (Nova Pro, Claude Haiku, Titan Embeddings), OpenAI |
| MCP | @modelcontextprotocol/sdk (stdio + SSE) |
| API testing | Axios, Zod schema validation |
| Security | OWASP ZAP, custom SQLi/XSS fuzzer |
| Data | Faker.js, ExcelJS, pdf-parse, PDFKit, docx |
| CI/CD | GitHub Actions, Jenkins |
| Reporting | Allure, Playwright HTML, JUnit XML |
| Integrations | Jira (REST API), Slack (Webhooks + Web API), GitHub API |
| Code quality | ESLint, Prettier, Husky, lint-staged |
| Mutation testing | Stryker Mutator |
| Logging | Winston |
| Version control | simple-git |

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

`playwright`, `typescript`, `test-automation`, `e2e-testing`, `api-testing`, `ai-testing`, `llm-testing`, `aws-bedrock`, `page-object-model`, `playwright-typescript`, `playwright-framework`, `playwright-boilerplate`, `playwright-template`, `test-framework`, `qa-automation`, `qe-framework`, `selenium-alternative`, `ui-testing`, `visual-regression`, `security-testing`, `owasp-zap`, `mutation-testing`, `stryker`, `allure-report`, `ci-cd`, `github-actions`, `jenkins`, `jira-integration`, `slack-bot`, `mcp`, `model-context-protocol`, `llm-as-judge`, `ai-assertions`, `semantic-testing`, `hallucination-detection`, `cross-browser-testing`, `i18n-testing`, `data-factory`, `test-data-management`, `download-verification`, `excel-testing`, `pdf-testing`, `playwright-best-practices`, `playwright-page-object`, `playwright-fixtures`, `playwright-ci-cd`, `playwright-ai`, `bedrock-testing`, `nova-pro`, `claude-haiku`, `titan-embeddings`

---

## License

MIT
