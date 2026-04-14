/**
 * @file jira-sync-agent.ts
 * @description Reads Jenkins build results, creates/updates/closes Jira issues for test failures.
 *
 * Usage:
 *   npm run agent:jira -- --build latest
 *   npm run agent:jira -- --build 42
 *   npm run agent:jira -- --junit reports/playwright-report/junit.xml
 *   npm run agent:jira -- --junit reports/playwright-report/junit.xml --build 42 --dry-run
 */
import * as dotenv from 'dotenv';
import * as path from 'path';
import * as fs from 'fs';
import axios from 'axios';
import { logger } from '../src/utils/logger';
import { JiraClient, jiraConfig } from '../src/utils/jira';
import { parseJUnitReport, readPlaywrightResults } from '../src/utils/jira-reporter';

dotenv.config({ path: path.resolve(__dirname, '../.env'), override: true });

const args = process.argv.slice(2);
const get  = (flag: string) => { const i = args.indexOf(flag); return i !== -1 ? args[i + 1] : undefined; };
const has  = (flag: string) => args.includes(flag);

const buildArg  = get('--build');
const junitArg  = get('--junit');
const jsonArg   = get('--json');
const jiraKeyArg = get('--jira-key');
const dryRun    = has('--dry-run');

const JENKINS_URL   = process.env.JENKINS_URL   ?? '';
const JENKINS_USER  = process.env.JENKINS_USERNAME ?? '';
const JENKINS_TOKEN = process.env.JENKINS_TOKEN ?? '';
const jenkinsAuth   = { username: JENKINS_USER, password: JENKINS_TOKEN };

async function getLatestBuildNumber(jobName: string): Promise<number> {
  const res = await axios.get(`${JENKINS_URL}/job/${jobName}/lastBuild/api/json`, { auth: jenkinsAuth });
  return res.data.number;
}

async function getBuildInfo(jobName: string, buildNumber: number): Promise<{ url: string; result: string }> {
  const res = await axios.get(`${JENKINS_URL}/job/${jobName}/${buildNumber}/api/json`, { auth: jenkinsAuth });
  return { url: res.data.url, result: res.data.result };
}

async function downloadArtifact(jobName: string, buildNumber: number, artifact: string, dest: string): Promise<boolean> {
  try {
    const url = `${JENKINS_URL}/job/${jobName}/${buildNumber}/artifact/${artifact}`;
    const res = await axios.get(url, { auth: jenkinsAuth, responseType: 'arraybuffer' });
    fs.mkdirSync(path.dirname(dest), { recursive: true });
    fs.writeFileSync(dest, res.data);
    return true;
  } catch {
    return false;
  }
}

