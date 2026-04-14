import { IncomingWebhook } from '@slack/webhook';
import { WebClient } from '@slack/web-api';
import { logger } from './logger';

const webhook = new IncomingWebhook(process.env.SLACK_WEBHOOK_URL ?? '');

export interface TestSummary {
  passed: number;
  failed: number;
  skipped: number;
  flaky: number;
  duration: number;
  reportUrl?: string;
  topFailures?: string[];
}

export async function postTestSummary(summary: TestSummary): Promise<void> {
  const status = summary.failed === 0 ? '✅' : '❌';
  const text = [
    `${status} *BestTester Results*`,
    `• Passed: ${summary.passed} | Failed: ${summary.failed} | Skipped: ${summary.skipped} | Flaky: ${summary.flaky}`,
    `• Duration: ${(summary.duration / 1000).toFixed(1)}s`,
    summary.reportUrl ? `• <${summary.reportUrl}|View Allure Report>` : '',
    ...(summary.topFailures?.map((f, i) => `${i + 1}. \`${f}\``) ?? []),
  ]
    .filter(Boolean)
    .join('\n');

  await webhook.send({
    text,
    attachments: [
      {
        color: summary.failed === 0 ? 'good' : 'danger',
        actions: [
          { type: 'button', text: 'Re-run Failed', url: process.env.JENKINS_URL ?? '#' },
          { type: 'button', text: 'View Report', url: summary.reportUrl ?? '#' },
        ],
      },
    ],
  });
  logger.info('Slack notification sent');
}

export async function postMessage(text: string): Promise<void> {
  await webhook.send({ text });
}

export async function postToChannel(channel: string, text: string): Promise<void> {
  const client = new WebClient(process.env.SLACK_TOKEN);
  const res = await client.chat.postMessage({ channel, text });
  if (!res.ok) throw new Error(`Slack API error: ${res.error}`);
  logger.info(`Slack message posted to ${channel}`);
}
