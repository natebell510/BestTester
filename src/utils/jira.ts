import axios, { AxiosInstance } from 'axios';
import * as fs from 'fs';
import * as path from 'path';
import FormData from 'form-data';
import { logger } from './logger';
import {
  JiraConfig,
  JiraIssue,
  JiraCreatePayload,
  JiraAdfDoc,
  JiraAdfNode,
  JiraSyncResult,
  TestFailure,
  TestExecutionPayload,
} from '../types/jira.types';

export function getJiraConfig(): JiraConfig {
  return {
    baseUrl: process.env.JIRA_BASE_URL ?? '',
    email: process.env.JIRA_EMAIL ?? '',
    apiToken: process.env.JIRA_API_TOKEN ?? '',
    projectKey: process.env.JIRA_PROJECT_KEY ?? 'BT',
    bugIssueType: process.env.JIRA_ISSUE_TYPE ?? 'Bug',
  };
}

// Kept for backward compat — lazy proxy
export const jiraConfig: JiraConfig = new Proxy({} as JiraConfig, {
  get: (_t, prop: string) => getJiraConfig()[prop as keyof JiraConfig],
});

export class JiraClient {
  private readonly http: AxiosInstance;
  private readonly config: JiraConfig;

  constructor(config: JiraConfig = jiraConfig) {
    this.config = config;
    this.http = axios.create({
      baseURL: `${config.baseUrl}/rest/api/3`,
      auth: { username: config.email, password: config.apiToken },
      headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
    });
  }

  // ─── Search ────────────────────────────────────────────────────────────────

  async searchIssues(
    jql: string,
    fields = ['summary', 'status', 'labels', 'priority'],
  ): Promise<JiraIssue[]> {
    const res = await this.http.post('/search', { jql, fields, maxResults: 100 });
    return res.data.issues as JiraIssue[];
  }

  async findOpenBugByLabel(label: string): Promise<JiraIssue | null> {
    try {
      const jql = `project = "${this.config.projectKey}" AND issuetype = "${this.config.bugIssueType}" AND labels = "${label}" AND statusCategory != Done ORDER BY created DESC`;
      const issues = await this.searchIssues(jql);
      return issues[0] ?? null;
    } catch {
      return null;
    }
  }

  // ─── Create / Update ───────────────────────────────────────────────────────

  async createIssue(payload: JiraCreatePayload): Promise<JiraIssue> {
    const res = await this.http.post('/issue', payload);
    logger.info(`Jira issue created: ${res.data.key}`);
    return res.data as JiraIssue;
  }

  async updateIssue(issueKey: string, fields: Record<string, unknown>): Promise<void> {
    await this.http.put(`/issue/${issueKey}`, { fields });
    logger.info(`Jira issue updated: ${issueKey}`);
  }

  async addComment(issueKey: string, bodyText: string): Promise<void> {
    try {
      await this.http.post(`/issue/${issueKey}/comment`, {
        body: this.textToAdf(bodyText),
      });
      logger.info(`Comment added to ${issueKey}`);
    } catch (e: any) {
      logger.warn(`Could not add comment to ${issueKey}: ${e?.response?.status} ${e?.message}`);
    }
  }

  // ─── Transitions ───────────────────────────────────────────────────────────

  async getTransitions(issueKey: string): Promise<Array<{ id: string; name: string }>> {
    const res = await this.http.get(`/issue/${issueKey}/transitions`);
    return res.data.transitions;
  }

  async transitionIssue(issueKey: string, transitionName: string): Promise<void> {
    const transitions = await this.getTransitions(issueKey);
    const t = transitions.find((x) => x.name.toLowerCase().includes(transitionName.toLowerCase()));
    if (!t) {
      logger.warn(
        `Transition "${transitionName}" not found for ${issueKey}. Available: ${transitions.map((x) => x.name).join(', ')}`,
      );
      return;
    }
    await this.http.post(`/issue/${issueKey}/transitions`, { transition: { id: t.id } });
    logger.info(`Transitioned ${issueKey} → ${t.name}`);
  }

