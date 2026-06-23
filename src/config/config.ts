import { validateEnv } from './env-validator';

export interface Config {
  testEnv: 'dev' | 'staging' | 'prod';
  baseUrl: string;
  headless: boolean;
  ci: boolean;
  storageState?: string;
  skipGlobalSetup: boolean;
  allBrowsers: boolean;
  mobileTablet: boolean;
  jenkinsUrl?: string;
  jenkinsUsername?: string;
  jenkinsToken?: string;
  githubRepo?: string;
  awsAccessKeyId?: string;
  awsSecretAccessKey?: string;
  adminUsername?: string;
  adminPassword?: string;
  slackWebhookUrl?: string;
  slackBotToken?: string;
  jiraBaseUrl?: string;
  jiraEmail?: string;
  jiraApiToken?: string;
  allureReportUrl?: string;
  buildNumber?: string;
  llmProvider: 'bedrock' | 'openai' | 'anthropic';
  awsRegion: string;
  anthropicApiKey?: string;
  openaiApiKey?: string;
  bedrockModelId?: string;
}

let configInstance: Config | null = null;

export function initConfig(): Config {
  if (configInstance) {
    return configInstance;
  }

  const validated = validateEnv(process.env);

  configInstance = {
    testEnv: validated.TEST_ENV as 'dev' | 'staging' | 'prod',
    baseUrl: validated.BASE_URL,
    headless: validated.HEADLESS,
    ci: validated.CI ? true : false,
    storageState: validated.STORAGE_STATE,
    skipGlobalSetup: validated.SKIP_GLOBAL_SETUP ? true : false,
    allBrowsers: validated.ALL_BROWSERS,
    mobileTablet: validated.MOBILE_TABLET,
    jenkinsUrl: validated.JENKINS_URL,
    jenkinsUsername: validated.JENKINS_USERNAME,
    jenkinsToken: validated.JENKINS_TOKEN,
    githubRepo: validated.GITHUB_REPO,
    awsAccessKeyId: validated.AWS_ACCESS_KEY_ID,
    awsSecretAccessKey: validated.AWS_SECRET_ACCESS_KEY,
    adminUsername: validated.ADMIN_USERNAME,
    adminPassword: validated.ADMIN_PASSWORD,
    slackWebhookUrl: validated.SLACK_WEBHOOK_URL,
    slackBotToken: validated.SLACK_BOT_TOKEN,
    jiraBaseUrl: validated.JIRA_BASE_URL,
    jiraEmail: validated.JIRA_EMAIL,
    jiraApiToken: validated.JIRA_API_TOKEN,
    allureReportUrl: validated.ALLURE_REPORT_URL,
    buildNumber: validated.BUILD_NUMBER,
    llmProvider: validated.LLM_PROVIDER,
    awsRegion: validated.AWS_REGION,
    anthropicApiKey: validated.ANTHROPIC_API_KEY,
    openaiApiKey: validated.OPENAI_API_KEY,
    bedrockModelId: validated.BEDROCK_MODEL_ID,
  };

  return configInstance;
}

export function getConfig(): Config | null {
  if (!configInstance) {
    initConfig();
  }
  return configInstance;
}
