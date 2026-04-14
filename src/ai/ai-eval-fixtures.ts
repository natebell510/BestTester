import { test as base } from '@playwright/test';
import { LLMJudge } from './judge/llm-judge';
import { LLMClient } from './llm-client';
import { judgeConfig } from './judge/judge-config';

export type AIFixtures = {
  llmJudge: LLMJudge;
  aiClient: LLMClient;
};

export const test = base.extend<AIFixtures>({
  llmJudge: async ({}, use) => use(new LLMJudge(judgeConfig)),
  aiClient: async ({}, use) => use(new LLMClient()),
});

export { expect } from '@playwright/test';
