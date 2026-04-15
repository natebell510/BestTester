/**
 * @file security-headers.spec.ts
 * @description Validates security headers on key application pages.
 * @tags @security
 */
import { test } from '@playwright/test';
import { validateSecurityHeaders } from '../../src/security/header-validator';

const PAGES_TO_CHECK = ['/web/index.php/auth/login', '/web/index.php/dashboard/index'];

const BASE_URL = process.env.BASE_URL ?? 'https://opensource-demo.orangehrmlive.com';

for (const pagePath of PAGES_TO_CHECK) {
  test(`@security — security headers present on ${pagePath}`, async ({ page }) => {
    test.skip(
      BASE_URL.includes('opensource-demo.orangehrmlive.com'),
      'Demo site does not enforce security headers — skipping on demo environment',
    );
    await page.goto(`${BASE_URL}${pagePath}`);
    await validateSecurityHeaders(page);
  });
}
