# Installation

## System Requirements

- **Node.js**: 20.x or higher
- **npm**: 9.x or higher (included with Node.js)
- **OS**: Windows, macOS, or Linux
- **RAM**: Minimum 4GB (8GB recommended for parallel testing)
- **Disk Space**: 2GB for dependencies and browser binaries

## Installation Steps

### 1. Clone the Repository

```bash
git clone https://github.com/yourusername/besttester.git
cd besttester
```

### 2. Install Dependencies

```bash
npm install
```

This installs:
- Playwright browsers and dependencies
- TypeScript compiler
- ESLint and code formatters
- Testing libraries
- All dev and runtime dependencies

### 3. Install Browser Dependencies

```bash
npm run setup
```

This installs system packages required by Playwright (optional on macOS, required on Linux/Windows).

### 4. Verify Installation

```bash
npm run typecheck
npm run lint
npm run test:smoke
```

All commands should complete without errors.

## Installation via Docker

If you prefer an isolated environment:

```bash
docker build -t besttester:latest .
docker run --rm -it -v $(pwd)/reports:/app/reports besttester:latest npm run test:smoke
```

## Installation via Docker Compose

For a complete stack with all services:

```bash
docker-compose up -d
docker-compose logs -f testsuite
```

Services started:
- **testsuite** — Main test runner
- **app** — Application under test (nginx)
- **allure** — Report server (http://localhost:4040)
- **otel-collector** — OpenTelemetry collector
- **jaeger** — Distributed tracing UI (http://localhost:16686)

## Troubleshooting Installation

### npm ERR! code ERESOLVE

The npm resolver couldn't resolve dependencies. Try:

```bash
npm install --legacy-peer-deps
```

### Playwright Browser Installation Failed

Try manual installation:

```bash
npx playwright install --with-deps
```

### Port Already in Use

Change the port in your environment:

```bash
PORT=3001 npm run test:smoke
```

### Memory Issues During npm install

Increase Node.js memory:

```bash
node --max-old-space-size=4096 $(which npm) install
```

### Linux: Missing System Dependencies

On Ubuntu/Debian:

```bash
sudo apt-get install -y \
  libatk1.0-0 \
  libgdk-pixbuf-2.0-0 \
  libgbm1 \
  libpangocairo-1.0-0
```

On Fedora:

```bash
sudo yum install -y \
  at-spi2-atk \
  gdk-pixbuf2 \
  libgbm \
  pango-cairo
```

## Environment Setup

### Create .env File

```bash
cp .env.example .env
```

Edit `.env` with your configuration:

```env
# Application
BASE_URL=http://localhost:3000
API_BASE_URL=http://localhost:3001

# Authentication
ADMIN_USERNAME=admin
ADMIN_PASSWORD=your-password

# Anthropic API (optional, for AI testing)
ANTHROPIC_API_KEY=sk-ant-...

# Slack Notifications (optional)
SLACK_WEBHOOK_URL=https://hooks.slack.com/...

# Test Execution
TEST_TIMEOUT=30000
RETRY_ATTEMPTS=3
```

## Development Setup

### VS Code Extensions (Recommended)

- Playwright Test for VSCode
- ESLint
- Prettier - Code formatter
- GitHub Copilot (optional)

### Pre-commit Hooks

Git hooks are automatically installed via Husky. They:
- Run ESLint on staged files
- Run Prettier formatting
- Scan for secrets using gitleaks

To skip hooks (not recommended):

```bash
git commit --no-verify
```

## Updating

To update BestTester to the latest version:

```bash
npm update
npm run setup  # Reinstall browser dependencies if needed
npm run typecheck  # Verify no new TypeScript issues
```

## Uninstallation

To completely remove BestTester:

```bash
rm -rf node_modules
rm package-lock.json
npm cache clean --force
```

## Next Steps

- [5-Minute Quickstart](./quickstart.md)
- [Your First Test](./first-test.md)
- [Architecture Guide](../guides/architecture.md)
