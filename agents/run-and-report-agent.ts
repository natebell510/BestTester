#!/usr/bin/env ts-node
/**
 * @file run-and-report-agent.ts
 * @description Full workflow: trigger Jenkins (all tests) → poll until done →
 *              download JUnit report → sync failures/passes to Jira board.
 *              Optionally link all results to an existing Jira issue (story/bug).
 *
 * Usage:
 *   npm run agent:run-and-report
 *   npm run agent:run-and-report -- --suite smoke
 *   npm run agent:run-and-report -- --jira-key SCRUM-5
 *   npm run agent:run-and-report -- --suite regression --jira-key SCRUM-5 --dry-run
 */
import * as dotenv from 'dotenv';
import * as path from 'path';
dotenv.config({ path: path.resolve(__dirname, '../.env'), override: true });

import * as fs from 'fs';
import axios from 'axios';
import { triggerJob, pollUntilComplete, getJobStatus } from '../src/utils/jenkins';
import { JiraClient, jiraConfig } from '../src/utils/jira';
import { parseJUnitReport, readPlaywrightResults } from '../src/utils/jira-reporter';
import { postMessage } from '../src/utils/slack';
import { logger } from '../src/utils/logger';

const args   = process.argv.slice(2);
const get    = (flag: string) => { const i = args.indexOf(flag); return i !== -1 ? args[i + 1] : undefined; };
const has    = (flag: string) => args.includes(flag);

const SUITE    = get('--suite') ?? 'all';
const DRY_RUN  = has('--dry-run');
const JIRA_KEY = get('--jira-key');   // e.g. SCRUM-5 — link all results to this issue
const JOB      = 'BestTester';

const JENKINS_URL   = process.env.JENKINS_URL   ?? '';
const JENKINS_USER  = process.env.JENKINS_USERNAME ?? '';
const JENKINS_TOKEN = process.env.JENKINS_TOKEN ?? '';
const jenkinsAuth   = { username: JENKINS_USER, password: JENKINS_TOKEN };

// ─── Helpers ─────────────────────────────────────────────────────────────────

async function resolveBuildNumber(queueId: number): Promise<number> {
  // Jenkins queue item → build number (poll until executable is assigned)
  for (let i = 0; i < 30; i++) {
    await sleep(5_000);
    const res = await axios.get(`${JENKINS_URL}/queue/item/${queueId}/api/json`, { auth: jenkinsAuth });
    const buildNumber = res.data?.executable?.number;
    if (buildNumber) return buildNumber;
    logger.info(`Waiting for build to start... (attempt ${i + 1})`);
  }
  throw new Error('Build did not start within 150 seconds');
}

async function downloadArtifact(buildNumber: number, artifact: string, dest: string): Promise<boolean> {
  try {
    const url = `${JENKINS_URL}/job/${JOB}/${buildNumber}/artifact/${artifact}`;
    const res = await axios.get(url, { auth: jenkinsAuth, responseType: 'arraybuffer' });
    fs.mkdirSync(path.dirname(dest), { recursive: true });
    fs.writeFileSync(dest, res.data);
    return true;
  } catch {
    return false;
  }
}

function sleep(ms: number) { return new Promise(r => setTimeout(r, ms)); }

// ─── Main ─────────────────────────────────────────────────────────────────────

