# CI/CD Integration Guide

Integrate BestTester with GitHub Actions for continuous quality gates.

## Quick Start

Create `.github/workflows/ci.yml`:

```yaml
name: Continuous Integration

on:
  push:
    branches: [ main, develop ]
  pull_request:
    branches: [ main ]

jobs:
  lint-and-type:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: '20'
          cache: 'npm'
      
      - run: npm install
      - run: npm run lint
      - run: npm run typecheck

  smoke-tests:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: '20'
          cache: 'npm'
      
      - run: npm install
      - run: npm run setup
      - run: npm run test:smoke
      
      - uses: actions/upload-artifact@v4
        if: always()
        with:
          name: playwright-report
          path: playwright-report/
          retention-days: 30
```

## Matrix Testing

Run tests across multiple configurations:

```yaml
test:
  runs-on: ubuntu-latest
  strategy:
    matrix:
      node-version: [18, 20]
      test-suite: [ui, api, security]
  
  steps:
    - uses: actions/checkout@v4
    - uses: actions/setup-node@v4
      with:
        node-version: ${{ matrix.node-version }}
        cache: 'npm'
    
    - run: npm install
    - run: npm run test:${{ matrix.test-suite }}
    
    - uses: actions/upload-artifact@v4
      if: always()
      with:
        name: test-results-${{ matrix.node-version }}-${{ matrix.test-suite }}
        path: playwright-report/
```

## Parallel Sharding

Distribute tests across jobs for faster execution:

```yaml
test:
  runs-on: ubuntu-latest
  strategy:
    matrix:
      shard: [1, 2, 3, 4]
  
  steps:
    - uses: actions/checkout@v4
    - uses: actions/setup-node@v4
      with:
        node-version: '20'
        cache: 'npm'
    
    - run: npm install
    - run: npm run setup
    - run: npm run test:ui -- --shard=${{ matrix.shard }}/4
    
    - uses: actions/upload-artifact@v4
      if: always()
      with:
        name: blob-report-${{ matrix.shard }}
        path: blob-report/
```

## Merge Artifacts

Combine sharded test results:

```yaml
merge-reports:
  if: always()
  needs: [test]
  runs-on: ubuntu-latest
  
  steps:
    - uses: actions/checkout@v4
    - uses: actions/setup-node@v4
      with:
        node-version: '20'
        cache: 'npm'
    
    - uses: actions/download-artifact@v4
      with:
        path: all-blob-reports
        pattern: blob-report-*
    
    - run: npm install
    - run: npx playwright merge-reports --output-dir merged-results all-blob-reports
    
    - uses: actions/upload-artifact@v4
      with:
        name: html-report-merged
        path: merged-results/
```

## Docker & Container Testing

```yaml
test-docker:
  runs-on: ubuntu-latest
  
  steps:
    - uses: actions/checkout@v4
    
    - run: docker build -t besttester:latest .
    - run: docker run --rm besttester:latest npm run test:smoke
```

## Change-Based Testing

Only run tests for affected code:

```yaml
test:
  runs-on: ubuntu-latest
  
  steps:
    - uses: actions/checkout@v4
      with:
        fetch-depth: 0
    
    - uses: tj-actions/changed-files@v40
      id: changed-files
      with:
        files: |
          src/**/*.ts
          tests/**/*.ts
          package.json
    
    - if: steps.changed-files.outputs.any_changed == 'true'
      run: npm install
    
    - if: steps.changed-files.outputs.any_changed == 'true'
      run: npm run test:smoke
```

## PR Comments

Post test results as PR comments:

```yaml
comment-results:
  if: github.event_name == 'pull_request'
  runs-on: ubuntu-latest
  needs: [smoke-tests]
  
  steps:
    - uses: actions/checkout@v4
    - uses: actions/download-artifact@v4
      with:
        path: artifacts
    
    - name: Comment PR
      uses: actions/github-script@v7
      with:
        script: |
          github.rest.issues.createComment({
            issue_number: context.issue.number,
            owner: context.repo.owner,
            repo: context.repo.repo,
            body: '✅ All tests passed!\n\n[View Report](https://github.com/${{ github.repository }}/actions/runs/${{ github.run_id }})'
          })
```

