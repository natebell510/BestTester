#!/usr/bin/env ts-node
/**
 * Code Review Agent — sends a file or diff to OpenAI GPT-4o for QE-focused code review.
 * CLI: npm run agent:review -- --file tests/ui/login.spec.ts
 */
import * as fs from 'fs';
import * as path from 'path';
import * as dotenv from 'dotenv';
import { LLMClient } from '../src/ai/llm-client';
import { postMessage } from '../src/utils/slack';

dotenv.config();

const SYSTEM_PROMPT = `You are a senior QE engineer reviewing Playwright TypeScript test code.
Identify: code quality issues, anti-patterns, missing assertions, naming violations, 
no-waitForTimeout violations, missing POM usage, and missing JSDoc.
Format output as a GitHub PR comment with sections: ## Issues, ## Suggestions.`;

async function main(): Promise<void> {
  const args = process.argv.slice(2);
  const fileIndex = args.indexOf('--file');
  const slackFlag = args.includes('--slack');

  if (fileIndex === -1 || !args[fileIndex + 1]) {
    console.error('Usage: npm run agent:review -- --file <path> [--slack]');
    process.exit(1);
  }

  const filePath = path.resolve(args[fileIndex + 1]);
  if (!fs.existsSync(filePath)) {
    console.error(`File not found: ${filePath}`);
    process.exit(1);
  }

  const code = fs.readFileSync(filePath, 'utf-8');
  const llm = new LLMClient();

  console.log(`Reviewing: ${filePath}`);
  const review = await llm.chat(SYSTEM_PROMPT, `File: ${filePath}\n\n\`\`\`typescript\n${code}\n\`\`\``);

  console.log('\n--- CODE REVIEW ---\n');
  console.log(review);

  if (slackFlag) {
    await postMessage(`*Code Review: ${path.basename(filePath)}*\n${review}`);
    console.log('\nPosted to Slack.');
  }
}

main().catch((err) => { console.error(err); process.exit(1); });
