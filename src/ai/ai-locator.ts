import { Page, Locator } from '@playwright/test';
import { LLMClient } from './llm-client';

const llm = new LLMClient();

/**
 * AI-powered element finding fallback — asks LLM for best selector given DOM snapshot.
 */
export async function aiLocator(page: Page, description: string): Promise<Locator> {
  const dom = await page.content();
  const truncated = dom.slice(0, 8000);

  const selector = await llm.chat(
    'You are a Playwright expert. Given a DOM snippet, return ONLY a valid CSS selector for the described element. No explanation.',
    `DOM:\n${truncated}\n\nFind: ${description}`,
  );

  return page.locator(selector.trim());
}
