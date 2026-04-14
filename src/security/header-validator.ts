import { Page, expect } from '@playwright/test';

const REQUIRED_HEADERS: Record<string, (v: string) => boolean> = {
  'content-security-policy': (v) => !v.includes("'unsafe-inline'"),
  'strict-transport-security': (v) => {
    const match = v.match(/max-age=(\d+)/);
    return !!match && parseInt(match[1]) >= 31536000;
  },
  'x-frame-options': (v) => v.toUpperCase() === 'DENY',
  'x-content-type-options': (v) => v === 'nosniff',
  'referrer-policy': (v) => v.length > 0,
};

/**
 * Asserts security headers on the current page response.
 */
export async function validateSecurityHeaders(page: Page): Promise<void> {
  const response = await page.request.get(page.url());
  const headers = response.headers();

  for (const [header, validate] of Object.entries(REQUIRED_HEADERS)) {
    const value = headers[header];
    expect(value, `Missing header: ${header}`).toBeTruthy();
    expect(validate(value!), `Invalid value for ${header}: ${value}`).toBe(true);
  }
}
