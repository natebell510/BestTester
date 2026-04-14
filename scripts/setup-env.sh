#!/usr/bin/env bash
set -e
ENV=${1:-staging}
echo "Setting up environment: $ENV"
if [ ! -f ".env" ]; then
  cp .env.example .env
  echo ".env created from .env.example — fill in your values."
fi
cp "config/environments/${ENV}.env" .env.local 2>/dev/null || true
echo "Environment $ENV ready. Run: npm run setup"
