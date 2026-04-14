/**
 * @file ai-api-response.spec.ts
 * @description Validates LLM API response structure and content quality.
 * @tags @ai @regression
 */
import { test, expect } from '@playwright/test';
import { LLMClient } from '../../src/ai/llm-client';

test.describe('AI API Response Validation @ai @regression', () => {
  let llm: LLMClient;

  test.beforeAll(() => {
    if (!process.env.AWS_ACCESS_KEY_ID && !process.env.AWS_BEDROCK_REGION) test.skip();
    llm = new LLMClient();
  });

  test('should return a non-empty string response', async () => {
    const response = await llm.chat('You are a test assistant.', 'Say hello.');
    expect(typeof response).toBe('string');
    expect(response.length).toBeGreaterThan(0);
  });

  test('should return embeddings as a number array', async () => {
    const embedding = await llm.embed('test automation');
    expect(Array.isArray(embedding)).toBe(true);
    expect(embedding.length).toBeGreaterThan(0);
    expect(typeof embedding[0]).toBe('number');
  });

  test('should handle long prompts without error', async () => {
    const longPrompt = 'Explain test automation. '.repeat(50);
    const response = await llm.chat('You are a helpful assistant.', longPrompt);
    expect(response.length).toBeGreaterThan(0);
  });
});
