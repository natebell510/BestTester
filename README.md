# BestTester

[![CI](https://github.com/your-org/BestTester/actions/workflows/ci.yml/badge.svg)](https://github.com/your-org/BestTester/actions/workflows/ci.yml)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](LICENSE)
[![Node](https://img.shields.io/badge/node-%3E%3D20.x-brightgreen)](https://nodejs.org)
[![Playwright](https://img.shields.io/badge/playwright-latest-blue)](https://playwright.dev)

> Production-grade, plug-and-play Playwright + TypeScript QE framework for UI, API, and AI-powered web application testing.

---

## Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                        BestTester                           │
├──────────────┬──────────────┬──────────────┬────────────────┤
│   UI Tests   │  API Tests   │   AI Tests   │  File-Ops Tests│
│  (Playwright)│  (Axios/PW)  │  (OpenAI)    │  (xlsx/pdf)    │
├──────────────┴──────────────┴──────────────┴────────────────┤
│              Page Object Model (src/pages/)                 │
│              API Layer        (src/api/)                    │
│              AI Helpers       (src/ai/)                     │
│              Fixtures         (src/fixtures/)               │
│              Utils            (src/utils/)                  │
├─────────────────────────────────────────────────────────────┤
│   Agents: Code Review │ Test Healer │ Suggestions │ Jenkins │
├─────────────────────────────────────────────────────────────┤
│   CI/CD: GitHub Actions (ci / nightly / smoke / report)     │
│   Reports: Allure │ Playwright HTML │ Slack │ JUnit XML      │
└─────────────────────────────────────────────────────────────┘
```

---

## Quick Start

```bash
# 1. Clone the repo
git clone https://github.com/your-org/BestTester.git && cd BestTester

# 2. Install dependencies
npm ci

# 3. Configure environment
cp .env.example .env
# Edit .env with your real credentials and API keys
# IMPORTANT: Never commit .env — it is gitignored

# 4. Install Playwright browsers
npm run setup

# 5. Run smoke tests
npm run test:smoke
```

---

## Directory Structure

```
BestTester/
├── .github/workflows/     # CI/CD pipelines (ci, nightly, smoke, report, security)
├── agents/                # AI CLI agents (review, heal, suggest, jenkins, slack, jira-sync)
├── config/                # Playwright config, global-setup, environment files
├── mcp/                   # MCP client/server for AI-driven test orchestration
├── mutation/              # Stryker mutation testing config and reports
├── scripts/               # Shell & TS utility scripts (Jenkins, Slack, scaffolding)
├── src/
│   ├── ai/               # LLM client, AI assertions, AI locator
│   ├── api/              # API client layer (BaseAPI + domain clients)
│   ├── auth/             # Authentication helpers and storage state
│   ├── components/       # Reusable UI component abstractions
│   ├── constants/        # Shared constants
│   ├── data/             # Test data factories and fixtures
│   ├── fixtures/         # Custom Playwright fixtures
│   ├── i18n/             # Internationalization helpers
│   ├── pages/            # Page Object Model classes
│   ├── security/         # Security testing utilities
│   ├── types/            # TypeScript interfaces and types
│   └── utils/            # Logger, Slack, Jenkins, file-handler, download-verifier
├── tests/
│   ├── ai/               # AI/LLM response validation tests
│   ├── api/smoke/        # API smoke tests
│   ├── api/regression/   # API regression tests with Zod schema validation
│   ├── auth-matrix/      # Multi-role authentication matrix tests
│   ├── file-ops/         # File download, Excel, Word, PDF tests
│   ├── i18n/             # Internationalization tests
│   ├── security/         # Security and penetration tests
│   ├── ui/smoke/         # Smoke test suite (@smoke)
│   ├── ui/regression/    # UI regression tests (@regression)
│   ├── ui/e2e/           # Full end-to-end journeys (@e2e)
│   └── ui/visual/        # Visual regression tests (@visual)
├── reports/               # Generated reports (gitignored)
├── .env.example           # Environment variable template (safe to commit)
└── README.md
```

---

## Running Tests

```bash
# All tests
npm test

# By type
npm run test:ui
npm run test:api
npm run test:ai
npm run test:file-ops

# By tag
npm run test:smoke
npm run test:regression

# Visual tests
npm run test:visual

# Headed / debug
npm run test:headed
npm run test:debug
```

## Running Per Environment

```bash
# Staging (default)
TEST_ENV=staging npm test

# Dev
TEST_ENV=dev npm test

# Production
TEST_ENV=prod npm test
```

---

## Adding a New Page Object

1. Create `src/pages/my-feature.page.ts` extending `BasePage`
2. Define locators as private class fields using `getByRole`, `getByTestId`, or CSS selectors
3. Implement public async methods for each user action
4. Add the page to `src/fixtures/base.fixture.ts`

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

---

## AI Agents

### Code Review Agent
```bash
npm run agent:review -- --file tests/ui/login.spec.ts
npm run agent:review -- --file tests/ui/login.spec.ts --slack
```

### Test Healer Agent
```bash
npm run agent:heal -- --test-result reports/playwright-report/results.json
```

### Suggestion Agent
```bash
npm run agent:suggest -- --page src/pages/employee.page.ts
# Output: reports/suggestions/test-suggestions.md
```

### Jenkins Trigger Agent
```bash
npm run agent:jenkins -- --job playwright-tests --params ENV=staging
npm run agent:jenkins -- --job playwright-tests --build 42
npm run agent:jenkins -- --job playwright-tests --build 42 --logs
```

---

## Slack Bot Configuration

1. Create a Slack Incoming Webhook at https://api.slack.com/apps
2. Add `SLACK_WEBHOOK_URL` to your `.env` and GitHub Actions secrets
3. The bot posts automatically at end of CI and nightly runs
4. Manual trigger: `npx ts-node agents/slack-bot-agent.ts --report reports/playwright-report/results.json`

---

## Jenkins Integration

1. Set `JENKINS_URL`, `JENKINS_USERNAME`, `JENKINS_TOKEN` in `.env`
2. Use the Jenkins agent CLI or call utilities directly from test hooks:

```typescript
import { triggerJob, pollUntilComplete } from '@utils/jenkins';

test.beforeAll(async () => {
  const queueId = await triggerJob('deploy-staging');
  // poll for build number then:
  await pollUntilComplete('deploy-staging', buildNumber);
});
```

---

## Reporting

```bash
# Allure report
npm run report:allure

# Playwright HTML report
npm run report:playwright
```

Allure report is auto-published to GitHub Pages on every nightly run via `report.yml`.

---

## Contributing

1. Fork the repo and create a feature branch: `git checkout -b feat/my-feature`
2. Follow the existing code style (ESLint + Prettier enforced)
3. All new tests must use Page Object Model — no inline selectors in spec files
4. No `page.waitForTimeout()` — use Playwright auto-waiting
5. Every test file must have a JSDoc block comment with `@file`, `@description`, `@tags`
6. Run `npm run lint` and `npm run test:smoke` before opening a PR
7. Open a PR against `develop` — smoke tests run automatically

---

## License

MIT
