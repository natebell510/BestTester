import { getConfig } from '../config/config';
import { LLMClient } from './llm-client';

export type RoutingStrategy =
  | 'cost-optimized'
  | 'latency-optimized'
  | 'quality-optimized'
  | 'fallback';

export interface ModelMetadata {
  provider: 'bedrock' | 'openai' | 'anthropic';
  modelId: string;
  contextWindow: number;
  costPer1kTokens: number;
  supportsVision: boolean;
  latencyMs: number;
  capabilityScore: number;
}

export const MODEL_REGISTRY: Record<string, ModelMetadata> = {
  'bedrock:nova-pro': {
    provider: 'bedrock',
    modelId: 'amazon.nova-pro-v1:0',
    contextWindow: 300000,
    costPer1kTokens: 0.0008,
    supportsVision: true,
    latencyMs: 1200,
    capabilityScore: 8.5,
  },
  'bedrock:claude-sonnet': {
    provider: 'bedrock',
    modelId: 'anthropic.claude-3-5-sonnet-20241022-v2:0',
    contextWindow: 200000,
    costPer1kTokens: 0.003,
    supportsVision: true,
    latencyMs: 1500,
    capabilityScore: 9.0,
  },
  'bedrock:claude-haiku': {
    provider: 'bedrock',
    modelId: 'anthropic.claude-3-haiku-20240307-v1:0',
    contextWindow: 200000,
    costPer1kTokens: 0.00025,
    supportsVision: true,
    latencyMs: 800,
    capabilityScore: 7.0,
  },
  'openai:gpt-4o': {
    provider: 'openai',
    modelId: 'gpt-4o',
    contextWindow: 128000,
    costPer1kTokens: 0.015,
    supportsVision: true,
    latencyMs: 2000,
    capabilityScore: 9.2,
  },
  'openai:gpt-4o-mini': {
    provider: 'openai',
    modelId: 'gpt-4o-mini',
    contextWindow: 128000,
    costPer1kTokens: 0.00015,
    supportsVision: true,
    latencyMs: 1000,
    capabilityScore: 7.5,
  },
  'anthropic:opus': {
    provider: 'anthropic',
    modelId: 'claude-opus-4-1',
    contextWindow: 200000,
    costPer1kTokens: 0.015,
    supportsVision: false,
    latencyMs: 2500,
    capabilityScore: 9.5,
  },
};

export interface RouterOptions {
  strategy?: RoutingStrategy;
  primaryModel?: string;
  fallbackModel?: string;
  retries?: number;
  requestTimeoutMs?: number;
}

export class LLMRouter {
  private strategy: RoutingStrategy;
  private primaryModel: string;
  private fallbackModel?: string;
  private retries: number;
  private requestTimeoutMs: number;

  constructor(options: RouterOptions = {}) {
    const config = getConfig();
    this.strategy = options.strategy ?? 'cost-optimized';
    this.primaryModel = options.primaryModel ?? config.bedrockModelId ?? 'bedrock:nova-pro';
    this.fallbackModel = options.fallbackModel;
    this.retries = options.retries ?? 3;
    this.requestTimeoutMs = options.requestTimeoutMs ?? 30000;
  }

  selectModel(opts?: { visionRequired?: boolean }): string {
    const models = Object.entries(MODEL_REGISTRY);

    if (opts?.visionRequired) {
      const visionModels = models.filter(([, m]) => m.supportsVision);
      if (visionModels.length === 0) {
        throw new Error('No vision-capable models available');
      }
      return this.rankModels(visionModels, this.strategy)[0][0];
    }

    return this.rankModels(models, this.strategy)[0][0];
  }

  private rankModels(
    models: Array<[string, ModelMetadata]>,
    strategy: RoutingStrategy,
  ): Array<[string, ModelMetadata]> {
    return models.sort(([, a], [, b]) => {
      switch (strategy) {
        case 'cost-optimized':
          return a.costPer1kTokens - b.costPer1kTokens;
        case 'latency-optimized':
          return a.latencyMs - b.latencyMs;
        case 'quality-optimized':
          return b.capabilityScore - a.capabilityScore;
        case 'fallback':
          return b.capabilityScore - a.capabilityScore;
        default:
          return 0;
      }
    });
  }

  async chat(
    userMessage: string,
    options?: {
      systemPrompt?: string;
      model?: string;
      strategy?: RoutingStrategy;
      visionRequired?: boolean;
    },
  ): Promise<string> {
    const model = options?.model ?? this.selectModel({ visionRequired: options?.visionRequired });
    const strategy = options?.strategy ?? this.strategy;

    let lastError: Error | null = null;

    for (let attempt = 0; attempt < this.retries; attempt++) {
      try {
        const client = new LLMClient(model);
        return await Promise.race([
          client.chat(options?.systemPrompt ?? '', userMessage, {
            model,
            systemPrompt: options?.systemPrompt,
          }),
          new Promise<string>((_, reject) =>
            setTimeout(() => reject(new Error('Request timeout')), this.requestTimeoutMs),
          ),
        ]);
      } catch (error) {
        lastError = error instanceof Error ? error : new Error(String(error));

        if (attempt < this.retries - 1) {
          const backoffMs = Math.pow(2, attempt) * 1000;
          await new Promise((resolve) => setTimeout(resolve, backoffMs));
        } else if (this.fallbackModel && strategy === 'fallback') {
          this.primaryModel = this.fallbackModel;
          continue;
        }
      }
    }

    throw lastError ?? new Error('All LLM calls failed');
  }

  getModelMetadata(modelKey: string): ModelMetadata | undefined {
    return MODEL_REGISTRY[modelKey];
  }

  getAllModels(): Record<string, ModelMetadata> {
    return MODEL_REGISTRY;
  }
}
