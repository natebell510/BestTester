import { LLMRouter } from '../llm-router';
import { RUBRICS, Rubric } from './judge-rubrics';

export interface JudgeScore {
  overall: number;
  dimensions: Record<string, number>;
  reasoning: string;
  feedback: string;
}

export interface JudgeAgreement {
  judge1Score: number;
  judge2Score: number;
  agreement: number;
  disagreement: number;
  isConcerning: boolean;
}

export interface PairwiseResult {
  responseA: string;
  responseB: string;
  winner: 'A' | 'B' | 'tie';
  marginOfVictory: number;
  reasoning: string;
}

export class JudgeV2 {
  private router: LLMRouter;
  private judgeModel: string;

  constructor(router?: LLMRouter, judgeModel?: string) {
    this.router = router ?? new LLMRouter();
    this.judgeModel = judgeModel ?? 'bedrock:claude-haiku';
  }

  async scoreResponse(prompt: string, response: string, rubric: Rubric): Promise<JudgeScore> {
    const systemPrompt = rubric.systemPromptTemplate;

    const userPrompt = `Prompt: ${prompt}

Response to evaluate:
${response}

${Object.entries(rubric.dimensions)
  .map(([name, dim]) => `${name}: ${dim.description}`)
  .join('\n')}

Evaluate each dimension and provide scores 1-5. Return JSON with all dimensions and an overall score.`;

    const response_text = await this.router.chat(userPrompt, {
      systemPrompt,
      model: this.judgeModel,
    });

    try {
      const parsed = JSON.parse(response_text);

      const scores: Record<string, number> = {};
      let totalWeightedScore = 0;
      let totalWeight = 0;

      for (const [dimension, dimData] of Object.entries(rubric.dimensions)) {
        const score = parsed[dimension] ?? 3;
        scores[dimension] = score;
        totalWeightedScore += score * dimData.weight;
        totalWeight += dimData.weight;
      }

      const overall = totalWeightedScore / totalWeight;

      return {
        overall: Math.round(overall * 10) / 10,
        dimensions: scores,
        reasoning: parsed.reasoning ?? '',
        feedback: parsed.feedback ?? '',
      };
    } catch {
      return {
        overall: 3.0,
        dimensions: {},
        reasoning: 'Failed to parse judge response',
        feedback: response_text,
      };
    }
  }

  async compareJudges(
    prompt: string,
    response: string,
    rubric: Rubric,
    judgeModels: [string, string] = ['bedrock:claude-sonnet', 'bedrock:claude-haiku'],
  ): Promise<JudgeAgreement> {
    const router1 = new LLMRouter();
    const router2 = new LLMRouter();

    const judge1 = new JudgeV2(router1, judgeModels[0]);
    const judge2 = new JudgeV2(router2, judgeModels[1]);

    const score1 = await judge1.scoreResponse(prompt, response, rubric);
    const score2 = await judge2.scoreResponse(prompt, response, rubric);

    const disagreement = Math.abs(score1.overall - score2.overall);
    const agreement = 5 - disagreement;

    return {
      judge1Score: score1.overall,
      judge2Score: score2.overall,
      agreement,
      disagreement,
      isConcerning: disagreement > 1.0,
    };
  }

  async pairwiseCompare(
    prompt: string,
    responseA: string,
    responseB: string,
    rubric: Rubric,
  ): Promise<PairwiseResult> {
    const systemPrompt = `You are a fair evaluator. Compare two responses to the same prompt.
Determine which response is better and by what margin (0.1-2.0).
Return JSON with: winner ("A" or "B" or "tie"), margin (float), reasoning (string).`;

    const userPrompt = `Prompt: ${prompt}

Response A:
${responseA}

Response B:
${responseB}

Rubric dimensions to consider:
${Object.entries(rubric.dimensions)
  .map(([name, dim]) => `- ${name} (weight: ${dim.weight}): ${dim.description}`)
  .join('\n')}

Compare and determine winner.`;

    const response_text = await this.router.chat(userPrompt, {
      systemPrompt,
      model: this.judgeModel,
    });

    try {
      const parsed = JSON.parse(response_text);
      return {
        responseA,
        responseB,
        winner: parsed.winner ?? 'tie',
        marginOfVictory: parsed.margin ?? 0.5,
        reasoning: parsed.reasoning ?? '',
      };
    } catch {
      return {
        responseA,
        responseB,
        winner: 'tie',
        marginOfVictory: 0,
        reasoning: `Failed to parse: ${response_text}`,
      };
    }
  }

  async scoreMultiple(
    prompt: string,
    responses: string[],
    rubric: Rubric,
  ): Promise<Array<{ response: string; score: JudgeScore; rank: number }>> {
    const scores = await Promise.all(responses.map((r) => this.scoreResponse(prompt, r, rubric)));

    const ranked = scores
      .map((score, index) => ({
        response: responses[index],
        score,
        rank: 0,
      }))
      .sort((a, b) => b.score.overall - a.score.overall);

    ranked.forEach((item, index) => {
      item.rank = index + 1;
    });

    return ranked;
  }

  getRubric(name: string): Rubric | undefined {
    return RUBRICS[name];
  }

  getAllRubrics(): Record<string, Rubric> {
    return RUBRICS;
  }
}
