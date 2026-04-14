#!/usr/bin/env ts-node
/**
 * Suggestion Agent — analyzes existing tests and suggests new test cases.
 * CLI: npm run agent:suggest -- --page src/pages/employee.page.ts
 */
import * as fs from 'fs';
import * as path from 'path';
import * as dotenv from 'dotenv';
import { LLMClient } from '../src/ai/llm-client';

dotenv.config();

const OUTPUT_DIR = path.resolve(__dirname, '../reports/suggestions');
const OUTPUT_FILE = path.join(OUTPUT_DIR, 'test-suggestions.md');

async function main(): Promise<void> {
  const args = process.argv.slice(2);
  const pageIndex = args.indexOf('--page');

  if (pageIndex === -1 || !args[pageIndex + 1]) {
    console.error('Usage: npm run agent:suggest -- --page <path>');
    process.exit(1);
  }

  const pagePath = path.resolve(args[pageIndex + 1]);
  if (!fs.existsSync(pagePath)) {
    console.error(`Page file not found: ${pagePath}`);
    process.exit(1);
  }

  const pageCode = fs.readFileSync(pagePath, 'utf-8');

  // Scan existing test files for covered scenarios
  const testsDir = path.resolve(__dirname, '../tests');
  const existingTests = scanTestFiles(testsDir);

  const llm = new LLMClient();
  const suggestions = await llm.chat(
    `You are a senior QE engineer. Given a Playwright page object and existing test summaries, 
suggest 5-10 new test cases in Playwright spec format covering untested scenarios, edge cases, 
and negative paths. Output as markdown with code blocks.`,
    `Page Object:\n\`\`\`typescript\n${pageCode}\n\`\`\`\n\nExisting tests covered:\n${existingTests}`,
  );

  if (!fs.existsSync(OUTPUT_DIR)) fs.mkdirSync(OUTPUT_DIR, { recursive: true });
  fs.writeFileSync(OUTPUT_FILE, `# Test Suggestions\n\nGenerated: ${new Date().toISOString()}\n\n${suggestions}`);

  console.log(`Suggestions saved to: ${OUTPUT_FILE}`);
  console.log(suggestions);
}

function scanTestFiles(dir: string): string {
  if (!fs.existsSync(dir)) return 'No existing tests found.';
  const results: string[] = [];
  const walk = (d: string): void => {
    for (const entry of fs.readdirSync(d, { withFileTypes: true })) {
      const full = path.join(d, entry.name);
      if (entry.isDirectory()) walk(full);
      else if (entry.name.endsWith('.spec.ts')) {
        const content = fs.readFileSync(full, 'utf-8');
        const tests = [...content.matchAll(/test\(['"`](.+?)['"`]/g)].map((m) => m[1]);
        results.push(`${entry.name}: ${tests.join(', ')}`);
      }
    }
  };
  walk(dir);
  return results.join('\n');
}

main().catch((err) => { console.error(err); process.exit(1); });
