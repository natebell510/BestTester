export interface JudgeConfig {
  primaryModel: string;
  judgeModel: string;
  judgeProvider: 'bedrock';
  passThreshold: number;
  retryOnBorderline: boolean;
  logJudgeResponses: boolean;
  judgeLogDir: string;
  chainOfThought: boolean;
}

export const judgeConfig: JudgeConfig = {
  primaryModel: process.env.PRIMARY_AI_MODEL ?? 'amazon.nova-pro-v1:0',
  // Judge MUST differ from primary to avoid narcissistic bias:
  // Primary: Nova Pro  →  Judge: Claude Haiku (different architecture)
  judgeModel: process.env.JUDGE_MODEL ?? 'anthropic.claude-3-haiku-20240307-v1:0',
  judgeProvider: 'bedrock',
  passThreshold: parseFloat(process.env.JUDGE_PASS_THRESHOLD ?? '3.5'),
  retryOnBorderline: process.env.JUDGE_RETRY_BORDERLINE !== 'false',
  logJudgeResponses: true,
  judgeLogDir: 'reports/judge-logs',
  chainOfThought: true,
};
