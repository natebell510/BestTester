/**
 * configure-jenkins.ts
 * Automates Jenkins setup: skip wizard, install plugins, create credentials, create pipeline job.
 * Run: npx ts-node scripts/configure-jenkins.ts
 */
import * as dotenv from 'dotenv';
import * as path from 'path';
import * as fs from 'fs';
import axios, { AxiosInstance } from 'axios';
import * as http from 'http';

dotenv.config({ path: path.resolve(__dirname, '../.env'), override: true });

const JENKINS_URL = process.env.JENKINS_URL ?? 'http://98.81.219.145:8080';
const GITHUB_REPO = process.env.GITHUB_REPO ?? 'https://github.com/your-org/BestTester';
const KEY_FILE    = path.resolve(__dirname, '../besttester-jenkins-key.pem');
const EC2_IP      = '98.81.219.145';

// Create an axios instance that preserves cookies across requests (required for CSRF crumb)
function createJenkinsClient(auth: { username: string; password: string }): AxiosInstance {
  const cookieJar: string[] = [];
  const client = axios.create({
    baseURL: JENKINS_URL,
    auth,
    httpAgent: new http.Agent({ keepAlive: true }),
  });
  client.interceptors.response.use(res => {
    const setCookie = res.headers['set-cookie'];
    if (setCookie) cookieJar.push(...setCookie.map(c => c.split(';')[0]));
    return res;
  });
  client.interceptors.request.use(config => {
    if (cookieJar.length) config.headers['Cookie'] = cookieJar.join('; ');
    return config;
  });
  return client;
}

// Resolve Jenkins auth: prefer .env token (post-setup), fall back to SSH initial password (fresh install)
function getAuthFromEnv(): { username: string; password: string } | null {
  const u = process.env.JENKINS_USERNAME;
  const t = process.env.JENKINS_TOKEN;
  if (u && t) return { username: u, password: t };
  return null;
}

async function getInitialPassword(): Promise<string> {
  const { execSync } = require('child_process');
  try {
    const pw = execSync(
      `ssh -i "${KEY_FILE}" -o StrictHostKeyChecking=no ec2-user@${EC2_IP} "sudo cat /var/lib/jenkins/secrets/initialAdminPassword"`,
      { encoding: 'utf-8', timeout: 30_000 },
    ).trim();
    console.log('   Initial password retrieved via SSH.');
    return pw;
  } catch {
    console.log('   SSH failed — trying default password file...');
    return '';
  }
}

async function waitForJenkins(client: AxiosInstance): Promise<void> {
  for (let i = 0; i < 20; i++) {
    try {
      await client.get('/api/json');
      console.log('   Jenkins API is ready.');
      return;
    } catch {
      process.stdout.write('.');
      await new Promise(r => setTimeout(r, 5_000));
    }
  }
  throw new Error('Jenkins API not ready after timeout');
}

async function getCrumb(client: AxiosInstance): Promise<Record<string, string>> {
  try {
    const res = await client.get('/crumbIssuer/api/json');
    console.log('   CSRF crumb obtained.');
    return { [res.data.crumbRequestField]: res.data.crumb };
  } catch {
    console.log('   No crumb issuer (CSRF may be disabled) — continuing without crumb.');
    return {};
  }
}

async function installPlugins(client: AxiosInstance, crumb: Record<string, string>): Promise<void> {
  console.log('🔌 Installing plugins...');
  const plugins = [
    'git', 'workflow-aggregator', 'pipeline-stage-view',
    'junit', 'htmlpublisher', 'ansicolor', 'timestamper',
    'credentials-binding', 'nodejs', 'slack',
  ];
  // Use POST to pluginManager/install with form data
  const pluginList = plugins.map(p => `plugin.${p}.default=on`).join('&');
  await client.post(
    '/pluginManager/install',
    pluginList + '&dynamicLoad=true',
    { headers: { 'Content-Type': 'application/x-www-form-urlencoded', ...crumb } },
  ).catch(e => console.log(`   Plugin install response: ${e.response?.status ?? e.message}`));
  console.log('   Plugins queued for installation.');
}

