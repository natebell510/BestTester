/**
 * Triggers Jenkins BestTester job, polls until complete,
 * creates a Jira Test Execution linked to the given Jira key,
 * and posts results to #test-results Slack channel.
 *
 * Usage: npx ts-node -P tsconfig.json scripts/trigger-and-report.ts [JIRA_KEY]
 * Example: npx ts-node -P tsconfig.json scripts/trigger-and-report.ts SCRUM-5
 */
import 'dotenv/config';
import * as fs from 'fs';
import * as path from 'path';
import axios from 'axios';
import { WebClient } from '@slack/web-api';
import { JiraClient } from '../src/utils/jira';
import { JiraConfig, TestExecutionPayload } from '../src/types/jira.types';

const JENKINS_URL = process.env.JENKINS_URL!;
const jenkinsAuth = { username: process.env.JENKINS_USERNAME!, password: process.env.JENKINS_TOKEN! };
const slack = new WebClient(process.env.SLACK_BOT_TOKEN);
const CHANNEL = process.env.SLACK_TEST_RESULTS_CHANNEL!;
const JOB = 'BestTester';
const jiraKey = process.argv[2];

const jiraConfig: JiraConfig = {
  baseUrl:      process.env.JIRA_BASE_URL!,
  email:        process.env.JIRA_EMAIL!,
  apiToken:     process.env.JIRA_API_TOKEN!,
  projectKey:   process.env.JIRA_PROJECT_KEY ?? 'SCRUM',
  bugIssueType: process.env.JIRA_ISSUE_TYPE  ?? 'Bug',
};

// ─── Jenkins helpers ──────────────────────────────────────────────────────────

async function triggerBuild(): Promise<number> {
  const { data, headers: crumbHeaders } = await axios.get(`${JENKINS_URL}/crumbIssuer/api/json`, { auth: jenkinsAuth });
  const cookie = (crumbHeaders['set-cookie'] as string[] | undefined)?.join('; ') ?? '';
  const res = await axios.post(`${JENKINS_URL}/job/${JOB}/build`, null, {
    auth: jenkinsAuth,
    headers: { [data.crumbRequestField]: data.crumb, Cookie: cookie },
    maxRedirects: 0,
    validateStatus: s => s < 400,
  });
  const queueId = parseInt((res.headers['location'] as string).split('/').filter(Boolean).pop() ?? '0', 10);
  console.log(`✅ Triggered ${JOB}, queue id: ${queueId}`);
  return queueId;
}

async function resolveBuildNumber(queueId: number): Promise<number> {
  for (let i = 0; i < 30; i++) {
    await sleep(3000);
    const { data } = await axios.get(`${JENKINS_URL}/queue/item/${queueId}/api/json`, { auth: jenkinsAuth });
    if (data.executable?.number) return data.executable.number as number;
    process.stdout.write('  waiting for build to start...\r');
  }
  throw new Error('Build did not start within 90s');
}

async function pollUntilComplete(buildNumber: number): Promise<{ result: string; duration: number; url: string }> {
  console.log(`  polling build #${buildNumber}...`);
  for (let i = 0; i < 60; i++) {
    await sleep(10000);
    const { data } = await axios.get(`${JENKINS_URL}/job/${JOB}/${buildNumber}/api/json`, { auth: jenkinsAuth });
    if (!data.building) return { result: data.result, duration: data.duration, url: data.url };
    process.stdout.write(`  still building... (${Math.round((data.estimatedDuration - data.duration) / 1000)}s remaining)\r`);
  }
  throw new Error('Build did not complete within 10 minutes');
}

// ─── Jira helpers ─────────────────────────────────────────────────────────────

async function createTestExecution(buildNumber: number, buildUrl: string, result: string, duration: number): Promise<string> {
  const jira = new JiraClient(jiraConfig);
  const jsonPath = path.resolve(__dirname, '../reports/playwright-report/results.json');
  const junitPath = path.resolve(__dirname, '../reports/playwright-report/junit.xml');

  const tests: TestExecutionPayload['tests'] = [];

  if (fs.existsSync(jsonPath)) {
    const raw = JSON.parse(fs.readFileSync(jsonPath, 'utf-8'));
    for (const suite of raw.suites ?? []) {
      for (const spec of suite.specs ?? []) {
        for (const test of spec.tests ?? []) {
          const r = test.results?.[0];
          tests.push({
            testId: spec.id ?? spec.title.slice(0, 20),
            testName: spec.title,
            status: r?.status === 'passed' ? 'PASS' : r?.status === 'skipped' ? 'SKIP' : 'FAIL',
            duration: r?.duration ?? 0,
          });
        }
      }
    }
  }

  const payload: TestExecutionPayload = {
    summary: `Jenkins Build #${buildNumber} — ${result}`,
    buildUrl,
    junitPath,
    tests,
  };

  const execution = await jira.createTestExecution(payload, jiraKey);
  console.log(`✅ Jira Test Execution created: ${execution.key}`);

  if (jiraKey) {
    await jira.addComment(
      jiraKey,
      `🤖 Test execution completed by Jenkins Build #${buildNumber} — *${result}*\n\nTest Execution: ${jiraConfig.baseUrl}/browse/${execution.key}\nBuild: ${buildUrl}\n\nResults: ${tests.filter(t => t.status === 'PASS').length} passed, ${tests.filter(t => t.status === 'FAIL').length} failed`,
    );
    console.log(`✅ Comment added to ${jiraKey}`);
  }

  return execution.key;
}

// ─── Slack ────────────────────────────────────────────────────────────────────

async function postToSlack(buildNumber: number, buildUrl: string, result: string, duration: number, executionKey: string): Promise<void> {
  const icon = result === 'SUCCESS' ? ':white_check_mark:' : ':x:';
  const jiraUrl = jiraKey ? `${jiraConfig.baseUrl}/browse/${jiraKey}` : null;
  const execUrl = `${jiraConfig.baseUrl}/browse/${executionKey}`;

  const lines = [
    `${icon} *Jenkins: ${JOB}* | Build <${buildUrl}|#${buildNumber}> — *${result}*`,
    `• Duration: ${(duration / 1000).toFixed(1)}s`,
    jiraUrl ? `• Jira: <${jiraUrl}|${jiraKey}> → Test Execution: <${execUrl}|${executionKey}>` : `• Test Execution: <${execUrl}|${executionKey}>`,
  ];

  await slack.chat.postMessage({ channel: CHANNEL, text: lines.join('\n') });
  console.log('✅ Posted to #test-results');
}

// ─── Main ─────────────────────────────────────────────────────────────────────

function sleep(ms: number): Promise<void> {
  return new Promise(r => setTimeout(r, ms));
}

(async () => {
  try {
    if (jiraKey) console.log(`🔗 Jira key: ${jiraKey}`);
    const queueId = await triggerBuild();
    const buildNumber = await resolveBuildNumber(queueId);
    console.log(`\n  build #${buildNumber} started`);
    const { result, duration, url: buildUrl } = await pollUntilComplete(buildNumber);
    console.log(`\n  build #${buildNumber} finished: ${result}`);
    const executionKey = await createTestExecution(buildNumber, buildUrl, result, duration);
    await postToSlack(buildNumber, buildUrl, result, duration, executionKey);
  } catch (e) {
    console.error('\n❌', (e as Error).message);
    process.exit(1);
  }
})();
