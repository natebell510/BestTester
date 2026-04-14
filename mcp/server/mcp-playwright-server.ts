import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import { SSEServerTransport } from '@modelcontextprotocol/sdk/server/sse.js';
import { z } from 'zod';
import { chromium } from '@playwright/test';
import http from 'http';
import fs from 'fs';
import path from 'path';

const config = {
  transport: (process.env.MCP_TRANSPORT ?? 'stdio') as 'stdio' | 'sse',
  ssePort: parseInt(process.env.MCP_SSE_PORT ?? '3001'),
  llmBackend: process.env.MCP_LLM_BACKEND ?? 'bedrock',
  browserHeadless: process.env.MCP_HEADLESS !== 'false',
  screenshotOnTool: true,
  maxContextTokens: 128000,
};

const server = new McpServer({ name: 'BestTester', version: '1.0.0' });

server.tool(
  'navigate',
  { url: z.string().url() },
  async ({ url }) => {
    const browser = await chromium.launch({ headless: config.browserHeadless });
    const page = await browser.newPage();
    await page.goto(url);
    const title = await page.title();
    let screenshot: string | undefined;
    if (config.screenshotOnTool) {
      const buf = await page.screenshot({ type: 'png' });
      screenshot = buf.toString('base64');
    }
    await browser.close();
    return {
      content: [
        { type: 'text', text: `Navigated to ${url}. Title: ${title}` },
        ...(screenshot ? [{ type: 'image' as const, data: screenshot, mimeType: 'image/png' as const }] : []),
      ],
    };
  },
);

server.tool(
  'screenshot',
  { url: z.string().url() },
  async ({ url }) => {
    const browser = await chromium.launch({ headless: config.browserHeadless });
    const page = await browser.newPage();
    await page.goto(url);
    const buf = await page.screenshot({ fullPage: true, type: 'png' });
    await browser.close();
    return {
      content: [{ type: 'image', data: buf.toString('base64'), mimeType: 'image/png' }],
    };
  },
);

server.tool(
  'get_page_text',
  { url: z.string().url() },
  async ({ url }) => {
    const browser = await chromium.launch({ headless: config.browserHeadless });
    const page = await browser.newPage();
    await page.goto(url);
    const text = await page.innerText('body');
    await browser.close();
    return { content: [{ type: 'text', text }] };
  },
);

server.tool(
  'run_test',
  { testFile: z.string() },
  async ({ testFile }) => {
    const { execSync } = await import('child_process');
    try {
      const output = execSync(`npx playwright test ${testFile} --reporter=line`, {
        encoding: 'utf-8',
        cwd: process.cwd(),
      });
      return { content: [{ type: 'text', text: output }] };
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      return { content: [{ type: 'text', text: `Test failed:\n${msg}` }] };
    }
  },
);

server.tool(
  'list_tests',
  {},
  async () => {
    const { execSync } = await import('child_process');
    const output = execSync('npx playwright test --list', { encoding: 'utf-8', cwd: process.cwd() });
    return { content: [{ type: 'text', text: output }] };
  },
);

async function main() {
  if (config.transport === 'sse') {
    const httpServer = http.createServer();
    const transport = new SSEServerTransport('/sse', httpServer as unknown as Parameters<typeof SSEServerTransport>[1]);
    await server.connect(transport);
    httpServer.listen(config.ssePort, () => {
      console.error(`BestTester MCP SSE server listening on port ${config.ssePort}`);
    });
  } else {
    const transport = new StdioServerTransport();
    await server.connect(transport);
    console.error('BestTester MCP stdio server started');
  }
}

main().catch(console.error);
