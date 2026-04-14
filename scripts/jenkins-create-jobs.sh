#!/bin/bash

# All secrets must be provided via environment variables.
: "${JENKINS_PW:?JENKINS_PW env var is required}"
CLI="java -jar /home/ec2-user/jenkins-cli.jar -s http://localhost:8080 -auth admin:${JENKINS_PW}"

echo "=== Creating BestTester smoke job ==="
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
    BASE_URL              = &apos;https://opensource-demo.orangehrmlive.com&apos;
    ADMIN_USERNAME        = &apos;Admin&apos;
    ADMIN_PASSWORD        = &apos;admin123&apos;
    AWS_BEDROCK_REGION    = &apos;us-east-1&apos;
    AWS_ACCESS_KEY_ID     = credentials(&apos;aws-access-key-id&apos;)
    AWS_SECRET_ACCESS_KEY = credentials(&apos;aws-secret-access-key&apos;)
    PRIMARY_AI_MODEL      = &apos;amazon.nova-pro-v1:0&apos;
    JUDGE_MODEL           = &apos;anthropic.claude-3-haiku-20240307-v1:0&apos;
    JUDGE_PROVIDER        = &apos;bedrock&apos;
    JUDGE_PASS_THRESHOLD  = &apos;3.5&apos;
  }
  stages {
    stage(&apos;Setup&apos;)    { steps { sh &apos;npm ci &amp;&amp; npx playwright install --with-deps chromium&apos; } }
    stage(&apos;Smoke&apos;)    { steps { sh &apos;npx cross-env CI=true npx playwright test --grep @smoke --project=chromium --reporter=list,html,junit || true&apos; } }
    stage(&apos;AI Tests&apos;) { steps { sh &apos;npx cross-env CI=true npx playwright test tests/ai/ --reporter=list,html,junit || true&apos; } }
    stage(&apos;Report&apos;)   {
      steps {
        junit(allowEmptyResults: true, testResults: &apos;reports/playwright-report/junit.xml&apos;)
        publishHTML([reportDir: &apos;reports/playwright-report&apos;, reportFiles: &apos;index.html&apos;, reportName: &apos;Playwright Report&apos;, keepAll: true, alwaysLinkToLastBuild: true, allowMissing: true])
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

$CLI delete-job BestTester 2>/dev/null || true
$CLI create-job BestTester < /tmp/besttester-job.xml && echo "BestTester job created"

echo "=== Creating BestTester-Nightly job ==="
cat > /tmp/nightly-job.xml << 'NIGHTLYEOF'
<?xml version='1.1' encoding='UTF-8'?>
<flow-definition plugin="workflow-job">
  <description>BestTester Nightly Full Regression</description>
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
    AWS_ACCESS_KEY_ID     = credentials(&apos;aws-access-key-id&apos;)
    AWS_SECRET_ACCESS_KEY = credentials(&apos;aws-secret-access-key&apos;)
    PRIMARY_AI_MODEL      = &apos;amazon.nova-pro-v1:0&apos;
    JUDGE_MODEL           = &apos;anthropic.claude-3-haiku-20240307-v1:0&apos;
    JUDGE_PROVIDER        = &apos;bedrock&apos;
    JUDGE_PASS_THRESHOLD  = &apos;3.5&apos;
  }
  stages {
    stage(&apos;Setup&apos;)      { steps { sh &apos;npm ci &amp;&amp; npx playwright install --with-deps&apos; } }
    stage(&apos;Regression&apos;) { steps { sh &apos;npx cross-env CI=true npx playwright test --grep @regression --reporter=list,html,junit || true&apos; } }
    stage(&apos;AI Tests&apos;)   { steps { sh &apos;npx cross-env CI=true npx playwright test tests/ai/ --reporter=list,html,junit || true&apos; } }
    stage(&apos;API Tests&apos;)  { steps { sh &apos;npx cross-env CI=true npx playwright test tests/api/ --reporter=list,html,junit || true&apos; } }
    stage(&apos;Allure&apos;)     { steps { sh &apos;npx allure generate reports/allure-results --clean -o reports/allure-report || true&apos; } }
    stage(&apos;Report&apos;)     {
      steps {
        junit(allowEmptyResults: true, testResults: &apos;reports/playwright-report/junit.xml&apos;)
        publishHTML([reportDir: &apos;reports/allure-report&apos;, reportFiles: &apos;index.html&apos;, reportName: &apos;Nightly Allure Report&apos;, keepAll: true, alwaysLinkToLastBuild: true, allowMissing: true])
        publishHTML([reportDir: &apos;reports/playwright-report&apos;, reportFiles: &apos;index.html&apos;, reportName: &apos;Playwright Report&apos;, keepAll: true, alwaysLinkToLastBuild: true, allowMissing: true])
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

$CLI delete-job BestTester-Nightly 2>/dev/null || true
$CLI create-job BestTester-Nightly < /tmp/nightly-job.xml && echo "BestTester-Nightly job created"

echo "=== Creating BestTester-SingleTest job ==="
cat > /tmp/single-test-job.xml << 'SINGLEEOF'
<?xml version='1.1' encoding='UTF-8'?>
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
          <description>e.g. tests/ui/smoke/login.spec.ts  or  tests/ui/smoke/</description><trim>true</trim>
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
          <description>Extra env vars, one KEY=VALUE per line. e.g. FEATURE_FLAG_X=true</description><trim>false</trim>
        </hudson.model.TextParameterDefinition>
        <hudson.model.StringParameterDefinition>
          <name>JIRA_KEY</name><defaultValue></defaultValue>
          <description>Jira issue key (e.g. BT-42). Leave blank to skip.</description><trim>true</trim>
        </hudson.model.StringParameterDefinition>
      </parameterDefinitions>
    </hudson.model.ParametersDefinitionProperty>
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
    AWS_ACCESS_KEY_ID     = credentials(&apos;aws-access-key-id&apos;)
    AWS_SECRET_ACCESS_KEY = credentials(&apos;aws-secret-access-key&apos;)
    JIRA_BASE_URL         = &apos;${JIRA_BASE_URL}&apos;
    JIRA_EMAIL            = &apos;${JIRA_EMAIL}&apos;
    JIRA_API_TOKEN        = &apos;${JIRA_API_TOKEN}&apos;
    JIRA_PROJECT_KEY      = &apos;BT&apos;
  }
  stages {
    stage(&apos;Validate&apos;) {
      steps {
        script { if (!params.TEST_PATH?.trim()) { error(&apos;TEST_PATH must not be empty.&apos;) } }
      }
    }
    stage(&apos;Setup&apos;) {
      steps { sh &apos;npm ci &amp;&amp; npx playwright install --with-deps chromium firefox webkit&apos; }
    }
    stage(&apos;Run Test&apos;) {
      steps {
        script {
          def extraExports = params.EXTRA_ENV_VARS?.trim()
            ? params.EXTRA_ENV_VARS.trim().split(&apos;\n&apos;).collect { &quot;export ${it.trim()}&quot; }.join(&apos;\n&apos;)
            : &apos;&apos;
          sh &quot;&quot;&quot;
            ${extraExports}
            export TEST_ENV=${params.TEST_ENV}
            npx cross-env CI=true npx playwright test ${params.TEST_PATH.trim()} \\
              --project=${params.BROWSER} \\
              --reporter=list,html,junit || true
          &quot;&quot;&quot;
        }
      }
    }
    stage(&apos;Report&apos;) {
      steps {
        junit(allowEmptyResults: true, testResults: &apos;reports/playwright-report/junit.xml&apos;)
        publishHTML([reportDir: &apos;reports/playwright-report&apos;, reportFiles: &apos;index.html&apos;, reportName: &apos;Playwright Report&apos;, keepAll: true, alwaysLinkToLastBuild: true, allowMissing: true])
      }
    }
    stage(&apos;Jira Sync&apos;) {
      when { expression { params.JIRA_KEY?.trim() } }
      steps {
        sh &apos;npx ts-node agents/jira-sync-agent.ts --build ${BUILD_NUMBER} --jira-key ${params.JIRA_KEY.trim()} || true&apos;
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
SINGLEEOF

$CLI delete-job BestTester-SingleTest 2>/dev/null || true
$CLI create-job BestTester-SingleTest < /tmp/single-test-job.xml && echo "BestTester-SingleTest job created"

echo "=== Restoring public IP URL ==="
cat > /var/lib/jenkins/jenkins.model.JenkinsLocationConfiguration.xml << 'XMLEOF'
<?xml version='1.1' encoding='UTF-8'?>
<jenkins.model.JenkinsLocationConfiguration>
  <adminAddress>nobody@nowhere</adminAddress>
  <jenkinsUrl>http://localhost:8080/</jenkinsUrl>
</jenkins.model.JenkinsLocationConfiguration>
XMLEOF
chown jenkins:jenkins /var/lib/jenkins/jenkins.model.JenkinsLocationConfiguration.xml

echo "=== Done ==="
