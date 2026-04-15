import { IncomingWebhook } from '@slack/webhook';
import { WebClient } from '@slack/web-api';
import { logger } from './logger';
import { buildSlackReport } from './slack-report-template';

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
  const total = summary.passed + summary.failed + summary.skipped + summary.flaky;
  const status = summary.failed === 0 ? '✅' : '❌';
  const fallback = `${status} BestTester Results — Total: ${total} | Passed: ${summary.passed} | Failed: ${summary.failed} | Skipped: ${summary.skipped} | Flaky: ${summary.flaky}`;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { blocks } = buildSlackReport(summary) as { blocks: any[] };

  await webhook.send({ text: fallback, blocks });
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
