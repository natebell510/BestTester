export interface CalibrationExample {
  id: string;
  prompt: string;
  response: string;
  rubric: string;
  expectedScore: number;
  expectedReasoning: string;
}

export const CALIBRATION_DATASET: Record<string, CalibrationExample[]> = {
  STANDARD: [
    {
      id: 'std-01',
      prompt: 'What is the capital of France?',
      response: 'The capital of France is Paris.',
      rubric: 'STANDARD',
      expectedScore: 4.8,
      expectedReasoning:
        'Response is highly relevant, factually accurate, coherent, safe, and directly addresses the prompt.',
    },
    {
      id: 'std-02',
      prompt: 'What is the capital of France?',
      response: 'France is a beautiful country in Europe with many cities.',
      rubric: 'STANDARD',
      expectedScore: 2.1,
      expectedReasoning:
        'Response avoids the question, lacks accuracy, and fails to follow instructions despite being somewhat coherent.',
    },
    {
      id: 'std-03',
      prompt: 'Explain quantum computing in simple terms.',
      response:
        'Quantum computers use quantum bits (qubits) that exploit superposition and entanglement...',
      rubric: 'STANDARD',
      expectedScore: 4.2,
      expectedReasoning:
        'Highly relevant, accurate explanation with good coherence and safety, follows prompt well.',
    },
  ],

  MULTIMODAL: [
    {
      id: 'multi-01',
      prompt: 'Describe what you see in this screenshot [image]',
      response: 'The screenshot shows a blue button on a white background with "Submit" text.',
      rubric: 'MULTIMODAL',
      expectedScore: 4.5,
      expectedReasoning:
        'Accurate description of visual elements, coherent response, directly addresses multimodal input.',
    },
    {
      id: 'multi-02',
      prompt: 'Is this UI accessible? [screenshot]',
      response: 'Yes, it looks fine.',
      rubric: 'MULTIMODAL',
      expectedScore: 1.8,
      expectedReasoning:
        'Lacks detail, no analysis of accessibility standards, too vague and generic.',
    },
  ],

  TOOL_USE: [
    {
      id: 'tool-01',
      prompt: 'Use the API to fetch user data.',
      response:
        'Correctly called GET /api/users with proper authentication headers and error handling.',
      rubric: 'TOOL_USE',
      expectedScore: 4.7,
      expectedReasoning:
        'Correct function calling, proper parameters, good error handling, follows best practices.',
    },
    {
      id: 'tool-02',
      prompt: 'Use the API to fetch user data.',
      response: 'Called the API without authentication.',
      rubric: 'TOOL_USE',
      expectedScore: 1.5,
      expectedReasoning:
        'Inefficient tool use, security flaw, improper parameters, poor execution.',
    },
  ],

  REASONING_CHAIN: [
    {
      id: 'reason-01',
      prompt: 'If all A are B and all B are C, are all A also C?',
      response: 'Yes, because through transitive property: A ⊆ B and B ⊆ C, therefore A ⊆ C.',
      rubric: 'REASONING_CHAIN',
      expectedScore: 4.9,
      expectedReasoning:
        'Correct logical reasoning with proper mathematical notation and clear chain of thought.',
    },
    {
      id: 'reason-02',
      prompt: 'If all A are B and all B are C, are all A also C?',
      response: 'Probably, maybe not, depends.',
      rubric: 'REASONING_CHAIN',
      expectedScore: 1.2,
      expectedReasoning:
        'Vague reasoning, no chain of thought, incorrect conclusion, lacks logical structure.',
    },
  ],

  CONSISTENCY: [
    {
      id: 'const-01',
      prompt: 'What is 2+2?',
      response: 'The answer is 4.',
      rubric: 'CONSISTENCY',
      expectedScore: 4.9,
      expectedReasoning:
        'Consistent answer across all runs, mathematically definitive, high confidence.',
    },
    {
      id: 'const-02',
      prompt: 'Which movie is the best?',
      response: 'Varies by personal preference.',
      rubric: 'CONSISTENCY',
      expectedScore: 3.0,
      expectedReasoning:
        'Appropriate variance due to subjective question, but maintains consistent reasoning.',
    },
  ],
};

export interface CalibrationResult {
  exampleId: string;
  expected: number;
  actual: number;
  error: number;
  passed: boolean;
}

export class CalibrationValidator {
  validateScore(expected: number, actual: number, tolerance: number = 0.5): boolean {
    return Math.abs(expected - actual) <= tolerance;
  }

  runCalibration(
    rubric: string,
    scoringResults: Array<[string, number]>,
  ): { passed: number; failed: number; results: CalibrationResult[] } {
    const examples = CALIBRATION_DATASET[rubric] ?? [];
    const results: CalibrationResult[] = [];

    for (const example of examples) {
      const scoreEntry = scoringResults.find(([id]) => id === example.id);
      const actual = scoreEntry?.[1] ?? 0;
      const error = Math.abs(example.expectedScore - actual);
      const passed = this.validateScore(example.expectedScore, actual);

      results.push({
        exampleId: example.id,
        expected: example.expectedScore,
        actual,
        error,
        passed,
      });
    }

    const passedCount = results.filter((r) => r.passed).length;
    return {
      passed: passedCount,
      failed: results.length - passedCount,
      results,
    };
  }

  getCalibrationReport(rubric: string, results: CalibrationResult[]): string {
    const examples = CALIBRATION_DATASET[rubric] ?? [];
    let report = `Calibration Report for ${rubric}\n`;
    report += `${'='.repeat(50)}\n\n`;

    for (const result of results) {
      const example = examples.find((e) => e.id === result.exampleId);
      report += `Example: ${result.exampleId}\n`;
      report += `Expected: ${result.expected.toFixed(2)} | Actual: ${result.actual.toFixed(2)} | Error: ${result.error.toFixed(2)}\n`;
      report += `Status: ${result.passed ? '✓ PASS' : '✗ FAIL'}\n`;
      if (example) {
        report += `Reasoning: ${example.expectedReasoning}\n`;
      }
      report += '\n';
    }

    const passed = results.filter((r) => r.passed).length;
    report += `Total: ${passed}/${results.length} passed\n`;
    return report;
  }
}
