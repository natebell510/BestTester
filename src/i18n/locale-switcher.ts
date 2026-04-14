import { Page } from '@playwright/test';

export type SupportedLocale = 'en' | 'fr' | 'ar' | 'ja';

/**
 * Switches the application locale via URL param or cookie, depending on app support.
 */
export class LocaleSwitcher {
  constructor(private page: Page) {}

  async switchTo(locale: SupportedLocale): Promise<void> {
    const url = new URL(this.page.url());
    url.searchParams.set('lang', locale);
    await this.page.goto(url.toString());
    await this.page.waitForLoadState('networkidle');
  }

  async getCurrentLocale(): Promise<string> {
    return this.page.evaluate(() => document.documentElement.lang || 'en');
  }

  async isRTL(): Promise<boolean> {
    return this.page.evaluate(() => document.documentElement.dir === 'rtl');
  }
}