  async closeIssue(issueKey: string): Promise<void> {
    // Try common transition names in order
    for (const name of ['Done', 'Close', 'Resolve', 'Fixed']) {
      const transitions = await this.getTransitions(issueKey);
      const t = transitions.find((x) => x.name.toLowerCase().includes(name.toLowerCase()));
      if (t) {
        await this.http.post(`/issue/${issueKey}/transitions`, { transition: { id: t.id } });
        logger.info(`Closed ${issueKey} via "${t.name}"`);
        return;
      }
    }
    logger.warn(`Could not close ${issueKey} — no matching transition found`);
  }

  // ─── Link issues ───────────────────────────────────────────────────────────

  async linkIssue(inwardKey: string, outwardKey: string, linkType = 'Test'): Promise<void> {
    try {
      await this.http.post('/issueLink', {
        type: { name: linkType },
        inwardIssue: { key: inwardKey },
        outwardIssue: { key: outwardKey },
      });
      logger.info(`Linked ${inwardKey} → ${outwardKey} (${linkType})`);
    } catch (e: any) {
      // Fallback to "Relates" if custom link type not found
      if (e?.response?.status === 404 || e?.response?.status === 400) {
        await this.http.post('/issueLink', {
          type: { name: 'Relates' },
          inwardIssue: { key: inwardKey },
          outwardIssue: { key: outwardKey },
        });
        logger.info(`Linked ${inwardKey} → ${outwardKey} (Relates)`);
      } else throw e;
    }
  }

  // ─── Attachments ───────────────────────────────────────────────────────────

  async attachFile(issueKey: string, filePath: string): Promise<void> {
    if (!fs.existsSync(filePath)) {
      logger.warn(`Attachment not found: ${filePath}`);
      return;
    }
    const form = new FormData();
    form.append('file', fs.createReadStream(filePath), path.basename(filePath));
    await this.http.post(`/issue/${issueKey}/attachments`, form, {
      headers: { ...form.getHeaders(), 'X-Atlassian-Token': 'no-check' },
    });
    logger.info(`Attached ${path.basename(filePath)} to ${issueKey}`);
  }

  // ─── Test Execution issue ──────────────────────────────────────────────────

  async createTestExecution(payload: TestExecutionPayload, linkToKey?: string): Promise<JiraIssue> {
    const passed = payload.tests.filter((t) => t.status === 'PASS').length;
    const failed = payload.tests.filter((t) => t.status === 'FAIL').length;
    const skipped = payload.tests.filter((t) => t.status === 'SKIP').length;
    const icon = failed > 0 ? '❌' : '✅';

    const headerRow: JiraAdfNode = {
      type: 'tableRow',
      content: ['Test ID', 'Test Name', 'Status', 'Duration'].map((h) => ({
        type: 'tableHeader',
        attrs: { background: '#f4f5f7' },
        content: [
          { type: 'paragraph', content: [{ type: 'text', text: h, marks: [{ type: 'strong' }] }] },
        ],
      })),
    };

    const dataRows: JiraAdfNode[] = payload.tests.map((t) => ({
      type: 'tableRow',
      content: [
        {
          type: 'tableCell',
          content: [{ type: 'paragraph', content: [{ type: 'text', text: t.testId }] }],
        },
        {
          type: 'tableCell',
          content: [{ type: 'paragraph', content: [{ type: 'text', text: t.testName }] }],
        },
        {
          type: 'tableCell',
          content: [
            {
              type: 'paragraph',
              content: [
                {
                  type: 'text',
                  text:
                    t.status === 'PASS' ? '✅ PASS' : t.status === 'FAIL' ? '❌ FAIL' : '⏭ SKIP',
                  marks: t.status === 'FAIL' ? [{ type: 'strong' }] : [],
                },
              ],
            },
          ],
        },
        {
          type: 'tableCell',
          content: [
            {
              type: 'paragraph',
              content: [{ type: 'text', text: `${(t.duration / 1000).toFixed(2)}s` }],
            },
          ],
        },
      ],
    }));

    const summaryPara: JiraAdfNode = {
      type: 'paragraph',
      content: [
        { type: 'text', text: 'Summary: ', marks: [{ type: 'strong' }] },
        { type: 'text', text: `${passed} passed, ${failed} failed, ${skipped} skipped` },
      ],
    };

    const descContent: JiraAdfNode[] = [
      {
        type: 'paragraph',
        content: [
          {
            type: 'text',
            text: '🤖 Automated test execution report generated by BestTester / Playwright.',
          },
        ],
      },
      summaryPara,
      ...(payload.buildUrl
        ? [
            {
              type: 'paragraph' as const,
              content: [
                { type: 'text', text: 'Build: ', marks: [{ type: 'strong' }] },
                { type: 'text', text: payload.buildUrl },
              ],
            },
          ]
        : []),
      {
        type: 'table',
        attrs: { isNumberColumnEnabled: false, layout: 'default' },
        content: [headerRow, ...dataRows],
      },
    ];

    const issue = await this.createIssue({
      fields: {
        project: { key: this.config.projectKey },
        summary: `${icon} ${payload.summary} — ${passed}/${payload.tests.length} passed`,
        issuetype: { name: 'Test Execution' },
        priority: { name: failed > 0 ? 'High' : 'Medium' },
        labels: ['automated-test', 'playwright', 'test-execution'],
        description: { type: 'doc', version: 1, content: descContent },
      },
    } as any);

    await this.attachFile(issue.key, payload.junitPath);
    if (linkToKey) await this.linkIssue(issue.key, linkToKey);

    logger.info(`Test Execution issue created: ${issue.key}`);
    return issue;
  }

