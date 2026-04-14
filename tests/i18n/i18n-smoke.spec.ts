/**
 * @file i18n-smoke.spec.ts
 * @description Switches locales and validates no raw keys, no overflow, RTL for Arabic.
 * @tags @i18n @smoke
 */
import { test, expect } from '@playwright/test';
import { LocaleSwitcher, SupportedLocale } from '../../src/i18n/locale-switcher';
import { StringValidator } from '../../src/i18n/string-validator';

const BASE_URL = process.env.BASE_URL ?? 'https://opensource-demo.orangehrmlive.com';
const LOCALES: SupportedLocale[] = ['en', 'fr', 'ar'];

for (const locale of LOCALES) {
  test(`i18n smoke — locale: ${locale}`, async ({ page }) => {
    await page.goto(`${BASE_URL}/web/index.php/auth/login`);

    const switcher = new LocaleSwitcher(page);
    await switcher.switchTo(locale);

    const validator = new StringValidator(page);
    await validator.assertNoRawKeys();
    await validator.assertNoOverflow();

    if (locale === 'ar') {
      await validator.assertRTLForArabic();
    }
  });
}
