import 'dotenv/config';
import * as fs from 'fs';
import * as path from 'path';
import { WebClient } from '@slack/web-api';
import { JiraClient } from '../src/utils/jira';
import { JiraConfig, TestExecutionPayload } from '../src/types/jira.types';

const jiraKey = process.argv[2] ?? '';
const resultsPath = path.resolve(__dirname, '../reports/playwright-report/results.json');
const junitPath = path.resolve(__dirname, '../reports/playwright-report/junit.xml');
const client = new WebClient(process.env.SLACK_BOT_TOKEN);
const CHANNEL = process.env.SLACK_TEST_RESULTS_CHANNEL!;

const JENKINS_URL = process.env.JENKINS_URL ?? '';
const JOB_NAME = process.env.JOB_NAME ?? 'BestTester';
const BUILD_NUM = process.env.BUILD_NUMBER ?? '';
const playwrightReportUrl = BUILD_NUM
  ? `${JENKINS_URL}/job/${JOB_NAME}/${BUILD_NUM}/Playwright_20Report/`
  : '';

const config: JiraConfig = {
  baseUrl: process.env.JIRA_BASE_URL!,
  email: process.env.JIRA_EMAIL!,
  apiToken: process.env.JIRA_API_TOKEN!,
  projectKey: process.env.JIRA_PROJECT_KEY ?? 'SCRUM',
  bugIssueType: process.env.JIRA_ISSUE_TYPE ?? 'Bug',
};

const raw = JSON.parse(fs.readFileSync(resultsPath, 'utf-8')) as {
  stats: { expected: number; unexpected: number; skipped: number; flaky: number; duration: number };
  suites: any[];
};
const { stats } = raw;

const tests: TestExecutionPayload['tests'] = [];
function collectTests(suites: any[]): void {
  for (const suite of suites) {
    for (const spec of suite.specs ?? []) {
      for (const test of spec.tests ?? []) {
        const r = test.results?.[0];
        const status = r?.status === 'passed' ? 'PASS' : r?.status === 'skipped' ? 'SKIP' : 'FAIL';
        tests.push({
          testId: spec.id ?? spec.title.slice(0, 20),
          testName: spec.title,
          status,
          duration: r?.duration ?? 0,
        });
      }
    }
    collectTests(suite.suites ?? []);
  }
}
collectTests(raw.suites ?? []);

async function run(): Promise<void> {
  const jira = new JiraClient(config);

  const execution = await jira.createTestExecution(
    { summary: 'BestTester Playwright Run', junitPath, tests },
    jiraKey || undefined,
  );
  console.log(`✅ Jira Test Execution created: ${execution.key}`);

  if (jiraKey) {
    await jira.addComment(
      jiraKey,
      `🤖 Test execution added by BestTester\n\nTest Execution: ${config.baseUrl}/browse/${execution.key}\n\nResults: ${stats.expected} passed, ${stats.unexpected} failed, ${stats.skipped} skipped`,
    );
    console.log(`✅ Comment added to ${jiraKey}`);
  }

  const icon = stats.unexpected === 0 ? ':white_check_mark:' : ':x:';
  const execUrl = `${config.baseUrl}/browse/${execution.key}`;
  const lines = [
    `${icon} *BestTester Test Results*`,
    `• Passed: ${stats.expected} | Failed: ${stats.unexpected} | Skipped: ${stats.skipped} | Flaky: ${stats.flaky}`,
    `• Duration: ${(stats.duration / 1000).toFixed(1)}s`,
    `• Test Execution: <${execUrl}|${execution.key}>`,
  ];

  if (playwrightReportUrl) {
    lines.push(`• :playwright: <${playwrightReportUrl}|Playwright Report>`);
  }

  if (jiraKey) {
    const jiraUrl = `${config.baseUrl}/browse/${jiraKey}`;
    lines.push(`• Jira: <${jiraUrl}|${jiraKey}> — tested by <${execUrl}|${execution.key}>`);
  }

  await client.chat.postMessage({ channel: CHANNEL, text: lines.join('\n') });
  console.log('✅ Posted to #test-results');
}

run().catch((e) => {
  console.error(`❌ ${(e as Error).message}`);
  process.exit(1);
});
