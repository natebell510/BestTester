#!/bin/bash
set -e

# All secrets must be provided via environment variables.
: "${JENKINS_PW:?JENKINS_PW env var is required}"
CLI="java -jar /home/ec2-user/jenkins-cli.jar -s http://localhost:8080 -auth admin:${JENKINS_PW}"

echo "=== Installing plugins ==="
$CLI install-plugin \
  git workflow-aggregator pipeline-stage-view \
  junit htmlpublisher ansicolor timestamper \
  credentials-binding nodejs \
  -restart

echo "Waiting for Jenkins to restart after plugin install..."
sleep 45

echo "=== Creating BestTester smoke job (cron: every 2h) ==="
cat > /tmp/besttester-job.xml << 'JOBEOF'
<?xml version='1.1' encoding='UTF-8'?>
<flow-definition plugin="workflow-job">
  <description>BestTester Playwright Smoke Tests - runs every 2 hours</description>
  <properties>
    <org.jenkinsci.plugins.workflow.job.properties.PipelineTriggersJobProperty>
      <triggers>
        <hudson.triggers.TimerTrigger><spec>H */2 * * *</spec></hudson.triggers.TimerTrigger>
      </triggers>
    </org.jenkinsci.plugins.workflow.job.properties.PipelineTriggersJobProperty>
  </properties>
  <definition class="org.jenkinsci.plugins.workflow.cps.CpsFlowDefinition" plugin="workflow-cps">
    <script>
pipeline {
  agent any
  environment {
    BASE_URL             = 'https://opensource-demo.orangehrmlive.com'
    ADMIN_USERNAME       = 'Admin'
    ADMIN_PASSWORD       = 'admin123'
    AWS_BEDROCK_REGION   = 'us-east-1'
    AWS_ACCESS_KEY_ID    = credentials('aws-access-key-id')
    AWS_SECRET_ACCESS_KEY = credentials('aws-secret-access-key')
    PRIMARY_AI_MODEL     = 'amazon.nova-pro-v1:0'
    JUDGE_MODEL          = 'anthropic.claude-3-haiku-20240307-v1:0'
    JUDGE_PROVIDER       = 'bedrock'
    JUDGE_PASS_THRESHOLD = '3.5'
  }
  stages {
    stage('Checkout') { steps { checkout([$class: 'GitSCM', branches: [[name: '*/main']], userRemoteConfigs: [[url: 'https://github.com/your-org/BestTester.git']]]) } }
    stage('Setup')    { steps { sh 'npm ci && npx playwright install --with-deps chromium' } }
    stage('Smoke')    { steps { sh 'npx cross-env CI=true npx playwright test --grep @smoke --project=chromium --reporter=list,html,junit || true' } }
    stage('AI Tests') { steps { sh 'npx cross-env CI=true npx playwright test tests/ai/ --reporter=list,html,junit || true' } }
    stage('Report')   {
      steps {
        junit allowEmptyResults: true, testResults: 'reports/playwright-report/junit.xml'
        publishHTML([reportDir: 'reports/playwright-report', reportFiles: 'index.html', reportName: 'Playwright Report', keepAll: true, alwaysLinkToLastBuild: true, allowMissing: true])
      }
    }
  }
  post { always { cleanWs() } }
}
    </script>
    <sandbox>true</sandbox>
  </definition>
  <disabled>false</disabled>
</flow-definition>
JOBEOF

$CLI create-job BestTester < /tmp/besttester-job.xml && echo "BestTester job created"

echo "=== Creating BestTester-Nightly job (cron: 2am daily) ==="
cat > /tmp/nightly-job.xml << 'NIGHTLYEOF'
<?xml version='1.1' encoding='UTF-8'?>
<flow-definition plugin="workflow-job">
  <description>BestTester Nightly Full Regression + AI + API</description>
  <properties>
    <org.jenkinsci.plugins.workflow.job.properties.PipelineTriggersJobProperty>
      <triggers>
        <hudson.triggers.TimerTrigger><spec>H 2 * * *</spec></hudson.triggers.TimerTrigger>
      </triggers>
    </org.jenkinsci.plugins.workflow.job.properties.PipelineTriggersJobProperty>
  </properties>
  <definition class="org.jenkinsci.plugins.workflow.cps.CpsFlowDefinition" plugin="workflow-cps">
    <script>
pipeline {
  agent any
  environment {
    BASE_URL              = 'https://opensource-demo.orangehrmlive.com'
    ADMIN_USERNAME        = 'Admin'
    ADMIN_PASSWORD        = 'admin123'
    AWS_BEDROCK_REGION    = 'us-east-1'
    AWS_ACCESS_KEY_ID     = credentials('aws-access-key-id')
    AWS_SECRET_ACCESS_KEY = credentials('aws-secret-access-key')
    PRIMARY_AI_MODEL      = 'amazon.nova-pro-v1:0'
    JUDGE_MODEL           = 'anthropic.claude-3-haiku-20240307-v1:0'
    JUDGE_PROVIDER        = 'bedrock'
    JUDGE_PASS_THRESHOLD  = '3.5'
  }
  stages {
    stage('Checkout')   { steps { checkout([$class: 'GitSCM', branches: [[name: '*/main']], userRemoteConfigs: [[url: 'https://github.com/your-org/BestTester.git']]]) } }
    stage('Setup')      { steps { sh 'npm ci && npx playwright install --with-deps' } }
    stage('Regression') { steps { sh 'npx cross-env CI=true npx playwright test --grep @regression --reporter=list,html,junit || true' } }
    stage('AI Tests')   { steps { sh 'npx cross-env CI=true npx playwright test tests/ai/ --reporter=list,html,junit || true' } }
    stage('API Tests')  { steps { sh 'npx cross-env CI=true npx playwright test tests/api/ --reporter=list,html,junit || true' } }
    stage('Allure')     { steps { sh 'npx allure generate reports/allure-results --clean -o reports/allure-report || true' } }
    stage('Report')     {
      steps {
        junit allowEmptyResults: true, testResults: 'reports/playwright-report/junit.xml'
        publishHTML([reportDir: 'reports/allure-report', reportFiles: 'index.html', reportName: 'Nightly Allure Report', keepAll: true, alwaysLinkToLastBuild: true, allowMissing: true])
        publishHTML([reportDir: 'reports/playwright-report', reportFiles: 'index.html', reportName: 'Playwright Report', keepAll: true, alwaysLinkToLastBuild: true, allowMissing: true])
      }
    }
  }
  post { always { cleanWs() } }
}
    </script>
    <sandbox>true</sandbox>
  </definition>
  <disabled>false</disabled>
</flow-definition>
NIGHTLYEOF

$CLI create-job BestTester-Nightly < /tmp/nightly-job.xml && echo "BestTester-Nightly job created"

echo "=== Updating Jenkins URL back to public IP ==="
cat > /var/lib/jenkins/jenkins.model.JenkinsLocationConfiguration.xml << 'XMLEOF'
<?xml version='1.1' encoding='UTF-8'?>
<jenkins.model.JenkinsLocationConfiguration>
  <adminAddress>nobody@nowhere</adminAddress>
  <jenkinsUrl>http://localhost:8080/</jenkinsUrl>
</jenkins.model.JenkinsLocationConfiguration>
XMLEOF
chown jenkins:jenkins /var/lib/jenkins/jenkins.model.JenkinsLocationConfiguration.xml
systemctl reload jenkins 2>/dev/null || true

echo "=== Jenkins setup complete ==="
echo "Dashboard: Jenkins is configured. Set EC2_HOST to access remotely."
echo "Setup complete. Credentials were injected from environment variables."