async function createCredential(
  client: AxiosInstance,
  crumb: Record<string, string>,
  id: string,
  secret: string,
  description: string,
): Promise<void> {
  const payload = {
    '': '0',
    credentials: {
      scope: 'GLOBAL',
      id,
      secret,
      description,
      $class: 'org.jenkinsci.plugins.plaincredentials.impl.StringCredentialsImpl',
    },
  };
  await client.post(
    '/credentials/store/system/domain/_/createCredentials',
    `json=${encodeURIComponent(JSON.stringify(payload))}`,
    { headers: { 'Content-Type': 'application/x-www-form-urlencoded', ...crumb } },
  ).catch(() => console.log(`   Credential ${id} may already exist.`));
}

async function upsertJob(
  client: AxiosInstance,
  crumb: Record<string, string>,
  name: string,
  xml: string,
): Promise<void> {
  const headers = { 'Content-Type': 'application/xml', ...crumb };
  console.log(`   Attempting upsert for ${name} (crumb keys: ${Object.keys(crumb).join(', ') || 'none'})...`);
  // Try update first (job may already exist)
  try {
    await client.post(`/job/${name}/config.xml`, xml, { headers });
    console.log(`   Job updated: ${name}`);
    return;
  } catch (e: any) {
    if (e.response?.status === 404) {
      try {
        await client.post(`/createItem?name=${name}`, xml, { headers });
        console.log(`   Job created: ${name}`);
        return;
      } catch (e2: any) {
        console.error(`   Failed to create ${name}: ${e2.response?.status} ${e2.response?.statusText}`);
        throw e2;
      }
    }
    console.error(`   Failed to update ${name}: ${e.response?.status} ${e.response?.statusText} ${JSON.stringify(e.response?.data)}`);
    throw e;
  }
}

async function createPipelineJob(client: AxiosInstance, crumb: Record<string, string>): Promise<void> {
  console.log('📋 Creating BestTester pipeline job...');
  const jobXml = `<?xml version='1.1' encoding='UTF-8'?>
<flow-definition plugin="workflow-job">
  <description>BestTester Playwright + AI Test Pipeline</description>
  <keepDependencies>false</keepDependencies>
  <properties>
    <org.jenkinsci.plugins.workflow.job.properties.PipelineTriggersJobProperty>
      <triggers>
        <hudson.triggers.TimerTrigger>
          <spec>H */2 * * *</spec>
        </hudson.triggers.TimerTrigger>
      </triggers>
    </org.jenkinsci.plugins.workflow.job.properties.PipelineTriggersJobProperty>
  </properties>
  <definition class="org.jenkinsci.plugins.workflow.cps.CpsScmFlowDefinition" plugin="workflow-cps">
    <scm class="hudson.plugins.git.GitSCM" plugin="git">
      <configVersion>2</configVersion>
      <userRemoteConfigs>
        <hudson.plugins.git.UserRemoteConfig>
          <url>${GITHUB_REPO}.git</url>
        </hudson.plugins.git.UserRemoteConfig>
      </userRemoteConfigs>
      <branches>
        <hudson.plugins.git.BranchSpec>
          <name>*/main</name>
        </hudson.plugins.git.BranchSpec>
      </branches>
    </scm>
    <scriptPath>Jenkinsfile</scriptPath>
    <lightweight>true</lightweight>
  </definition>
  <disabled>false</disabled>
</flow-definition>`.replace('*/main', '*/master');

  await upsertJob(client, crumb, 'BestTester', jobXml);
}

