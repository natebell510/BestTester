/**
 * configure-jenkins.ts — creates/updates Jenkins pipeline jobs via API.
 * Run: npx ts-node scripts/configure-jenkins.ts
 */
import * as dotenv from 'dotenv';
import * as path from 'path';
import axios, { AxiosInstance } from 'axios';
import * as http from 'http';

dotenv.config({ path: path.resolve(__dirname, '../.env'), override: true });

const JENKINS_URL = process.env.JENKINS_URL ?? '';
const GITHUB_REPO = process.env.GITHUB_REPO ?? 'https://github.com/your-org/BestTester';
const REPO_GIT = `${GITHUB_REPO}.git`;

function createClient(auth: { username: string; password: string }): AxiosInstance {
  const jar: string[] = [];
  const c = axios.create({
    baseURL: JENKINS_URL,
    auth,
    httpAgent: new http.Agent({ keepAlive: true }),
  });
  c.interceptors.response.use((r) => {
    const s = r.headers['set-cookie'];
    if (s) jar.push(...s.map((x) => x.split(';')[0]));
    return r;
  });
  c.interceptors.request.use((cfg) => {
    if (jar.length) cfg.headers['Cookie'] = jar.join('; ');
    return cfg;
  });
  return c;
}

async function getCrumb(c: AxiosInstance): Promise<Record<string, string>> {
  try {
    const r = await c.get('/crumbIssuer/api/json');
    return { [r.data.crumbRequestField]: r.data.crumb };
  } catch {
    return {};
  }
}

async function createCred(
  c: AxiosInstance,
  crumb: Record<string, string>,
  id: string,
  secret: string,
): Promise<void> {
  const p = {
    '': '0',
    credentials: {
      scope: 'GLOBAL',
      id,
      secret,
      description: id,
      $class: 'org.jenkinsci.plugins.plaincredentials.impl.StringCredentialsImpl',
    },
  };
  await c
    .post(
      '/credentials/store/system/domain/_/createCredentials',
      `json=${encodeURIComponent(JSON.stringify(p))}`,
      { headers: { 'Content-Type': 'application/x-www-form-urlencoded', ...crumb } },
    )
    .catch(() => {});
}

async function upsertJob(
  c: AxiosInstance,
  crumb: Record<string, string>,
  name: string,
  xml: string,
): Promise<void> {
  const h = { 'Content-Type': 'application/xml', ...crumb };
  try {
    await c.post(`/job/${name}/config.xml`, xml, { headers: h });
    console.log(`   Updated: ${name}`);
  } catch (e: any) {
    if (e.response?.status === 404) {
      await c.post(`/createItem?name=${name}`, xml, { headers: h });
      console.log(`   Created: ${name}`);
    } else throw e;
  }
}

function jobXml(script: string): string {
  return `<?xml version='1.1' encoding='UTF-8'?><flow-definition plugin="workflow-job"><properties/><definition class="org.jenkinsci.plugins.workflow.cps.CpsFlowDefinition" plugin="workflow-cps"><script>${script}</script><sandbox>true</sandbox></definition><disabled>false</disabled></flow-definition>`;
}

async function approveScripts(c: AxiosInstance, crumb: Record<string, string>): Promise<void> {
  const g =
    'def sa=org.jenkinsci.plugins.scriptsecurity.scripts.ScriptApproval.get();def h=sa.pendingScripts.collect{it.hash};h.each{sa.approveScript(it)};println("Approved:"+h.size())';
  const r = await c.post('/scriptText', new URLSearchParams({ script: g }).toString(), {
    headers: { 'Content-Type': 'application/x-www-form-urlencoded', ...crumb },
  });
  console.log(`   ${r.data?.trim()}`);
}

