import * as dotenv from 'dotenv';
import * as path from 'path';
import * as fs from 'fs';
dotenv.config({ path: path.resolve(process.cwd(), '.env'), override: true });

import { JiraClient, jiraConfig } from '../src/utils/jira';
import { TestExecutionRecord } from '../src/types/jira.types';

const JIRA_KEY  = process.argv[2] ?? 'SCRUM-5';
const junitPath = process.argv[3] ?? 'reports/playwright-report/junit.xml';

// ─── Parse JUnit XML into TestExecutionRecords ────────────────────────────────

function parseJUnit(xmlPath: string): TestExecutionRecord[] {
  if (!fs.existsSync(xmlPath)) throw new Error(`JUnit XML not found: ${xmlPath}`);

  const xml      = fs.readFileSync(xmlPath, 'utf-8');
  const records: TestExecutionRecord[] = [];
  let   index    = 1;

  const caseRe = /<testcase([^>]*)>([\s\S]*?)<\/testcase>|<testcase([^>]*)\/>/g;

  for (const m of xml.matchAll(caseRe)) {
    const attrs   = m[1] ?? m[3] ?? '';
    const body    = m[2] ?? '';

    const name     = (attrs.match(/name="([^"]*)"/))?.[1]   ?? `test-${index}`;
    const timeStr  = (attrs.match(/time="([^"]*)"/))?.[1]   ?? '0';

    const failure  = body.match(/<failure[^>]*>([\s\S]*?)<\/failure>/);
    const error    = body.match(/<error[^>]*>([\s\S]*?)<\/error>/);
    const skipped  = /<skipped/.test(body);

    const status: TestExecutionRecord['status'] =
      skipped ? 'SKIP' : (failure || error) ? 'FAIL' : 'PASS';

    const errorMsg = failure?.[1] ?? error?.[1] ?? undefined;

    records.push({
      testId:   `TC-${String(index).padStart(3, '0')}`,
      testName: name,
      status,
      duration: Math.round(parseFloat(timeStr) * 1000),
      ...(errorMsg ? { error: errorMsg.replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&amp;/g, '&').trim().slice(0, 500) } : {}),
    });

    index++;
  }

  return records;
}

// ─── Main ─────────────────────────────────────────────────────────────────────

async function run() {
  console.log(`\n=== BestTester: Create Test Execution → ${JIRA_KEY} ===\n`);

  const tests = parseJUnit(junitPath);
  const passed  = tests.filter(t => t.status === 'PASS').length;
  const failed  = tests.filter(t => t.status === 'FAIL').length;
  const skipped = tests.filter(t => t.status === 'SKIP').length;

  console.log(`📋 Parsed ${tests.length} tests from ${junitPath}`);
  console.log(`   ✅ ${passed} passed  ❌ ${failed} failed  ⏭ ${skipped} skipped\n`);

  tests.forEach(t => console.log(`   [${t.testId}] ${t.status.padEnd(4)} — ${t.testName}`));

  const jira  = new JiraClient(jiraConfig);
  const issue = await jira.createTestExecution(
    {
      summary:   'Login Smoke Tests',
      junitPath,
      tests,
    },
    JIRA_KEY,
  );

  console.log(`\n✅ Test Execution issue created: ${issue.key}`);
  console.log(`   Linked to : ${JIRA_KEY}`);
  console.log(`   URL       : ${jiraConfig.baseUrl}/browse/${issue.key}\n`);
}

run().catch(e => { console.error('❌', e.message); process.exit(1); });