async function createNightlyJob(client: AxiosInstance, crumb: Record<string, string>): Promise<void> {
  console.log('🌙 Creating nightly full-regression job...');
  const jobXml = `<?xml version='1.1' encoding='UTF-8'?>
<flow-definition plugin="workflow-job">
  <description>BestTester Nightly Full Regression</description>
  <properties>
    <org.jenkinsci.plugins.workflow.job.properties.PipelineTriggersJobProperty>
      <triggers>
        <hudson.triggers.TimerTrigger>
          <spec>H 2 * * *</spec>
        </hudson.triggers.TimerTrigger>
      </triggers>
    </org.jenkinsci.plugins.workflow.job.properties.PipelineTriggersJobProperty>
  </properties>
  <definition class="org.jenkinsci.plugins.workflow.cps.CpsFlowDefinition" plugin="workflow-cps">
    <script>
pipeline {
  agent any
  environment {
    AWS_ACCESS_KEY_ID     = credentials('AWS_ACCESS_KEY_ID')
    AWS_SECRET_ACCESS_KEY = credentials('AWS_SECRET_ACCESS_KEY')
    AWS_BEDROCK_REGION    = 'us-east-1'
    PRIMARY_AI_MODEL      = 'amazon.nova-pro-v1:0'
    JUDGE_MODEL           = 'anthropic.claude-3-haiku-20240307-v1:0'
    JUDGE_PROVIDER        = 'bedrock'
    ADMIN_USERNAME        = credentials('ORANGEHRM_USERNAME')
    ADMIN_PASSWORD        = credentials('ORANGEHRM_PASSWORD')
    BASE_URL              = 'https://opensource-demo.orangehrmlive.com'
  }
  stages {
    stage('Checkout')   { steps { checkout scm } }
    stage('Setup')      { steps { sh 'npm ci &amp;&amp; npx playwright install --with-deps' } }
    stage('All Tests')  { steps { sh 'npx cross-env CI=true npx playwright test --reporter=list,html,junit,allure-playwright || true' } }
    stage('Report')     { steps { sh 'npx allure generate reports/allure-results --clean -o reports/allure-report || true'
                                  junit allowEmptyResults: true, testResults: 'reports/playwright-report/junit.xml'
                                  publishHTML([reportDir: 'reports/allure-report', reportFiles: 'index.html', reportName: 'Nightly Allure Report', keepAll: true, alwaysLinkToLastBuild: true, allowMissing: true]) } }
  }
  post { always { cleanWs() } }
}
    </script>
    <sandbox>true</sandbox>
  </definition>
  <disabled>false</disabled>
</flow-definition>`;

  await upsertJob(client, crumb, 'BestTester-Nightly', jobXml);
}

async function createSingleTestJob(client: AxiosInstance, crumb: Record<string, string>): Promise<void> {
  console.log('🧪 Creating BestTester-SingleTest job...');
  const jobXml = `<?xml version='1.1' encoding='UTF-8'?>
<flow-definition plugin="workflow-job">
  <description>Run a single test or test class with custom env vars and Jira key</description>
  <properties>
    <hudson.model.ParametersDefinitionProperty>
      <parameterDefinitions>
        <hudson.model.ChoiceParameterDefinition>
          <name>RUN_MODE</name>
          <choices class="java.util.Arrays$ArrayList"><a class="string-array"><string>single</string><string>class</string></a></choices>
          <description>single = one spec file | class = entire folder</description>
        </hudson.model.ChoiceParameterDefinition>
        <hudson.model.StringParameterDefinition>
          <name>TEST_PATH</name>
          <defaultValue></defaultValue>
          <description>Relative path to spec file or folder. e.g. tests/ui/smoke/login.spec.ts</description>
          <trim>true</trim>
        </hudson.model.StringParameterDefinition>
        <hudson.model.ChoiceParameterDefinition>
          <name>BROWSER</name>
          <choices class="java.util.Arrays$ArrayList"><a class="string-array"><string>chromium</string><string>firefox</string><string>webkit</string></a></choices>
          <description>Playwright browser project</description>
        </hudson.model.ChoiceParameterDefinition>
        <hudson.model.ChoiceParameterDefinition>
          <name>TEST_ENV</name>
          <choices class="java.util.Arrays$ArrayList"><a class="string-array"><string>staging</string><string>dev</string><string>prod</string></a></choices>
          <description>Target environment</description>
        </hudson.model.ChoiceParameterDefinition>
        <hudson.model.TextParameterDefinition>
          <name>EXTRA_ENV_VARS</name>
          <defaultValue></defaultValue>
          <description>Extra env vars, one KEY=VALUE per line. e.g. FEATURE_FLAG_X=true</description>
          <trim>false</trim>
        </hudson.model.TextParameterDefinition>
        <hudson.model.StringParameterDefinition>
          <name>JIRA_KEY</name>
          <defaultValue></defaultValue>
          <description>Jira issue key to link this run (e.g. BT-42). Leave blank to skip.</description>
          <trim>true</trim>
        </hudson.model.StringParameterDefinition>
      </parameterDefinitions>
    </hudson.model.ParametersDefinitionProperty>
  </properties>
  <definition class="org.jenkinsci.plugins.workflow.cps.CpsScmFlowDefinition" plugin="workflow-cps">
    <scm class="hudson.plugins.git.GitSCM" plugin="git">
      <configVersion>2</configVersion>
      <userRemoteConfigs>
        <hudson.plugins.git.UserRemoteConfig>
          <url>${GITHUB_REPO}.git</url>
        </hudson.plugins.git.UserRemoteConfig>
      </userRemoteConfigs>
      <branches>
        <hudson.plugins.git.BranchSpec>
          <name>*/main</name>
        </hudson.plugins.git.BranchSpec>
      </branches>
    </scm>
    <scriptPath>Jenkinsfile.single-test</scriptPath>
    <lightweight>true</lightweight>
  </definition>
  <disabled>false</disabled>
</flow-definition>`.replace('*/main', '*/master');

  await upsertJob(client, crumb, 'BestTester-SingleTest', jobXml);
}

