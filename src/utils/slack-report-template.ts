/**
 * @file slack-report-template.ts
 * @description Builds Slack message blocks for Playwright test result summaries.
 */
export interface SlackReportOptions {
  passed: number;
  failed: number;
  skipped: number;
  flaky: number;
  duration: number;
  reportUrl?: string;
  topFailures?: string[];
  branch?: string;
}

export function buildSlackReport(opts: SlackReportOptions): object {
  const status = opts.failed === 0 ? '✅ PASSED' : '❌ FAILED';
  const durationSec = (opts.duration / 1000).toFixed(1);

  return {
    blocks: [
      {
        type: 'header',
        text: { type: 'plain_text', text: `BestTester Results — ${status}` },
      },
      {
        type: 'section',
        fields: [
          {
            type: 'mrkdwn',
            text: `*Total:* ${opts.passed + opts.failed + opts.skipped + opts.flaky}`,
          },
          { type: 'mrkdwn', text: `*Passed:* ${opts.passed}` },
          { type: 'mrkdwn', text: `*Failed:* ${opts.failed}` },
          { type: 'mrkdwn', text: `*Skipped:* ${opts.skipped}` },
          { type: 'mrkdwn', text: `*Flaky:* ${opts.flaky}` },
          { type: 'mrkdwn', text: `*Duration:* ${durationSec}s` },
          { type: 'mrkdwn', text: `*Branch:* ${opts.branch ?? 'unknown'}` },
        ],
      },
      ...(opts.topFailures?.length
        ? [
            {
              type: 'section',
              text: {
                type: 'mrkdwn',
                text: `*Top Failures:*\n${opts.topFailures.map((f, i) => `${i + 1}. \`${f}\``).join('\n')}`,
              },
            },
          ]
        : []),
      ...(opts.reportUrl
        ? [
            {
              type: 'actions',
              elements: [
                {
                  type: 'button',
                  text: { type: 'plain_text', text: 'View Report' },
                  url: opts.reportUrl,
                },
              ],
            },
          ]
        : []),
    ],
  };
}
