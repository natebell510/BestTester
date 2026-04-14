import * as fs from 'fs';
import * as path from 'path';
import { logger } from './logger';
import { TestFailure } from '../types/jira.types';

interface JUnitTestCase {
  name:      string;
  classname: string;
  time:      string;
  failure?:  string;
  error?:    string;
}

interface JUnitSuite {
  name:      string;
  testcases: JUnitTestCase[];
}

/**
 * Parses a Playwright JUnit XML report into structured failures and passes.
 */
export function parseJUnitReport(
  xmlPath: string,
  buildUrl?: string,
  buildNumber?: string | number,
): { failures: TestFailure[]; passedNames: string[] } {
  if (!fs.existsSync(xmlPath)) {
    logger.warn(`JUnit XML not found: ${xmlPath}`);
    return { failures: [], passedNames: [] };
  }

  const xml = fs.readFileSync(xmlPath, 'utf-8');
  const failures: TestFailure[] = [];
  const passedNames: string[] = [];

  // Parse testsuites/testsuite blocks
  const suiteMatches = [...xml.matchAll(/<testsuite[^>]*name="([^"]*)"[^>]*>([\s\S]*?)<\/testsuite>/g)];

  for (const suiteMatch of suiteMatches) {
    const suiteName = suiteMatch[1];
    const suiteBody = suiteMatch[2];

    // Parse individual testcases
    const caseMatches = [...suiteBody.matchAll(/<testcase[^>]*name="([^"]*)"[^>]*time="([^"]*)"[^>]*(?:classname="([^"]*)")?[^>]*>([\s\S]*?)<\/testcase>|<testcase[^>]*name="([^"]*)"[^>]*time="([^"]*)"[^>]*(?:classname="([^"]*)")?[^>]*\/>/g)];

    for (const caseMatch of caseMatches) {
      const testName  = (caseMatch[1] || caseMatch[5] || '').trim();
      const timeStr   = caseMatch[2] || caseMatch[6] || '0';
      const className = caseMatch[3] || caseMatch[7] || suiteName;
      const body      = caseMatch[4] || '';

      const failureMatch = body.match(/<failure[^>]*(?:message="([^"]*)")?[^>]*>([\s\S]*?)<\/failure>/);
      const errorMatch   = body.match(/<error[^>]*(?:message="([^"]*)")?[^>]*>([\s\S]*?)<\/error>/);

      if (failureMatch || errorMatch) {
        const match   = failureMatch ?? errorMatch!;
        const message = (match[1] ?? match[2] ?? '').replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&amp;/g, '&').trim();
        failures.push({
          testName,
          suiteName,
          errorMessage: message.slice(0, 2000),
          duration:     parseFloat(timeStr) * 1000,
          file:         className,
          buildUrl,
          buildNumber,
        });
      } else if (!body.includes('<skipped')) {
        passedNames.push(testName);
      }
    }
  }

  logger.info(`JUnit parsed: ${failures.length} failures, ${passedNames.length} passes`);
  return { failures, passedNames };
}

/**
 * Reads the latest Playwright results JSON and returns a summary.
 */
export function readPlaywrightResults(jsonPath: string): {
  passed: number; failed: number; skipped: number; duration: number; failures: TestFailure[];
} {
  if (!fs.existsSync(jsonPath)) {
    return { passed: 0, failed: 0, skipped: 0, duration: 0, failures: [] };
  }

  const raw = JSON.parse(fs.readFileSync(jsonPath, 'utf-8'));
  const failures: TestFailure[] = [];
  let passed = 0, failed = 0, skipped = 0, duration = 0;

  for (const suite of raw.suites ?? []) {
    for (const spec of suite.specs ?? []) {
      for (const test of spec.tests ?? []) {
        duration += test.results?.[0]?.duration ?? 0;
        const status = test.results?.[0]?.status;
        if (status === 'passed')  passed++;
        else if (status === 'skipped') skipped++;
        else {
          failed++;
          const err = test.results?.[0]?.error?.message ?? 'Unknown error';
          failures.push({
            testName:     spec.title,
            suiteName:    suite.title,
            errorMessage: err.slice(0, 2000),
            duration:     test.results?.[0]?.duration ?? 0,
            file:         spec.file,
          });
        }
      }
    }
  }

  return { passed, failed, skipped, duration, failures };
}
