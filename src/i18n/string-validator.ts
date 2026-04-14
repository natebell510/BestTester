import { Page, expect } from '@playwright/test';
import enStrings from './locales/en.json';

/**
 * Detects untranslated i18n keys, text overflow, and locale-specific layout issues.
 */
export class StringValidator {
  constructor(private page: Page) {}

  async assertNoRawKeys(): Promise<void> {
    const bodyText = await this.page.locator('body').innerText();
    for (const key of Object.keys(enStrings)) {
      expect(bodyText, `Raw i18n key visible: ${key}`).not.toContain(key);
    }
  }

  async assertNoOverflow(): Promise<void> {
    const overflowing = await this.page.evaluate(() => {
      const els = Array.from(document.querySelectorAll('button, label, span, td, th'));
      return els
        .filter((el) => el.scrollWidth > el.clientWidth + 2)
        .map((el) => el.textContent?.trim().slice(0, 50));
    });
    expect(overflowing, `Text overflow detected: ${overflowing.join(', ')}`).toHaveLength(0);
  }

  async assertRTLForArabic(): Promise<void> {
    const dir = await this.page.evaluate(() => document.documentElement.dir);
    expect(dir).toBe('rtl');
  }
}
