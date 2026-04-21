import { Page, expect } from '@playwright/test';

/**
 * BaseMobilePage — shared mobile-specific helpers for all mobile page objects.
 */
export class BaseMobilePage {
  constructor(protected readonly page: Page) {}

  async navigate(path: string): Promise<void> {
    await this.page.goto(path);
    await this.page.waitForLoadState('domcontentloaded');
  }

  async tap(selector: string): Promise<void> {
    await this.page.locator(selector).tap();
  }

  async swipe(direction: 'up' | 'down' | 'left' | 'right', distance = 300): Promise<void> {
    const viewport = this.page.viewportSize()!;
    const cx = viewport.width / 2;
    const cy = viewport.height / 2;
    const vectors = {
      up: [0, -distance],
      down: [0, distance],
      left: [-distance, 0],
      right: [distance, 0],
    };
    const [dx, dy] = vectors[direction];
    await this.page.mouse.move(cx, cy);
    await this.page.mouse.down();
    await this.page.mouse.move(cx + dx, cy + dy, { steps: 10 });
    await this.page.mouse.up();
  }

  async getViewportSize() {
    return this.page.viewportSize();
  }

  async isResponsive(): Promise<boolean> {
    const viewport = this.page.viewportSize();
    return !!viewport && viewport.width < 768;
  }

  async takeScreenshot(name: string): Promise<Buffer> {
    return this.page.screenshot({ path: `reports/screenshots/mobile-${name}.png`, fullPage: true });
  }

  async expectVisible(selector: string): Promise<void> {
    await expect(this.page.locator(selector)).toBeVisible();
  }
}