async function main() {
  console.log('\n=== BestTester Jira Sync Agent ===\n');

  if (!jiraConfig.baseUrl || !jiraConfig.email || !jiraConfig.apiToken) {
    console.error('❌ Missing Jira config. Set JIRA_BASE_URL, JIRA_EMAIL, JIRA_API_TOKEN in .env');
    process.exit(1);
  }

  const jira = new JiraClient(jiraConfig);
  const jobName = 'BestTester';

  let junitPath = junitArg ?? 'reports/playwright-report/junit.xml';
  let jsonPath  = jsonArg  ?? 'reports/playwright-report/results.json';
  let buildNumber: number | undefined;
  let buildUrl: string | undefined;

  // Fetch from Jenkins if --build specified
  if (buildArg && JENKINS_URL) {
    buildNumber = buildArg === 'latest' ? await getLatestBuildNumber(jobName) : parseInt(buildArg, 10);
    const info  = await getBuildInfo(jobName, buildNumber);
    buildUrl    = info.url;
    console.log(`📦 Jenkins build #${buildNumber} — ${info.result} — ${buildUrl}`);

    // Download JUnit XML from Jenkins artifacts
    const tmpJunit = path.resolve(__dirname, '../.tmp/junit.xml');
    const downloaded = await downloadArtifact(jobName, buildNumber, 'reports/playwright-report/junit.xml', tmpJunit);
    if (downloaded) {
      junitPath = tmpJunit;
      console.log('   Downloaded JUnit XML from Jenkins');
    } else {
      console.log('   JUnit XML not found in Jenkins artifacts, using local file');
    }
  }

  // Parse test results
  const { failures, passedNames } = parseJUnitReport(junitPath, buildUrl, buildNumber);

  // Also try JSON for richer data
  const jsonResults = readPlaywrightResults(jsonPath);

  console.log(`\n📊 Results: ${jsonResults.passed} passed, ${jsonResults.failed} failed, ${jsonResults.skipped} skipped`);
  console.log(`   Failures to sync: ${failures.length}`);
  console.log(`   Passing tests to auto-close: ${passedNames.length}`);

  if (dryRun) {
    console.log('\n🔍 DRY RUN — no Jira changes will be made\n');
    if (failures.length) {
      console.log('Would CREATE/UPDATE bugs for:');
      failures.forEach(f => console.log(`  ❌ ${f.testName}`));
    }
    if (passedNames.length) {
      console.log('\nWould CLOSE bugs for:');
      passedNames.slice(0, 10).forEach(n => console.log(`  ✅ ${n}`));
    }
    return;
  }

  if (!failures.length && !passedNames.length) {
    console.log('\n✅ No failures and no newly passing tests — nothing to sync.\n');
    return;
  }

  console.log('\n🔄 Syncing to Jira...');
  const result = await jira.syncTestFailures(failures, passedNames);

  // Create Test Execution linked to the provided Jira key
  if (jiraKeyArg) {
    const { readPlaywrightResults: _ } = await import('../src/utils/jira-reporter');
    const jsonResults2 = readPlaywrightResults(jsonPath);
    const tests = jsonResults2.failures.map(f => ({
      testId:   f.testName.slice(0, 20),
      testName: f.testName,
      status:   'FAIL' as const,
      duration: f.duration,
    }));
    const execution = await jira.createTestExecution(
      { summary: `Jenkins Build #${buildNumber ?? 'latest'}`, junitPath, tests, buildUrl, buildNumber },
      jiraKeyArg,
    );
    console.log(`   Test Execution: ${execution.key} linked to ${jiraKeyArg}`);
    await jira.addComment(
      jiraKeyArg,
      `🤖 Test execution added by Jenkins Build #${buildNumber ?? 'latest'}

Test Execution: ${jiraConfig.baseUrl}/browse/${execution.key}
Build: ${buildUrl ?? 'N/A'}

Results: ${jsonResults.passed} passed, ${jsonResults.failed} failed, ${jsonResults.skipped} skipped`,
    );
  }

  // Attach JUnit XML to each created issue
  for (const key of result.created) {
    await jira.attachFile(key, junitPath);
  }

  // Print summary
  console.log('\n✅ Jira Sync Complete:');
  if (result.created.length)  console.log(`   Created  : ${result.created.join(', ')}`);
  if (result.updated.length)  console.log(`   Updated  : ${result.updated.join(', ')}`);
  if (result.closed.length)   console.log(`   Closed   : ${result.closed.join(', ')}`);
  if (result.skipped.length)  console.log(`   Skipped  : ${result.skipped.length} (already open)`);

  // Save sync report
  const reportPath = path.resolve(__dirname, '../reports/jira-sync-report.json');
  fs.mkdirSync(path.dirname(reportPath), { recursive: true });
  fs.writeFileSync(reportPath, JSON.stringify({
    timestamp: new Date().toISOString(),
    buildNumber,
    buildUrl,
    ...result,
    failures: failures.map(f => ({ test: f.testName, error: f.errorMessage.slice(0, 200) })),
  }, null, 2));
  console.log(`\n   Report saved: ${reportPath}\n`);
}

main().catch(e => { console.error('❌', e.message); process.exit(1); });
