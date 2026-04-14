#!/bin/bash
JENKINS_PW="REPLACE_WITH_JENKINS_TOKEN"
CLI="java -jar /home/ec2-user/jenkins-cli.jar -s http://localhost:8080 -auth admin:${JENKINS_PW}"

echo "=== Updating BestTester job with Jira sync stage ==="
cat > /tmp/besttester-updated.xml << 'JOBEOF'
<?xml version='1.1' encoding='UTF-8'?>
<flow-definition plugin="workflow-job">
  <description>BestTester Playwright Smoke + AI Tests + Jira Sync - runs every 2 hours</description>
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
    BASE_URL              = &apos;https://opensource-demo.orangehrmlive.com&apos;
    ADMIN_USERNAME        = &apos;Admin&apos;
    ADMIN_PASSWORD        = &apos;admin123&apos;
    AWS_BEDROCK_REGION    = &apos;us-east-1&apos;
    AWS_ACCESS_KEY_ID     = &apos;REPLACE_WITH_AWS_ACCESS_KEY_ID&apos;
    AWS_SECRET_ACCESS_KEY = &apos;REPLACE_WITH_AWS_SECRET_ACCESS_KEY&apos;
    PRIMARY_AI_MODEL      = &apos;amazon.nova-pro-v1:0&apos;
    JUDGE_MODEL           = &apos;anthropic.claude-3-haiku-20240307-v1:0&apos;
    JUDGE_PROVIDER        = &apos;bedrock&apos;
    JUDGE_PASS_THRESHOLD  = &apos;3.5&apos;
    JENKINS_URL           = &apos;http://98.81.219.145:8080&apos;
    JENKINS_USERNAME      = &apos;admin&apos;
    JENKINS_TOKEN         = &apos;REPLACE_WITH_JENKINS_TOKEN&apos;
    JIRA_BASE_URL         = &apos;${JIRA_BASE_URL}&apos;
    JIRA_EMAIL            = &apos;${JIRA_EMAIL}&apos;
    JIRA_API_TOKEN        = &apos;${JIRA_API_TOKEN}&apos;
    JIRA_PROJECT_KEY      = &apos;BT&apos;
    JIRA_ISSUE_TYPE       = &apos;Bug&apos;
  }
  stages {
    stage(&apos;Setup&apos;)    { steps { sh &apos;npm ci &amp;&amp; npx playwright install --with-deps chromium&apos; } }
    stage(&apos;Smoke&apos;)    { steps { sh &apos;npx cross-env CI=true npx playwright test --grep @smoke --project=chromium --reporter=list,html,junit || true&apos; } }
    stage(&apos;AI Tests&apos;) { steps { sh &apos;npx cross-env CI=true npx playwright test tests/ai/ --reporter=list,html,junit || true&apos; } }
    stage(&apos;Report&apos;) {
      steps {
        junit(allowEmptyResults: true, testResults: &apos;reports/playwright-report/junit.xml&apos;)
        publishHTML([reportDir: &apos;reports/playwright-report&apos;, reportFiles: &apos;index.html&apos;, reportName: &apos;Playwright Report&apos;, keepAll: true, alwaysLinkToLastBuild: true, allowMissing: true])
        archiveArtifacts(artifacts: &apos;reports/playwright-report/junit.xml&apos;, allowEmptyArchive: true)
      }
    }
    stage(&apos;Jira Sync&apos;) {
      steps {
        sh &apos;npx ts-node agents/jira-sync-agent.ts --build ${BUILD_NUMBER} || true&apos;
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

$CLI update-job BestTester < /tmp/besttester-updated.xml && echo "BestTester job updated"

echo "=== Updating BestTester-Nightly job with Jira sync stage ==="
cat > /tmp/nightly-updated.xml << 'NIGHTLYEOF'
<?xml version='1.1' encoding='UTF-8'?>
<flow-definition plugin="workflow-job">
  <description>BestTester Nightly Full Regression + Jira Sync</description>
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
    BASE_URL              = &apos;https://opensource-demo.orangehrmlive.com&apos;
    ADMIN_USERNAME        = &apos;Admin&apos;
    ADMIN_PASSWORD        = &apos;admin123&apos;
    AWS_BEDROCK_REGION    = &apos;us-east-1&apos;
    AWS_ACCESS_KEY_ID     = &apos;REPLACE_WITH_AWS_ACCESS_KEY_ID&apos;
    AWS_SECRET_ACCESS_KEY = &apos;REPLACE_WITH_AWS_SECRET_ACCESS_KEY&apos;
    PRIMARY_AI_MODEL      = &apos;amazon.nova-pro-v1:0&apos;
    JUDGE_MODEL           = &apos;anthropic.claude-3-haiku-20240307-v1:0&apos;
    JUDGE_PROVIDER        = &apos;bedrock&apos;
    JUDGE_PASS_THRESHOLD  = &apos;3.5&apos;
    JENKINS_URL           = &apos;http://98.81.219.145:8080&apos;
    JENKINS_USERNAME      = &apos;admin&apos;
    JENKINS_TOKEN         = &apos;REPLACE_WITH_JENKINS_TOKEN&apos;
    JIRA_BASE_URL         = &apos;${JIRA_BASE_URL}&apos;
    JIRA_EMAIL            = &apos;${JIRA_EMAIL}&apos;
    JIRA_API_TOKEN        = &apos;${JIRA_API_TOKEN}&apos;
    JIRA_PROJECT_KEY      = &apos;BT&apos;
    JIRA_ISSUE_TYPE       = &apos;Bug&apos;
  }
  stages {
    stage(&apos;Setup&apos;)      { steps { sh &apos;npm ci &amp;&amp; npx playwright install --with-deps&apos; } }
    stage(&apos;Regression&apos;) { steps { sh &apos;npx cross-env CI=true npx playwright test --grep @regression --reporter=list,html,junit || true&apos; } }
    stage(&apos;AI Tests&apos;)   { steps { sh &apos;npx cross-env CI=true npx playwright test tests/ai/ --reporter=list,html,junit || true&apos; } }
    stage(&apos;API Tests&apos;)  { steps { sh &apos;npx cross-env CI=true npx playwright test tests/api/ --reporter=list,html,junit || true&apos; } }
    stage(&apos;Allure&apos;)     { steps { sh &apos;npx allure generate reports/allure-results --clean -o reports/allure-report || true&apos; } }
    stage(&apos;Report&apos;) {
      steps {
        junit(allowEmptyResults: true, testResults: &apos;reports/playwright-report/junit.xml&apos;)
        publishHTML([reportDir: &apos;reports/allure-report&apos;, reportFiles: &apos;index.html&apos;, reportName: &apos;Nightly Allure Report&apos;, keepAll: true, alwaysLinkToLastBuild: true, allowMissing: true])
        publishHTML([reportDir: &apos;reports/playwright-report&apos;, reportFiles: &apos;index.html&apos;, reportName: &apos;Playwright Report&apos;, keepAll: true, alwaysLinkToLastBuild: true, allowMissing: true])
        archiveArtifacts(artifacts: &apos;reports/playwright-report/junit.xml,reports/allure-report/**/*&apos;, allowEmptyArchive: true)
      }
    }
    stage(&apos;Jira Sync&apos;) {
      steps {
        sh &apos;npx ts-node agents/jira-sync-agent.ts --build ${BUILD_NUMBER} || true&apos;
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

$CLI update-job BestTester-Nightly < /tmp/nightly-updated.xml && echo "BestTester-Nightly job updated"
echo "=== Done ==="