async function main() {
  console.log('\n=== BestTester Jenkins Configurator ===\n');
  console.log(`Jenkins URL: ${JENKINS_URL}`);

  // Try .env credentials first (already-configured Jenkins), then SSH initial password
  let auth = getAuthFromEnv();
  if (auth) {
    console.log(`   Using .env credentials (${auth.username}).`);
  } else {
    const initialPw = await getInitialPassword();
    if (!initialPw) {
      console.error('No JENKINS_USERNAME/JENKINS_TOKEN in .env and SSH initial password retrieval failed.');
      process.exit(1);
    }
    auth = { username: 'admin', password: initialPw };
  }

  const client = createJenkinsClient(auth);

  await waitForJenkins(client);
  const crumb = await getCrumb(client);

  await installPlugins(client, crumb);

  console.log('🔐 Creating credentials...');
  await createCredential(client, crumb, 'AWS_ACCESS_KEY_ID',     process.env.AWS_ACCESS_KEY_ID     ?? '', 'AWS Access Key ID');
  await createCredential(client, crumb, 'AWS_SECRET_ACCESS_KEY', process.env.AWS_SECRET_ACCESS_KEY ?? '', 'AWS Secret Access Key');
  await createCredential(client, crumb, 'ORANGEHRM_USERNAME',    process.env.ADMIN_USERNAME         ?? 'Admin',    'OrangeHRM Admin Username');
  await createCredential(client, crumb, 'ORANGEHRM_PASSWORD',    process.env.ADMIN_PASSWORD         ?? 'admin123', 'OrangeHRM Admin Password');
  await createCredential(client, crumb, 'SLACK_WEBHOOK_URL',     process.env.SLACK_WEBHOOK_URL      ?? '', 'Slack Webhook URL');
  await createCredential(client, crumb, 'JIRA_BASE_URL',         process.env.JIRA_BASE_URL          ?? '', 'Jira Base URL');
  await createCredential(client, crumb, 'JIRA_EMAIL',            process.env.JIRA_EMAIL             ?? '', 'Jira Email');
  await createCredential(client, crumb, 'JIRA_API_TOKEN',        process.env.JIRA_API_TOKEN         ?? '', 'Jira API Token');
  console.log('   Credentials created.');

  await createPipelineJob(client, crumb);
  await createNightlyJob(client, crumb);
  await createSingleTestJob(client, crumb);

  console.log('\n✅ Jenkins configured!');
  console.log(`   Dashboard  : ${JENKINS_URL}`);
  console.log(`   Username   : ${auth.username}`);
  console.log(`   Smoke job  : ${JENKINS_URL}/job/BestTester  (cron: every 2h)`);
  console.log(`   Nightly job : ${JENKINS_URL}/job/BestTester-Nightly  (cron: 2am daily)`);
  console.log(`   Single test : ${JENKINS_URL}/job/BestTester-SingleTest\n`);
}

main().catch(e => { console.error('❌ Error:', e.message); process.exit(1); });
