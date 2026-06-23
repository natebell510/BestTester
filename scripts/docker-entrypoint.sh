#!/bin/bash
set -e

# Docker entrypoint script for BestTester framework
# Handles environment setup and test execution

echo "🚀 Starting BestTester in Docker"
echo "Node version: $(node --version)"
echo "npm version: $(npm --version)"
echo "Playwright version: $(npm list @playwright/test | head -2)"

# Load environment file if provided
if [ -f /app/.env ]; then
  echo "📦 Loading environment from .env file"
  export $(cat /app/.env | grep -v '#' | xargs)
fi

# Set defaults for environment variables
export BASE_URL=${BASE_URL:-"http://localhost:3000"}
export ADMIN_USERNAME=${ADMIN_USERNAME:-"admin"}
export ADMIN_PASSWORD=${ADMIN_PASSWORD:-"password"}
export TEST_TIMEOUT=${TEST_TIMEOUT:-"30000"}

# Create reports directory if it doesn't exist
mkdir -p /app/reports
mkdir -p /app/blob-report

echo "✅ Environment setup complete"
echo "   BASE_URL: $BASE_URL"
echo "   TEST_TIMEOUT: $TEST_TIMEOUT"
echo "   CI: $CI"

# Execute the command passed to docker run
echo "🧪 Executing: $@"
exec "$@"
