#!/usr/bin/env ts-node
/**
 * Slack QE Bot Agent — posts Playwright test results summary to Slack.
 * Triggered automatically at end of CI or manually.
 * CLI: ts-node agents/slack-bot-agent.ts --report reports/playwright-report/results.json
 */
import * as fs from 'fs';
import * as path from 'path';
import * as dotenv from 'dotenv';
import { postTestSummary, TestSummary } from '../src/utils/slack';

dotenv.config();

interface PlaywrightResults {
  stats: {
    expected: number;
    unexpected: number;
    skipped: number;
    flaky: number;
    duration: number;
  };
  suites: { specs: { tests: { results: { status: string; error?: { message: string } }[] }[] }[] }[];
}

async function main(): Promise<void> {
  const args = process.argv.slice(2);
  const reportIndex = args.indexOf('--report');
  const reportPath = reportIndex !== -1 && args[reportIndex + 1]
    ? path.resolve(args[reportIndex + 1])
    : path.resolve(__dirname, '../reports/playwright-report/results.json');

  if (!fs.existsSync(reportPath)) {
    console.error(`Report not found: ${reportPath}`);
    process.exit(1);
  }

  const results: PlaywrightResults = JSON.parse(fs.readFileSync(reportPath, 'utf-8')) as PlaywrightResults;
  const { stats } = results;

  const topFailures: string[] = [];
  for (const suite of results.suites) {
    for (const spec of suite.specs) {
      for (const test of spec.tests) {
        for (const run of test.results) {
          if (run.status === 'failed' && run.error?.message) {
            topFailures.push(run.error.message.split('\n')[0]);
            if (topFailures.length >= 3) break;
          }
        }
      }
    }
  }

  const summary: TestSummary = {
    passed: stats.expected,
    failed: stats.unexpected,
    skipped: stats.skipped,
    flaky: stats.flaky,
    duration: stats.duration,
    reportUrl: process.env.ALLURE_REPORT_URL,
    topFailures,
  };

  await postTestSummary(summary);
  console.log('Slack notification sent.');
}

main().catch((err) => { console.error(err); process.exit(1); });