## Scheduled Testing

Run tests on schedule:

```yaml
scheduled:
  on:
    schedule:
      - cron: '0 2 * * *'  # Daily at 2 AM UTC
  
  jobs:
    smoke:
      runs-on: ubuntu-latest
      steps:
        - uses: actions/checkout@v4
        - uses: actions/setup-node@v4
          with:
            node-version: '20'
            cache: 'npm'
        
        - run: npm install
        - run: npm run test:smoke
        
        - name: Notify on failure
          if: failure()
          uses: slackapi/slack-github-action@v1
          with:
            webhook-url: ${{ secrets.SLACK_WEBHOOK }}
            payload: |
              {
                "text": "Scheduled tests failed!",
                "blocks": [{
                  "type": "section",
                  "text": {
                    "type": "mrkdwn",
                    "text": "🔴 BestTester scheduled tests failed\n<https://github.com/${{ github.repository }}/actions/runs/${{ github.run_id }}|View Details>"
                  }
                }]
              }
```

## Security & Compliance

### Secret Scanning

```yaml
security:
  runs-on: ubuntu-latest
  
  steps:
    - uses: actions/checkout@v4
    - run: npm run security:audit
    
    - uses: aquasecurity/trivy-action@master
      with:
        scan-type: 'fs'
        scan-ref: '.'
        format: 'sarif'
        output: 'trivy-results.sarif'
    
    - uses: github/codeql-action/upload-sarif@v2
      with:
        sarif_file: 'trivy-results.sarif'
```

### Dependency Updates

```yaml
dependencies:
  runs-on: ubuntu-latest
  
  steps:
    - uses: actions/checkout@v4
    - uses: actions/setup-node@v4
      with:
        node-version: '20'
        cache: 'npm'
    
    - run: npm audit --audit-level=high
```

## Performance Monitoring

```yaml
performance:
  runs-on: ubuntu-latest
  
  steps:
    - uses: actions/checkout@v4
    - uses: actions/setup-node@v4
      with:
        node-version: '20'
        cache: 'npm'
    
    - run: npm install
    - run: npm run test:performance
    
    - uses: actions/upload-artifact@v4
      with:
        name: performance-results
        path: reports/performance-*.json
```

## Notifications

### Slack Integration

```yaml
notify:
  if: always()
  runs-on: ubuntu-latest
  needs: [lint-and-type, smoke-tests]
  
  steps:
    - name: Slack notification
      uses: slackapi/slack-github-action@v1
      with:
        webhook-url: ${{ secrets.SLACK_WEBHOOK }}
        payload: |
          {
            "text": "CI Results: ${{ needs.lint-and-type.result }} / ${{ needs.smoke-tests.result }}",
            "blocks": [{
              "type": "section",
              "text": {
                "type": "mrkdwn",
                "text": "*BestTester CI Summary*\nLint: ${{ needs.lint-and-type.result }}\nTests: ${{ needs.smoke-tests.result }}"
              }
            }]
          }
```

### Email Notifications

```yaml
email:
  if: failure()
  runs-on: ubuntu-latest
  needs: [smoke-tests]
  
  steps:
    - uses: dawidd6/action-send-mail@v3
      with:
        server_address: smtp.gmail.com
        server_port: 465
        username: ${{ secrets.EMAIL_USERNAME }}
        password: ${{ secrets.EMAIL_PASSWORD }}
        subject: 'BestTester CI Failed'
        to: 'team@example.com'
        from: 'ci@example.com'
        body: |
          Tests failed!
          See: https://github.com/${{ github.repository }}/actions/runs/${{ github.run_id }}
```

## Environment Variables

Set secrets for CI:

