import { MODEL_REGISTRY, ModelMetadata } from './llm-router';

export class ModelRegistry {
  static getByKey(key: string): ModelMetadata | undefined {
    return MODEL_REGISTRY[key];
  }

  static getByProvider(
    provider: 'bedrock' | 'openai' | 'anthropic',
  ): Record<string, ModelMetadata> {
    const filtered: Record<string, ModelMetadata> = {};
    for (const [key, model] of Object.entries(MODEL_REGISTRY)) {
      if (model.provider === provider) {
        filtered[key] = model;
      }
    }
    return filtered;
  }

  static getVisionModels(): Record<string, ModelMetadata> {
    const filtered: Record<string, ModelMetadata> = {};
    for (const [key, model] of Object.entries(MODEL_REGISTRY)) {
      if (model.supportsVision) {
        filtered[key] = model;
      }
    }
    return filtered;
  }

  static getRankedByCost(): Array<[string, ModelMetadata]> {
    return Object.entries(MODEL_REGISTRY).sort(
      ([, a], [, b]) => a.costPer1kTokens - b.costPer1kTokens,
    );
  }

  static getRankedByCapability(): Array<[string, ModelMetadata]> {
    return Object.entries(MODEL_REGISTRY).sort(
      ([, a], [, b]) => b.capabilityScore - a.capabilityScore,
    );
  }

  static getRankedByLatency(): Array<[string, ModelMetadata]> {
    return Object.entries(MODEL_REGISTRY).sort(([, a], [, b]) => a.latencyMs - b.latencyMs);
  }
}