  // ─── High-level: sync test failures ────────────────────────────────────────

  async syncTestFailures(
    failures: TestFailure[],
    passedTestNames: string[],
  ): Promise<JiraSyncResult> {
    const result: JiraSyncResult = { created: [], updated: [], closed: [], skipped: [] };

    // Create/update bugs for each failure
    for (const failure of failures) {
      const label = this.labelFromTest(failure.testName);
      const existing = await this.findOpenBugByLabel(label);

      if (existing) {
        // Update existing bug with latest failure info
        await this.addComment(existing.key, this.buildFailureComment(failure));
        result.updated.push(existing.key);
      } else {
        // Create new bug
        const issue = await this.createIssue(this.buildBugPayload(failure, label));
        result.created.push(issue.key);
      }
    }

    // Close bugs for tests that are now passing
    for (const testName of passedTestNames) {
      const label = this.labelFromTest(testName);
      const existing = await this.findOpenBugByLabel(label);
      if (existing) {
        try {
          await this.addComment(
            existing.key,
            `✅ Test is now passing as of build ${failures[0]?.buildNumber ?? 'latest'}. Auto-closing.`,
          );
          await this.closeIssue(existing.key);
          result.closed.push(existing.key);
        } catch (e: any) {
          logger.warn(`Could not close ${existing.key}: ${e?.message}`);
          result.skipped.push(existing.key);
        }
      }
    }

    return result;
  }

  // ─── Helpers ───────────────────────────────────────────────────────────────

  buildBugPayload(failure: TestFailure, label: string): JiraCreatePayload {
    const buildInfo = failure.buildUrl
      ? `\n\nJenkins Build: ${failure.buildUrl}\nBuild #${failure.buildNumber}`
      : '';

    return {
      fields: {
        project: { key: this.config.projectKey },
        summary: `[AUTO] Test Failure: ${failure.testName}`,
        issuetype: { name: this.config.bugIssueType },
        priority: { name: 'High' },
        labels: ['automated-test', 'playwright', label],
        description: this.textToAdf(
          `*Test:* ${failure.testName}\n` +
            `*Suite:* ${failure.suiteName}\n` +
            `*Duration:* ${(failure.duration / 1000).toFixed(1)}s\n` +
            `*File:* ${failure.file ?? 'unknown'}\n\n` +
            `*Error:*\n{code}\n${failure.errorMessage}\n{code}` +
            buildInfo,
        ),
      },
    };
  }

  buildFailureComment(failure: TestFailure): string {
    return (
      `🔴 *Test still failing* — Build #${failure.buildNumber ?? 'unknown'}\n\n` +
      `*Error:*\n\`\`\`\n${failure.errorMessage.slice(0, 1000)}\n\`\`\`\n\n` +
      (failure.buildUrl ? `Jenkins: ${failure.buildUrl}` : '')
    );
  }

  labelFromTest(testName: string): string {
    return `test-${testName
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .slice(0, 60)}`;
  }

  textToAdf(text: string): JiraAdfDoc {
    const paragraphs: JiraAdfNode[] = text.split('\n\n').map((block) => ({
      type: 'paragraph',
      content: [{ type: 'text', text: block.replace(/\n/g, ' ') }],
    }));
    return { type: 'doc', version: 1, content: paragraphs };
  }
}
