import { Page, expect } from '@playwright/test';

const SQLI_PAYLOADS = ["' OR '1'='1", "'; DROP TABLE users;--", "1' AND SLEEP(5)--"];
const XSS_PAYLOADS = ['<script>alert(1)</script>', '"><img src=x onerror=alert(1)>', "javascript:alert(1)"];

export const PAYLOADS = { sqli: SQLI_PAYLOADS, xss: XSS_PAYLOADS };

/**
 * Fills each input in a form with a payload and asserts no 500 / reflected XSS.
 */
export async function fuzzForm(page: Page, formSelector: string, payloads: string[]): Promise<void> {
  const inputs = page.locator(`${formSelector} input:not([type=hidden]):not([type=submit])`);
  const count = await inputs.count();

  for (const payload of payloads) {
    for (let i = 0; i < count; i++) {
      await inputs.nth(i).fill(payload);
    }
    await page.locator(`${formSelector} [type=submit], ${formSelector} button[type=submit]`).first().click();

    // No 500 errors
    const status = await page.evaluate(() => window.performance
      .getEntriesByType('navigation')
      .map((e) => (e as PerformanceNavigationTiming).responseStatus)[0]);
    expect(status, `500 error on payload: ${payload}`).not.toBe(500);

    // No reflected XSS
    const body = await page.content();
    expect(body, `Reflected XSS for payload: ${payload}`).not.toContain('<script>alert(1)</script>');
  }
}
