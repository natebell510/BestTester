import { Page } from '@playwright/test';
import { BaseMobilePage } from './base-mobile.page';

export class MobileCartPage extends BaseMobilePage {
  private readonly cartItems = this.page.locator('[data-test="inventory-item"]');
  private readonly checkoutButton = this.page.locator('[data-test="checkout"]');
  private readonly continueShoppingButton = this.page.locator('[data-test="continue-shopping"]');
  private readonly removeButton = this.page.locator('[data-test^="remove-"]');

  constructor(page: Page) {
    super(page);
  }

  async getItemCount(): Promise<number> {
    return this.cartItems.count();
  }

  async removeFirstItem(): Promise<void> {
    await this.removeButton.first().click();
  }

  async continueShopping(): Promise<void> {
    await this.continueShoppingButton.click();
  }

  async checkout(): Promise<void> {
    await this.checkoutButton.click();
  }
}
