import * as dotenv from 'dotenv';
import * as nodePath from 'path';
import { BedrockRuntimeClient, ConverseCommand } from '@aws-sdk/client-bedrock-runtime';
dotenv.config({ path: nodePath.resolve(__dirname, '../../.env'), override: true });

let _client: BedrockRuntimeClient | null = null;

function getClient(): BedrockRuntimeClient {
  if (!_client) {
    _client = new BedrockRuntimeClient({
      region: process.env.AWS_BEDROCK_REGION ?? 'us-east-1',
      credentials: {
        accessKeyId: process.env.AWS_ACCESS_KEY_ID ?? '',
        secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY ?? '',
      },
    });
  }
  return _client;
}

async function bedrockChat(modelId: string, systemPrompt: string, userMessage: string): Promise<string> {
  const cmd = new ConverseCommand({
    modelId,
    system: [{ text: systemPrompt }],
    messages: [{ role: 'user', content: [{ text: userMessage }] }],
    inferenceConfig: { temperature: 0, maxTokens: 2048 },
  });
  const res = await getClient().send(cmd);
  return res.output?.message?.content?.[0]?.text ?? '';
}

/**
 * LLM client backed by AWS Bedrock (Converse API).
 * Default primary model: Amazon Nova Pro.
 */
export class LLMClient {
  private readonly model: string;

  constructor(model = process.env.PRIMARY_AI_MODEL ?? 'amazon.nova-pro-v1:0') {
    this.model = model;
  }

  async chat(userMessage: string, options?: { model?: string; systemPrompt?: string }): Promise<string>;
  async chat(systemPrompt: string, userMessage: string): Promise<string>;
  async chat(
    firstArg: string,
    secondArg?: string | { model?: string; systemPrompt?: string },
  ): Promise<string> {
    let systemPrompt = 'You are a helpful assistant.';
    let userMessage = firstArg;
    let model = this.model;

    if (typeof secondArg === 'string') {
      systemPrompt = firstArg;
      userMessage = secondArg;
    } else if (secondArg && typeof secondArg === 'object') {
      if (secondArg.model) model = secondArg.model;
      if (secondArg.systemPrompt) systemPrompt = secondArg.systemPrompt;
    }

    return bedrockChat(model, systemPrompt, userMessage);
  }

  async summarize(text: string): Promise<string> {
    return this.chat(
      'You are a summarization assistant. Provide a concise, faithful summary.',
      `Summarize the following:\n\n${text}`,
    );
  }

  /** Embeddings via Bedrock Titan Embeddings */
  async embed(text: string): Promise<number[]> {
    const { InvokeModelCommand } = await import('@aws-sdk/client-bedrock-runtime');
    const cmd = new InvokeModelCommand({
      modelId: 'amazon.titan-embed-text-v2:0',
      body: JSON.stringify({ inputText: text }),
      contentType: 'application/json',
      accept: 'application/json',
    });
    const res = await getClient().send(cmd);
    const decoded = JSON.parse(Buffer.from(res.body).toString());
    return decoded.embedding ?? [];
  }
}
