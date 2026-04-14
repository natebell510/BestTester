/**
 * @file notify-slack.ts
 * @description Posts test results summary to Slack via Incoming Webhook.
 * Usage: npx ts-node scripts/notify-slack.ts [resultsJsonPath]
 */
import * as dotenv from 'dotenv';
import * as path from 'path';
import * as fs from 'fs';
import { IncomingWebhook } from '@slack/webhook';

dotenv.config({ path: path.resolve(__dirname, '../.env'), override: true });

const resultsPath =
  process.argv[2] ?? path.resolve(__dirname, '../reports/playwright-report/results.json');
const webhookUrl = process.env.SLACK_WEBHOOK_URL ?? '';
const buildNumber = process.env.BUILD_NUMBER ?? 'local';
const jenkinsUrl = process.env.JENKINS_URL ?? '';
const jobName = process.env.JOB_NAME ?? 'BestTester';

if (!webhookUrl) {
  console.error('❌ SLACK_WEBHOOK_URL not set');
  process.exit(1);
}

if (!fs.existsSync(resultsPath)) {
  console.error(`❌ Results file not found: ${resultsPath}`);
  process.exit(1);
}

interface PwResult {
  suites: Array<{
    title: string;
    specs: Array<{
      title: string;
      tests: Array<{ results: Array<{ status: string; duration: number }> }>;
    }>;
  }>;
}

const raw: PwResult = JSON.parse(fs.readFileSync(resultsPath, 'utf-8'));

let passed = 0;
let failed = 0;
let skipped = 0;
let duration = 0;
const topFailures: string[] = [];

for (const suite of raw.suites ?? []) {
  for (const spec of suite.specs ?? []) {
    for (const test of spec.tests ?? []) {
      const r = test.results?.[0];
      duration += r?.duration ?? 0;
      if (r?.status === 'passed') passed++;
      else if (r?.status === 'skipped') skipped++;
      else {
        failed++;
        if (topFailures.length < 5) topFailures.push(spec.title);
      }
    }
  }
}

const total = passed + failed + skipped;
const icon = failed === 0 ? '✅' : '❌';
const status = failed === 0 ? 'PASSED' : 'FAILED';
const buildUrl = buildNumber !== 'local' ? `${jenkinsUrl}/job/${jobName}/${buildNumber}/` : '';

const lines = [
  `${icon} *BestTester — Build #${buildNumber} — ${status}*`,
  `• Passed: ${passed} | Failed: ${failed} | Skipped: ${skipped} | Total: ${total}`,
  `• Duration: ${(duration / 1000).toFixed(1)}s`,
];

if (buildUrl)
  lines.push(`• <${buildUrl}|Jenkins Build> | <${buildUrl}Playwright_20Report/|Playwright Report>`);
if (topFailures.length) {
  lines.push('', '*Top failures:*');
  topFailures.forEach((f, i) => lines.push(`  ${i + 1}. \`${f}\``));
}

async function main(): Promise<void> {
  const webhook = new IncomingWebhook(webhookUrl);
  await webhook.send({
    text: lines.join('\n'),
    attachments: [{ color: failed === 0 ? 'good' : 'danger', text: '' }],
  });
  console.log(`✅ Slack notification sent (${status}: ${passed}/${total} passed)`);
}

main().catch((e) => {
  console.error('❌', (e as Error).message);
  process.exit(1);
});