```yaml
env:
  BASE_URL: https://staging.example.com
  API_BASE_URL: https://api-staging.example.com
  TEST_TIMEOUT: 30000

jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - run: npm run test:smoke
        env:
          ANTHROPIC_API_KEY: ${{ secrets.ANTHROPIC_API_KEY }}
          DATABASE_URL: ${{ secrets.DATABASE_URL }}
```

## Deployment Integration

Deploy after successful tests:

```yaml
deploy:
  if: github.ref == 'refs/heads/main' && success()
  needs: [lint-and-type, smoke-tests]
  runs-on: ubuntu-latest
  
  steps:
    - uses: actions/checkout@v4
    - run: npm install
    - run: npm run build
    
    - uses: actions/deploy-pages@v2
      with:
        artifact_name: html-report-merged
```

## Best Practices

### ✅ Do

```yaml
# ✅ Good: Cache dependencies
- uses: actions/setup-node@v4
  with:
    cache: 'npm'

# ✅ Good: Parallel jobs
strategy:
  matrix:
    shard: [1, 2, 3, 4]

# ✅ Good: Save artifacts
- uses: actions/upload-artifact@v4
  if: always()
  with:
    retention-days: 30

# ✅ Good: Fast-fail on lint
lint:
  runs-on: ubuntu-latest
  # Runs first to fail quickly
```

### ❌ Don't

```yaml
# ❌ Bad: No caching
- run: npm install
- run: npm ci

# ❌ Bad: Sequential jobs
jobs:
  job1:
    steps:
      - run: npm run test:ui
  job2:
    steps:
      - run: npm run test:api
  # These run one after another!

# ❌ Bad: Storing large artifacts forever
- uses: actions/upload-artifact@v4
  # No retention-days set - stored indefinitely!

# ❌ Bad: Running all tests first
test:
  runs-on: ubuntu-latest
  steps:
    - run: npm run test  # Slow!
lint:
  runs-on: ubuntu-latest
  steps:
    - run: npm run lint  # Runs after tests!
```

## Advanced: Custom Workflows

### Approval Gates

```yaml
test:
  runs-on: ubuntu-latest
  steps:
    - uses: actions/checkout@v4
    - run: npm run test:smoke
    - run: npm run test:mutation -- --threshold 70

approve:
  if: github.event.pull_request.author_association == 'MEMBER'
  needs: [test]
  runs-on: ubuntu-latest
  steps:
    - name: Auto-approve internal PRs
      uses: actions/github-script@v7
      with:
        script: |
          github.rest.pulls.createReview({
            pull_number: context.issue.number,
            owner: context.repo.owner,
            repo: context.repo.repo,
            event: 'APPROVE'
          })
```

### Dynamic Test Selection

```yaml
test-smart:
  runs-on: ubuntu-latest
  steps:
    - uses: actions/checkout@v4
      with:
        fetch-depth: 0
    
    - uses: tj-actions/changed-files@v40
      id: changes
      with:
        files: |
          src/api/**
          tests/api/**
    
    - if: steps.changes.outputs.any_changed == 'true'
      run: npm run test:api
    
    - if: steps.changes.outputs.any_changed == 'false'
      run: echo "No API changes detected"
```

## Troubleshooting

### Tests timeout in CI

```yaml
jobs:
  test:
    runs-on: ubuntu-latest
    timeout-minutes: 30  # Add explicit timeout
```

### Node modules cache not working

```yaml
- uses: actions/setup-node@v4
  with:
    cache: 'npm'
    cache-dependency-path: '**/package-lock.json'
```

### Flaky tests in CI

```yaml
- run: npm run test:smoke
  timeout-minutes: 10
  continue-on-error: true  # Don't fail on first attempt
  
- name: Retry on failure
  if: failure()
  run: npm run test:smoke -- --grep "@flaky"
```

## Next Steps

- [Docker & Kubernetes](./kubernetes.md)
- [Example Workflows](../examples/)
- [GitHub Actions Docs](https://docs.github.com/en/actions)
