#!/usr/bin/env ts-node
/**
 * trigger-single-test.ts
 * Creates the BestTester-SingleTest pipeline job (if missing) and triggers it
 * with the parameters supplied via CLI or the hardcoded defaults below.
 *
 * Usage:
 *   npx ts-node scripts/trigger-single-test.ts
 *   npx ts-node scripts/trigger-single-test.ts \
 *     --run-mode single \
 *     --test-path tests/ui/smoke/login.spec.ts \
 *     --browser chromium \
 *     --env staging \
 *     --extra "FEATURE_FLAG_X=true,RETRY_COUNT=2" \
 *     --jira BT-42
 */
import * as dotenv from 'dotenv';
import * as path from 'path';
import axios from 'axios';
import { triggerJob } from '../src/utils/jenkins';

dotenv.config({ path: path.resolve(__dirname, '../.env') });

const JENKINS_URL      = process.env.JENKINS_URL      ?? '';
const JENKINS_USERNAME = process.env.JENKINS_USERNAME ?? '';
const JENKINS_TOKEN    = process.env.JENKINS_TOKEN    ?? '';
const JOB_NAME         = 'BestTester-SingleTest';

const auth = { username: JENKINS_USERNAME, password: JENKINS_TOKEN };

async function getCrumb(): Promise<Record<string, string>> {
  const res = await axios.get(`${JENKINS_URL}/crumbIssuer/api/json`, { auth });
  return { [res.data.crumbRequestField]: res.data.crumb };
}

async function ensureJobExists(crumb: Record<string, string>): Promise<void> {
  try {
    await axios.get(`${JENKINS_URL}/job/${JOB_NAME}/api/json`, { auth });
    console.log(`ℹ️  Job "${JOB_NAME}" already exists.`);
  } catch (e: any) {
    if (e.response?.status !== 404) throw e;
    console.log(`📋 Creating job "${JOB_NAME}"...`);
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
          <name>TEST_PATH</name><defaultValue></defaultValue>
          <description>Relative path to spec file or folder</description><trim>true</trim>
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
          <name>EXTRA_ENV_VARS</name><defaultValue></defaultValue>
          <description>Extra env vars, one KEY=VALUE per line</description><trim>false</trim>
        </hudson.model.TextParameterDefinition>
        <hudson.model.StringParameterDefinition>
          <name>JIRA_KEY</name><defaultValue></defaultValue>
          <description>Jira issue key (e.g. BT-42). Leave blank to skip.</description><trim>true</trim>
        </hudson.model.StringParameterDefinition>
      </parameterDefinitions>
    </hudson.model.ParametersDefinitionProperty>
  </properties>
  <definition class="org.jenkinsci.plugins.workflow.cps.CpsScmFlowDefinition" plugin="workflow-cps">
    <scm class="hudson.plugins.git.GitSCM" plugin="git">
      <configVersion>2</configVersion>
      <userRemoteConfigs>
        <hudson.plugins.git.UserRemoteConfig>
          <url>https://github.com/your-org/BestTester.git</url>
        </hudson.plugins.git.UserRemoteConfig>
      </userRemoteConfigs>
      <branches>
        <hudson.plugins.git.BranchSpec><name>*/main</name></hudson.plugins.git.BranchSpec>
      </branches>
    </scm>
    <scriptPath>Jenkinsfile.single-test</scriptPath>
    <lightweight>true</lightweight>
  </definition>
  <disabled>false</disabled>
</flow-definition>`;
    await axios.post(
      `${JENKINS_URL}/createItem?name=${JOB_NAME}`,
      jobXml,
      { auth, headers: { 'Content-Type': 'application/xml', ...crumb } },
    );
    console.log(`   ✅ Job "${JOB_NAME}" created.`);
  }
}

function parseArgs(): Record<string, string> {
  const args = process.argv.slice(2);
  const get = (flag: string) => {
    const i = args.indexOf(flag);
    return i !== -1 ? args[i + 1] : undefined;
  };
  return {
    RUN_MODE:       get('--run-mode')   ?? 'single',
    TEST_PATH:      get('--test-path')  ?? 'tests/ui/smoke/login.spec.ts',
    BROWSER:        get('--browser')    ?? 'chromium',
    TEST_ENV:       get('--env')        ?? 'staging',
    EXTRA_ENV_VARS: get('--extra')?.replace(/,/g, '\n') ?? 'FEATURE_FLAG_X=true\nRETRY_COUNT=2',
    JIRA_KEY:       get('--jira')       ?? 'BT-42',
  };
}

async function main(): Promise<void> {
  if (!JENKINS_URL || !JENKINS_USERNAME || !JENKINS_TOKEN) {
    console.error('❌ Set JENKINS_URL, JENKINS_USERNAME, JENKINS_TOKEN in .env');
    process.exit(1);
  }

  const params = parseArgs();

  console.log('\n=== BestTester Single-Test Trigger ===');
  console.log(`   Job       : ${JOB_NAME}`);
  console.log(`   RUN_MODE  : ${params.RUN_MODE}`);
  console.log(`   TEST_PATH : ${params.TEST_PATH}`);
  console.log(`   BROWSER   : ${params.BROWSER}`);
  console.log(`   TEST_ENV  : ${params.TEST_ENV}`);
  console.log(`   EXTRA_ENV : ${params.EXTRA_ENV_VARS.replace(/\n/g, ', ')}`);
  console.log(`   JIRA_KEY  : ${params.JIRA_KEY || '(none)'}\n`);

  const crumb = await getCrumb();
  await ensureJobExists(crumb);

  const queueId = await triggerJob(JOB_NAME, params);
  console.log(`\n✅ Build queued (queue id: ${queueId})`);
  console.log(`   Monitor: ${JENKINS_URL}/job/${JOB_NAME}/\n`);
}

main().catch(e => { console.error('❌', e.message); process.exit(1); });
