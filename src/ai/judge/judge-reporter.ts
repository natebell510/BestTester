import { JudgeResult } from './llm-judge';
import { JudgeConfig } from './judge-config';

/**
 * Formats JudgeResult into a human-readable string for Playwright error output.
 */
export function formatJudgeVerdict(result: JudgeResult, config: JudgeConfig): string {
  const icon = result.verdict === 'PASS' ? '✅' : result.verdict === 'WARN' ? '⚠️' : '❌';
  const dimTable = Object.entries(result.dimensions)
    .map(([k, v]) => `  ${k.padEnd(22)}: ${v}/5`)
    .join('\n');

  return [
    `${icon} Judge Verdict: ${result.verdict}  (score: ${result.score}/5, threshold: ${config.passThreshold})`,
    `Judge model: ${config.judgeModel}`,
    `\nDimension Scores:\n${dimTable}`,
    `\nReasoning: ${result.reasoning}`,
    `Feedback:  ${result.feedback}`,
  ].join('\n');
}

/**
 * Attaches judge result as an Allure step + attachment when allure-playwright is active.
 * Falls-back gracefully if allure is not available.
 */
export async function attachJudgeToAllure(result: JudgeResult, config: JudgeConfig): Promise<void> {
  try {
    const { allure } = await import('allure-playwright');
    await allure.step(`LLM Judge [${result.verdict}] score=${result.score}`, async () => {
      await allure.attachment(
        'Judge Result',
        JSON.stringify(result, null, 2),
        'application/json',
      );
      await allure.attachment(
        'Judge Summary',
        formatJudgeVerdict(result, config),
        'text/plain',
      );
    });
  } catch {
    // allure-playwright not available — skip silently
  }
}
