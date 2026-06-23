# Multi-stage build for BestTester framework
FROM mcr.microsoft.com/playwright:v1.45.0-jammy AS base

WORKDIR /app

# Set environment variables
ENV NODE_ENV=test \
    PLAYWRIGHT_SKIP_BROWSER_DOWNLOAD=0 \
    CI=true \
    NPM_CONFIG_LOGLEVEL=error

# Install additional dependencies for CI/CD
RUN apt-get update && apt-get install -y --no-install-recommends \
    git \
    openssh-client \
    curl \
    jq \
    && rm -rf /var/lib/apt/lists/*

# Builder stage
FROM base AS builder

# Copy package files
COPY package*.json ./

# Install dependencies
RUN npm ci

# Copy source code
COPY . .

# Type check and lint
RUN npm run typecheck && npm run lint

# Final stage
FROM base AS runtime

# Copy node_modules from builder
COPY --from=builder /app/node_modules ./node_modules

# Copy application code
COPY --from=builder /app ./

# Create non-root user for security
RUN useradd -m -u 1000 tester && chown -R tester:tester /app

USER tester

# Health check
HEALTHCHECK --interval=30s --timeout=10s --start-period=40s --retries=3 \
    CMD npm run test:smoke --silent || exit 1

# Entry point script
COPY --chown=tester:tester scripts/docker-entrypoint.sh /app/entrypoint.sh
RUN chmod +x /app/entrypoint.sh

ENTRYPOINT ["/app/entrypoint.sh"]

# Default command runs smoke tests
CMD ["npm", "run", "test:smoke"]