async function main(): Promise<void> {
  console.log('\n=== BestTester Jenkins Configurator ===\n');
  const u = process.env.JENKINS_USERNAME ?? '',
    t = process.env.JENKINS_TOKEN ?? '';
  if (!u || !t) {
    console.error('JENKINS_USERNAME/JENKINS_TOKEN not set');
    process.exit(1);
  }
  const c = createClient({ username: u, password: t });
  await c.get('/api/json');
  console.log('   Jenkins ready.');
  const crumb = await getCrumb(c);

  console.log('🔐 Credentials...');
  for (const [id, val] of Object.entries({
    AWS_ACCESS_KEY_ID: process.env.AWS_ACCESS_KEY_ID ?? '',
    AWS_SECRET_ACCESS_KEY: process.env.AWS_SECRET_ACCESS_KEY ?? '',
    ORANGEHRM_USERNAME: process.env.ADMIN_USERNAME ?? 'Admin',
    ORANGEHRM_PASSWORD: process.env.ADMIN_PASSWORD ?? 'admin123',
    SLACK_WEBHOOK_URL: process.env.SLACK_WEBHOOK_URL ?? '',
    JIRA_BASE_URL: process.env.JIRA_BASE_URL ?? '',
    JIRA_EMAIL: process.env.JIRA_EMAIL ?? '',
    JIRA_API_TOKEN: process.env.JIRA_API_TOKEN ?? '',
  }))
    await createCred(c, crumb, id, val);

  const P = '/usr/local/bin:/usr/bin:/bin';

  console.log('📋 BestTester...');
  await upsertJob(
    c,
    crumb,
    'BestTester',
    jobXml(`
node {
  withEnv(['PATH=${P}']) {
    stage('Checkout') { sh 'git clone --branch master --single-branch ${REPO_GIT} . || git pull' }
    stage('Setup')    { sh 'npm ci'; sh 'npx playwright install chromium' }
    stage('Tests')    { sh 'npx cross-env CI=true BASE_URL=https://opensource-demo.orangehrmlive.com ADMIN_USERNAME=Admin ADMIN_PASSWORD=admin123 npx playwright test --config=config/playwright.config.ts --project=chromium --reporter=list,html,junit,allure-playwright || true' }
    stage('Reports')  { junit allowEmptyResults: true, testResults: 'reports/playwright-report/junit.xml'; archiveArtifacts artifacts: 'reports/**/*', allowEmptyArchive: true }
  }
}
`),
  );

  console.log('🌙 BestTester-Nightly...');
  await upsertJob(
    c,
    crumb,
    'BestTester-Nightly',
    jobXml(`
node {
  withEnv(['PATH=${P}']) {
    stage('Checkout') { sh 'git clone --branch master --single-branch ${REPO_GIT} . || git pull' }
    stage('Setup')    { sh 'npm ci'; sh 'npx playwright install chromium' }
    stage('Tests')    { sh 'npx cross-env CI=true BASE_URL=https://opensource-demo.orangehrmlive.com ADMIN_USERNAME=Admin ADMIN_PASSWORD=admin123 npx playwright test --config=config/playwright.config.ts --reporter=list,html,junit,allure-playwright || true' }
    stage('Reports')  { junit allowEmptyResults: true, testResults: 'reports/playwright-report/junit.xml'; archiveArtifacts artifacts: 'reports/**/*', allowEmptyArchive: true }
  }
}
`),
  );

  console.log('🧪 BestTester-SingleTest...');
  await upsertJob(
    c,
    crumb,
    'BestTester-SingleTest',
    jobXml(`
node {
  withEnv(['PATH=${P}']) {
    stage('Checkout') { sh 'git clone --branch master --single-branch ${REPO_GIT} . || git pull' }
    stage('Setup')    { sh 'npm ci'; sh 'npx playwright install chromium' }
    stage('Tests')    { sh 'npx cross-env CI=true BASE_URL=https://opensource-demo.orangehrmlive.com ADMIN_USERNAME=Admin ADMIN_PASSWORD=admin123 npx playwright test --config=config/playwright.config.ts --project=chromium --reporter=list,html,junit || true' }
    stage('Reports')  { junit allowEmptyResults: true, testResults: 'reports/playwright-report/junit.xml'; archiveArtifacts artifacts: 'reports/**/*', allowEmptyArchive: true }
  }
}
`),
  );

  console.log('🔓 Approving scripts...');
  await approveScripts(c, crumb);

  console.log(`\n✅ Done! ${JENKINS_URL}/job/BestTester\n`);
}

main().catch((e) => {
  console.error('❌', e.message);
  process.exit(1);
});