async function main() {
  console.log('\n=== BestTester: Run-and-Report Agent ===\n');

  if (!JENKINS_URL) { console.error('❌ JENKINS_URL not set'); process.exit(1); }
  if (!jiraConfig.baseUrl) { console.error('❌ JIRA_BASE_URL not set'); process.exit(1); }

  if (JIRA_KEY) console.log(`   Jira key  : ${JIRA_KEY} (results will be linked)`);

  // ── 1. Trigger Jenkins ────────────────────────────────────────────────────
  console.log(`🚀 Triggering Jenkins job "${JOB}" — suite: ${SUITE}`);
  const params: Record<string, string> = SUITE !== 'all' ? { TEST_SUITE: SUITE } : {};
  const queueId = await triggerJob(JOB, params);
  console.log(`   Queued — id: ${queueId}`);
  await postMessage(`🚀 *BestTester* triggered on Jenkins (suite: *${SUITE}*). Queue id: ${queueId}`);

  // ── 2. Resolve build number ───────────────────────────────────────────────
  console.log('⏳ Waiting for build to start...');
  const buildNumber = await resolveBuildNumber(queueId);
  const buildUrl    = `${JENKINS_URL}/job/${JOB}/${buildNumber}/`;
  console.log(`   Build #${buildNumber} started → ${buildUrl}`);

  // ── 3. Stream console output while polling ────────────────────────────────
  console.log('⏳ Streaming console output...\n');
  let logOffset = 0;
  let status = 'BUILDING';
  for (let i = 0; i < 120; i++) {
    try {
      const logRes = await axios.get(
        `${JENKINS_URL}/job/${JOB}/${buildNumber}/logText/progressiveText`,
        { auth: jenkinsAuth, params: { start: logOffset }, transformResponse: [d => d] },
      );
      const chunk = logRes.data as string;
      if (chunk) { process.stdout.write(chunk); logOffset += Buffer.byteLength(chunk); }
      const more = logRes.headers['x-more-data'];
      if (more !== 'true') break;
    } catch { /* build may not have started logging yet */ }
    await sleep(10_000);
    status = await getJobStatus(JOB, buildNumber).catch(() => 'BUILDING');
    if (status !== 'BUILDING') {
      // Grab remaining log
      try {
        const finalLog = await axios.get(
          `${JENKINS_URL}/job/${JOB}/${buildNumber}/logText/progressiveText`,
          { auth: jenkinsAuth, params: { start: logOffset }, transformResponse: [d => d] },
        );
        if (finalLog.data) process.stdout.write(finalLog.data as string);
      } catch {}
      break;
    }
  }
  if (status === 'BUILDING') {
    status = await pollUntilComplete(JOB, buildNumber, 15_000, 60);
  }
  console.log('');
  const icon   = status === 'SUCCESS' ? '✅' : status === 'UNSTABLE' ? '⚠️' : '❌';
  console.log(`${icon} Build #${buildNumber} finished: ${status}`);
  await postMessage(`${icon} *BestTester* build #${buildNumber} finished: *${status}*\n${buildUrl}`);

  // ── 4. Download JUnit XML from Jenkins artifacts ──────────────────────────
  const junitDest = path.resolve(__dirname, '../.tmp/junit.xml');
  const jsonDest  = path.resolve(__dirname, '../.tmp/results.json');

  const junitOk = await downloadArtifact(buildNumber, 'reports/playwright-report/junit.xml', junitDest);
  const jsonOk  = await downloadArtifact(buildNumber, 'reports/playwright-report/results.json', jsonDest);

  const junitPath = junitOk ? junitDest : 'reports/playwright-report/junit.xml';
  const jsonPath  = jsonOk  ? jsonDest  : 'reports/playwright-report/results.json';

  console.log(`\n📄 JUnit XML  : ${junitOk  ? junitDest : 'using local fallback'}`);
  console.log(`📄 Results JSON: ${jsonOk  ? jsonDest  : 'using local fallback'}`);

  // ── 5. Parse results ──────────────────────────────────────────────────────
  const { failures, passedNames } = parseJUnitReport(junitPath, buildUrl, buildNumber);
  const summary = readPlaywrightResults(jsonPath);

  console.log(`\n📊 Results: ${summary.passed} passed | ${summary.failed} failed | ${summary.skipped} skipped`);
  console.log(`   Failures to sync : ${failures.length}`);
  console.log(`   Passes to close  : ${passedNames.length}`);

  if (DRY_RUN) {
    console.log('\n🔍 DRY RUN — no Jira changes made\n');
    if (JIRA_KEY) console.log(`   Would link results to ${JIRA_KEY}`);
    failures.forEach(f => console.log(`  ❌ ${f.testName}`));
    passedNames.slice(0, 10).forEach(n => console.log(`  ✅ ${n}`));
    return;
  }

  // ── 6. Sync to Jira ───────────────────────────────────────────────────────
  if (!failures.length && !passedNames.length && !JIRA_KEY) {
    console.log('\n✅ Nothing to sync to Jira.\n');
    return;
  }

  console.log('\n🔄 Syncing to Jira...');
  const jira   = new JiraClient(jiraConfig);
  const result = await jira.syncTestFailures(failures, passedNames);

  // Attach JUnit XML to each newly created issue
  for (const key of result.created) {
    await jira.attachFile(key, junitPath);
  }

  // ── 7. Link all created/updated issues to the provided Jira key ───────────
  if (JIRA_KEY) {
    console.log(`\n🔗 Linking results to ${JIRA_KEY}...`);

    // Post a test-run summary comment on the parent issue
    const commentLines = [
      `🤖 *Playwright Test Run — Build #${buildNumber}* — ${status}`,
      `Suite: ${SUITE} | ${buildUrl}`,
      `📊 Passed: ${summary.passed} | Failed: ${summary.failed} | Skipped: ${summary.skipped}`,
    ];
    if (result.created.length) commentLines.push(`🐛 New bugs created: ${result.created.join(', ')}`);
    if (result.updated.length) commentLines.push(`🔄 Bugs updated: ${result.updated.join(', ')}`);
    if (result.closed.length)  commentLines.push(`✅ Bugs closed: ${result.closed.join(', ')}`);
    if (!failures.length)      commentLines.push('✅ All tests passed — no failures to report.');

    await jira.addComment(JIRA_KEY, commentLines.join('\n'));
    await jira.attachFile(JIRA_KEY, junitPath);

    // Link each created bug back to the parent issue
    for (const key of result.created) {
      await jira.linkIssue(key, JIRA_KEY);
    }
    for (const key of result.updated) {
      await jira.linkIssue(key, JIRA_KEY);
    }

    console.log(`   Comment + JUnit XML attached to ${JIRA_KEY}`);
    console.log(`   Linked issues: ${[...result.created, ...result.updated].join(', ') || 'none'}`);
  }

  console.log('\n✅ Jira Sync Complete:');
  if (result.created.length) console.log(`   Created : ${result.created.join(', ')}`);
  if (result.updated.length) console.log(`   Updated : ${result.updated.join(', ')}`);
  if (result.closed.length)  console.log(`   Closed  : ${result.closed.join(', ')}`);
  if (result.skipped.length) console.log(`   Skipped : ${result.skipped.length}`);

  // ── 7. Save sync report ───────────────────────────────────────────────────
  const reportPath = path.resolve(__dirname, '../reports/jira-sync-report.json');
  fs.mkdirSync(path.dirname(reportPath), { recursive: true });
  fs.writeFileSync(reportPath, JSON.stringify({
    timestamp: new Date().toISOString(),
    buildNumber,
    buildUrl,
    status,
    linkedJiraKey: JIRA_KEY ?? null,
    summary: { passed: summary.passed, failed: summary.failed, skipped: summary.skipped },
    ...result,
    failures: failures.map(f => ({ test: f.testName, error: f.errorMessage.slice(0, 200) })),
  }, null, 2));
  console.log(`\n   Report saved: ${reportPath}\n`);

  await postMessage(
    `📋 *Jira Sync* — Build #${buildNumber}\n` +
    `Created: ${result.created.length} | Updated: ${result.updated.length} | Closed: ${result.closed.length}\n` +
    (JIRA_KEY ? `Linked to: *${JIRA_KEY}*\n` : '') +
    `${result.created.length ? result.created.join(', ') : 'No new issues'}`,
  );
}

main().catch(e => { console.error('❌', e.message); process.exit(1); });
