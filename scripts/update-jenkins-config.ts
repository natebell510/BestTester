import * as dotenv from 'dotenv';
import * as path from 'path';
import axios from 'axios';

dotenv.config({ path: path.resolve(__dirname, '../.env'), override: true });

const JENKINS_URL = process.env.JENKINS_URL ?? '';
const auth = {
  username: process.env.JENKINS_USERNAME ?? '',
  password: process.env.JENKINS_TOKEN ?? '',
};

const pipelineScript = `
node {
  withEnv(['PATH=/usr/local/bin:/usr/bin:/bin']) {
    stage('Checkout') {
      sh 'rm -rf * .* 2>/dev/null || true'
      sh 'git clone --branch refactor/config-pages-tests-pipeline --single-branch https://github.com/natebell510/BestTester.git .'
    }
    stage('Setup') {
      sh 'npm ci'
      sh 'npx playwright install chromium'
    }
    stage('Tests') {
      def exitCode = sh(script: 'npx cross-env CI=true BASE_URL=https://opensource-demo.orangehrmlive.com ADMIN_USERNAME=Admin ADMIN_PASSWORD=admin123 npx playwright test --config=config/playwright.config.ts --project=chromium', returnStatus: true)
      env.TEST_EXIT_CODE = exitCode.toString()
      if (exitCode != 0) {
        unstable('Tests failed')
      }
    }
    stage('Reports') {
      junit allowEmptyResults: true, testResults: 'reports/playwright-report/junit.xml'
      archiveArtifacts artifacts: 'reports/**/*', allowEmptyArchive: true
    }
  }
}
`.trim();

const configXml = `<?xml version="1.1" encoding="UTF-8"?>
<flow-definition plugin="workflow-job">
  <properties/>
  <definition class="org.jenkinsci.plugins.workflow.cps.CpsFlowDefinition" plugin="workflow-cps">
    <script>${pipelineScript}</script>
    <sandbox>true</sandbox>
  </definition>
  <disabled>false</disabled>
</flow-definition>`;

async function main(): Promise<void> {
  const crumbRes = await axios.get(`${JENKINS_URL}/crumbIssuer/api/json`, { auth });
  const crumbHeader = { [crumbRes.data.crumbRequestField]: crumbRes.data.crumb };
  const cookies =
    crumbRes.headers['set-cookie']?.map((c: string) => c.split(';')[0]).join('; ') ?? '';

  await axios.post(`${JENKINS_URL}/job/BestTester/config.xml`, configXml, {
    auth,
    headers: { 'Content-Type': 'application/xml', ...crumbHeader, Cookie: cookies },
  });
  console.log('Jenkins job config updated successfully');
}

main().catch((e) => {
  console.error(
    'Error:',
    e.response?.status,
    e.response?.data?.toString?.().substring(0, 500) ?? e.message,
  );
  process.exit(1);
});
