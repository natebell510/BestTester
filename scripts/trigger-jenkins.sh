#!/usr/bin/env bash
set -e
JOB_NAME=${1:-"playwright-tests"}
PARAMS=${2:-""}
echo "Triggering Jenkins job: $JOB_NAME"
npx ts-node agents/jenkins-trigger-agent.ts --job "$JOB_NAME" --params "$PARAMS"
