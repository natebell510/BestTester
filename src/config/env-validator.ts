import { z } from 'zod';

const BaseEnvSchema = z.object({
  TEST_ENV: z.enum(['dev', 'staging', 'prod']).default('dev'),
  BASE_URL: z.string().url(),
  HEADLESS: z
    .string()
    .transform((val) => val === 'true' || val === '1')
    .default('true'),
  CI: z
    .string()
    .transform((val) => val === 'true' || val === '1')
    .optional(),
  STORAGE_STATE: z.string().optional(),
  SKIP_GLOBAL_SETUP: z
    .string()
    .transform((val) => val === 'true' || val === '1')
    .optional(),
  ALL_BROWSERS: z
    .string()
    .transform((val) => val === 'true' || val === '1')
    .default('false'),
  MOBILE_TABLET: z
    .string()
    .transform((val) => val === 'true' || val === '1')
    .default('false'),
  JENKINS_URL: z.string().url().optional(),
  JENKINS_USERNAME: z.string().optional(),
  JENKINS_TOKEN: z.string().optional(),
  GITHUB_REPO: z.string().optional(),
  AWS_ACCESS_KEY_ID: z.string().optional(),
  AWS_SECRET_ACCESS_KEY: z.string().optional(),
  ADMIN_USERNAME: z.string().optional(),
  ADMIN_PASSWORD: z.string().optional(),
  SLACK_WEBHOOK_URL: z.string().url().optional(),
  SLACK_BOT_TOKEN: z.string().optional(),
  JIRA_BASE_URL: z.string().url().optional(),
  JIRA_EMAIL: z.string().email().optional(),
  JIRA_API_TOKEN: z.string().optional(),
  ALLURE_REPORT_URL: z.string().url().optional(),
  BUILD_NUMBER: z.string().optional(),
  LLM_PROVIDER: z.enum(['bedrock', 'openai', 'anthropic']).default('bedrock'),
  AWS_REGION: z.string().default('us-east-1'),
  ANTHROPIC_API_KEY: z.string().optional(),
  OPENAI_API_KEY: z.string().optional(),
  BEDROCK_MODEL_ID: z.string().optional(),
});

type BaseEnv = z.infer<typeof BaseEnvSchema>;

export function validateEnv(env: Record<string, string | undefined>): BaseEnv {
  const result = BaseEnvSchema.safeParse(env);

  if (!result.success) {
    const errors = result.error.issues.map((e) => {
      const path = e.path.join('.');
      return `${path || 'root'}: ${e.message}`;
    });
    throw new Error(`Environment validation failed:\n${errors.join('\n')}`);
  }

  return result.data;
}
