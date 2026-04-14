import { Client } from '@modelcontextprotocol/sdk/client/index.js';
import { StdioClientTransport } from '@modelcontextprotocol/sdk/client/stdio.js';
import { LLMClient } from '../../src/ai/llm-client';
import fs from 'fs';
import path from 'path';

const llm = new LLMClient();

async function generateTest(url: string, outputFile: string): Promise<void> {
  const transport = new StdioClientTransport({
    command: 'npm',
    args: ['run', 'mcp:server'],
  });

  const client = new Client({ name: 'mcp-test-generator', version: '1.0.0' });
  await client.connect(transport);

  // Get page text via MCP tool
  const textResult = await client.callTool({ name: 'get_page_text', arguments: { url } });
  const pageText = (textResult.content as Array<{ text: string }>)[0]?.text ?? '';

  // Get screenshot for visual context
  const screenshotResult = await client.callTool({ name: 'screenshot', arguments: { url } });
  const screenshotB64 = (screenshotResult.content as Array<{ data: string }>)[0]?.data ?? '';

  const systemPrompt = `You are a Playwright TypeScript test generator. Generate a complete, runnable Playwright test file.
Use @playwright/test imports. Include proper selectors, assertions, and descriptive test names.
Output only valid TypeScript code, no markdown fences.`;

  const userMessage = `Generate Playwright tests for this page.
URL: ${url}
Page content (truncated):
${pageText.slice(0, 4000)}`;

  const generatedTest = await llm.chat(systemPrompt, userMessage);

  fs.mkdirSync(path.dirname(outputFile), { recursive: true });
  fs.writeFileSync(outputFile, generatedTest, 'utf-8');
  console.log(`✅ Test generated: ${outputFile}`);

  await client.close();
}

// CLI entry point
const [, , url, outputFile] = process.argv;
if (!url) {
  console.error('Usage: ts-node mcp/client/mcp-test-generator.ts <url> [output-file]');
  process.exit(1);
}

generateTest(
  url,
  outputFile ?? `tests/generated/generated-${Date.now()}.spec.ts`,
).catch((err) => {
  console.error('Generation failed:', err);
  process.exit(1);
});
