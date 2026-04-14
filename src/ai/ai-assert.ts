import { expect } from '@playwright/test';
import { LLMClient } from './llm-client';

const llm = new LLMClient();

function cosineSimilarity(a: number[], b: number[]): number {
  const dot = a.reduce((sum, val, i) => sum + val * (b[i] ?? 0), 0);
  const magA = Math.sqrt(a.reduce((sum, val) => sum + val * val, 0));
  const magB = Math.sqrt(b.reduce((sum, val) => sum + val * val, 0));
  return magA && magB ? dot / (magA * magB) : 0;
}

/**
 * Assert that two texts are semantically similar using embedding cosine similarity.
 */
export async function assertSemanticSimilarity(
  actual: string,
  expected: string,
  threshold = 0.85,
): Promise<void> {
  const [embA, embB] = await Promise.all([llm.embed(actual), llm.embed(expected)]);
  const similarity = cosineSimilarity(embA, embB);
  expect(similarity).toBeGreaterThanOrEqual(threshold);
}

/**
 * Assert that AI response is not empty and contains at least one expected keyword.
 */
export function assertNotHallucinated(response: string, keywords: string[]): void {
  expect(response.trim().length).toBeGreaterThan(0);
  const lower = response.toLowerCase();
  const matched = keywords.some((kw) => lower.includes(kw.toLowerCase()));
  expect(matched).toBe(true);
}
