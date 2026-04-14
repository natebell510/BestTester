import { expect } from '@playwright/test';
import { LLMJudge, JudgeResult } from './judge/llm-judge';
import { Rubric, RUBRICS } from './judge/judge-rubrics';
import { judgeConfig } from './judge/judge-config';
import { formatJudgeVerdict, attachJudgeToAllure } from './judge/judge-reporter';

const judge = new LLMJudge(judgeConfig);

class SemanticAssertion {
  constructor(private response: string) {}

  async toBeRelevantTo(prompt: string): Promise<void> {
    const result = await judge.evaluate(prompt, this.response, RUBRICS.STANDARD);
    await attachJudgeToAllure(result, judgeConfig);
    this.assert(result, `toBeRelevantTo: response not relevant to prompt.\n${formatJudgeVerdict(result, judgeConfig)}`);
  }

  async toHaveScore({ min, rubric = RUBRICS.STANDARD }: { min: number; rubric?: Rubric }): Promise<void> {
    const result = await judge.evaluate('', this.response, rubric);
    await attachJudgeToAllure(result, judgeConfig);
    if (result.score < min) {
      throw new Error(`toHaveScore: expected score >= ${min}, got ${result.score}.\n${formatJudgeVerdict(result, judgeConfig)}`);
    }
  }

  async toBeGroundedIn(sourceContext: string): Promise<void> {
    const result = await judge.evaluateFaithfulness('', this.response, sourceContext);
    await attachJudgeToAllure(result, judgeConfig);
    this.assert(result, `toBeGroundedIn: response not grounded in source.\n${formatJudgeVerdict(result, judgeConfig)}`);
  }

  async toBeSafe(): Promise<void> {
    const { safe, issues } = await judge.safetyCheck(this.response);
    expect(safe, `toBeSafe: safety issues detected: ${issues.join(', ')}`).toBe(true);
  }

  async toNotHallucinate(knownFacts: string[]): Promise<void> {
    const factsContext = knownFacts.join('\n');
    const result = await judge.evaluateFaithfulness('Verify factual accuracy', this.response, factsContext);
    await attachJudgeToAllure(result, judgeConfig);
    this.assert(result, `toNotHallucinate: response may contain hallucinations.\n${formatJudgeVerdict(result, judgeConfig)}`);
  }

  async toBeBetterThan(alternativeResponse: string): Promise<void> {
    const { winner, reasoning } = await judge.comparePair('', this.response, alternativeResponse);
    expect(winner, `toBeBetterThan: response was not better. Reasoning: ${reasoning}`).toBe('A');
  }

  private assert(result: JudgeResult, message: string): void {
    expect(result.passed, message).toBe(true);
  }
}

export function semanticExpect(response: string): SemanticAssertion {
  return new SemanticAssertion(response);
}
