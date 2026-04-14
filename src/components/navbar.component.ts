import { Page, expect } from '@playwright/test';

/**
 * Reusable navbar component abstraction.
 */
export class NavbarComponent {
  constructor(private readonly page: Page) {}

  async navigateTo(menuItem: string): Promise<void> {
    await this.page.getByRole('link', { name: menuItem }).click();
    await this.page.waitForLoadState('networkidle');
  }

  async assertActiveMenu(menuItem: string): Promise<void> {
    await expect(
      this.page.locator('.oxd-main-menu-item--active', { hasText: menuItem }),
    ).toBeVisible();
  }

  async getUserName(): Promise<string> {
    return this.page.locator('.oxd-userdropdown-name').innerText();
  }
}
