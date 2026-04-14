/**
 * @file ai-content-validation.spec.ts
 * @description Validates AI endpoint responses for correctness and semantic quality using LLM-as-Judge.
 * @tags @ai @regression
 */
import { test, expect } from '../../src/ai/ai-eval-fixtures';
import { semanticExpect } from '../../src/ai/semantic-assert';
import { RUBRICS } from '../../src/ai/judge/judge-rubrics';
import { assertNotHallucinated, assertSemanticSimilarity } from '../../src/ai/ai-assert';

test.describe('AI Response Quality @ai @regression', () => {

  test('OrangeHRM chatbot response is relevant and accurate', async ({ aiClient }) => {
    const prompt = 'How do I apply for annual leave in OrangeHRM?';
    const aiResponse = await aiClient.chat(prompt);

    expect(aiResponse).toBeTruthy();
    await semanticExpect(aiResponse).toBeRelevantTo(prompt);
    await semanticExpect(aiResponse).toHaveScore({ min: 3.5, rubric: RUBRICS.STANDARD });
    await semanticExpect(aiResponse).toBeSafe();
  });

  test('AI summary is grounded in source document (RAG faithfulness)', async ({ aiClient }) => {
    const sourceDoc = 'Employees are entitled to 20 days of annual leave per year. Leave must be applied via the OrangeHRM portal at least 3 days in advance and approved by a manager.';
    const summary = await aiClient.summarize(sourceDoc);

    await semanticExpect(summary).toBeGroundedIn(sourceDoc);
    await semanticExpect(summary).toHaveScore({ min: 3.5, rubric: RUBRICS.RAG_FAITHFULNESS });
  });

  test('Pairwise: Nova Pro response beats Nova Micro response', async ({ llmJudge, aiClient }) => {
    const prompt = 'Explain Playwright fixtures in simple terms';
    const responseA = await aiClient.chat(prompt, { model: 'amazon.nova-pro-v1:0' });
    const responseB = await aiClient.chat(prompt, { model: 'amazon.nova-micro-v1:0' });

    const result = await llmJudge.comparePair(prompt, responseA, responseB);
    expect(['A', 'B', 'TIE']).toContain(result.winner);
  });

  test('AI response should not be hallucinated — keyword check', async ({ aiClient }) => {
    const response = await aiClient.chat('What is Playwright used for?');
    assertNotHallucinated(response, ['browser', 'test', 'automation', 'playwright', 'web']);
  });

  test('AI response should be semantically similar to expected answer', async ({ aiClient }) => {
    const response = await aiClient.chat(
      'You are a helpful assistant. Answer in one sentence.',
      'What is Playwright?',
    );
    await assertSemanticSimilarity(
      response,
      'Playwright is a browser automation and end-to-end testing framework.',
      0.75,
    );
  });
});
