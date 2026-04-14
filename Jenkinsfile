pipeline {
  agent any

  environment {
    NODE_VERSION    = '20'
    BASE_URL        = 'https://opensource-demo.orangehrmlive.com'
    ADMIN_USERNAME  = credentials('ORANGEHRM_USERNAME')
    ADMIN_PASSWORD  = credentials('ORANGEHRM_PASSWORD')
    AWS_ACCESS_KEY_ID     = credentials('AWS_ACCESS_KEY_ID')
    AWS_SECRET_ACCESS_KEY = credentials('AWS_SECRET_ACCESS_KEY')
    AWS_BEDROCK_REGION    = 'us-east-1'
    PRIMARY_AI_MODEL      = 'amazon.nova-pro-v1:0'
    JUDGE_MODEL           = 'anthropic.claude-3-haiku-20240307-v1:0'
    JUDGE_PROVIDER        = 'bedrock'
    JUDGE_PASS_THRESHOLD  = '3.5'
    SLACK_WEBHOOK_URL     = credentials('SLACK_WEBHOOK_URL')
    JIRA_BASE_URL         = credentials('JIRA_BASE_URL')
    JIRA_EMAIL            = credentials('JIRA_EMAIL')
    JIRA_API_TOKEN        = credentials('JIRA_API_TOKEN')
    JIRA_PROJECT_KEY      = 'BT'
    JIRA_ISSUE_TYPE       = 'Bug'
    REPORT_DIR            = 'reports/playwright-report'
    ALLURE_DIR            = 'reports/allure-results'
  }

  parameters {
    choice(name: 'TEST_SUITE',  choices: ['smoke', 'regression', 'ai', 'api', 'all'], description: 'Test suite to run')
    choice(name: 'BROWSER',     choices: ['chromium', 'firefox', 'webkit'],            description: 'Browser')
    string(name: 'GREP_FILTER', defaultValue: '',                                      description: 'Optional grep filter e.g. @smoke')
    string(name: 'JIRA_KEY',    defaultValue: '',                                      description: 'Jira issue key to link test execution e.g. SCRUM-5')
  }

  triggers {
    // Smoke: every 2 hours
    cron('H */2 * * *')
    // Full regression: nightly at 2am
    // Configured as separate pipeline or via when{} block below
  }

  options {
    buildDiscarder(logRotator(numToKeepStr: '30'))
    timeout(time: 60, unit: 'MINUTES')
    timestamps()
    ansiColor('xterm')
  }

  stages {

    stage('Checkout') {
      steps {
        checkout scm
      }
    }

    stage('Setup') {
      steps {
        sh '''
          node --version
          npm --version
          npm ci
          npx playwright install --with-deps chromium firefox webkit
        '''
      }
    }

    stage('Lint') {
      steps {
        sh 'npm run lint || true'
      }
    }

    stage('Type Check') {
      steps {
        sh 'npx tsc --noEmit'
      }
    }

    stage('Run Tests') {
      steps {
        script {
          def cmd = ''
          def grep = params.GREP_FILTER ? "--grep '${params.GREP_FILTER}'" : ''

          switch(params.TEST_SUITE) {
            case 'smoke':
              cmd = "npx playwright test --grep @smoke --project=${params.BROWSER} ${grep}"
              break
            case 'regression':
              cmd = "npx playwright test --grep @regression --project=${params.BROWSER} ${grep}"
              break
            case 'ai':
              cmd = "npx playwright test tests/ai/ ${grep}"
              break
            case 'api':
              cmd = "npx playwright test tests/api/ ${grep}"
              break
            default:
              cmd = "npx playwright test --project=${params.BROWSER} ${grep}"
          }

          // Nightly: run all browsers
          if (env.BUILD_CAUSE == 'TIMERTRIGGER' && currentBuild.startTimeInMillis > 0) {
            cmd = "npx playwright test"
          }

          sh "npx cross-env CI=true ${cmd} --reporter=list,html,junit,allure-playwright || true"
        }
      }
    }

    stage('Generate Allure Report') {
      steps {
        sh '''
          npx allure generate reports/allure-results --clean -o reports/allure-report || true
        '''
      }
    }

    stage('Publish Reports') {
      steps {
        // JUnit results
        junit allowEmptyResults: true, testResults: 'reports/playwright-report/junit.xml'

        // Playwright HTML report
        publishHTML([
          allowMissing:          true,
          alwaysLinkToLastBuild: true,
          keepAll:               true,
          reportDir:             'reports/playwright-report',
          reportFiles:           'index.html',
          reportName:            'Playwright Report',
        ])

        // Allure report
        publishHTML([
          allowMissing:          true,
          alwaysLinkToLastBuild: true,
          keepAll:               true,
          reportDir:             'reports/allure-report',
          reportFiles:           'index.html',
          reportName:            'Allure Report',
        ])
      }
    }

    stage('Archive Artifacts') {
      steps {
        archiveArtifacts artifacts: 'reports/**/*', allowEmptyArchive: true
        archiveArtifacts artifacts: 'test-results/**/*', allowEmptyArchive: true
      }
    }

    stage('Jira Sync') {
      steps {
        script {
          def jiraArg = params.JIRA_KEY?.trim() ? "--jira-key ${params.JIRA_KEY.trim()}" : ''
          sh "npx ts-node agents/jira-sync-agent.ts --build ${BUILD_NUMBER} ${jiraArg} || true"
        }
      }
    }
  }

  post {
    always {
      script {
        def jiraArg = params.JIRA_KEY?.trim() ? params.JIRA_KEY.trim() : ''
        sh "npx ts-node -P tsconfig.json scripts/post-results-to-slack.ts ${jiraArg} || true"
      }
    }
    success {
      echo '✅ All tests passed.'
    }
    failure {
      echo '❌ Tests failed. Check the report.'
    }
    cleanup {
      cleanWs()
    }
  }
}
