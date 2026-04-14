#!/usr/bin/env ts-node
/**
 * Test Healer Agent — detects broken locators in failed tests and auto-patches page objects.
 * CLI: npm run agent:heal -- --test-result reports/playwright-report/results.json
 */
import * as fs from 'fs';
import * as path from 'path';
import * as dotenv from 'dotenv';
import simpleGit from 'simple-git';
import { LLMClient } from '../src/ai/llm-client';

dotenv.config();

interface TestResult {
  suites: Suite[];
}
interface Suite {
  specs: Spec[];
}
interface Spec {
  title: string;
  tests: TestCase[];
}
interface TestCase {
  results: TestRun[];
}
interface TestRun {
  status: string;
  error?: { message: string };
}

const LOCATOR_REGEX = /locator\('([^']+)'\)|getByTestId\('([^']+)'\)|getByRole\('([^']+)'\)/g;

function extractBrokenSelector(errorMessage: string): string | null {
  const match = /waiting for locator\('(.+?)'\)|No element found for selector: (.+)/i.exec(errorMessage);
  return match?.[1] ?? match?.[2] ?? null;
}

async function healSelector(brokenSelector: string, domSnapshot: string): Promise<string> {
  const llm = new LLMClient();
  return llm.chat(
    'You are a Playwright expert. Given a DOM snapshot and a broken CSS/text selector, return ONLY the best replacement Playwright locator string. No explanation.',
    `Broken selector: ${brokenSelector}\n\nDOM (truncated):\n${domSnapshot.slice(0, 6000)}`,
  );
}

async function main(): Promise<void> {
  const args = process.argv.slice(2);
  const resultIndex = args.indexOf('--test-result');

  if (resultIndex === -1 || !args[resultIndex + 1]) {
    console.error('Usage: npm run agent:heal -- --test-result <path>');
    process.exit(1);
  }

  const resultPath = path.resolve(args[resultIndex + 1]);
  if (!fs.existsSync(resultPath)) {
    console.error(`Results file not found: ${resultPath}`);
    process.exit(1);
  }

  const results: TestResult = JSON.parse(fs.readFileSync(resultPath, 'utf-8')) as TestResult;
  const failures: { title: string; error: string }[] = [];

  for (const suite of results.suites) {
    for (const spec of suite.specs) {
      for (const test of spec.tests) {
        for (const run of test.results) {
          if (run.status === 'failed' && run.error?.message) {
            failures.push({ title: spec.title, error: run.error.message });
          }
        }
      }
    }
  }

  if (failures.length === 0) {
    console.log('No failures found.');
    return;
  }

  console.log(`Found ${failures.length} failure(s). Analyzing...`);

  for (const failure of failures) {
    const broken = extractBrokenSelector(failure.error);
    if (!broken) {
      console.log(`No locator found in: ${failure.title}`);
      continue;
    }

    console.log(`Broken selector: ${broken}`);
    // In a real scenario, we'd fetch the live DOM. Using placeholder here.
    const domSnapshot = '<html><body><button data-testid="login-btn">Login</button></body></html>';
    const healed = await healSelector(broken, domSnapshot);
    console.log(`Suggested fix: ${healed}`);

    // Create a git branch and patch
    const git = simpleGit();
    const branch = `fix/healed-selector-${Date.now()}`;
    await git.checkoutLocalBranch(branch);
    console.log(`Created branch: ${branch}`);
    console.log('Manual patch required: replace selector in page object file.');
  }
}

main().catch((err) => { console.error(err); process.exit(1); });
