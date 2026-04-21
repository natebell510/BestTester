import { Page } from '@playwright/test';
import { BaseMobilePage } from './base-mobile.page';

export class MobileProductsPage extends BaseMobilePage {
  private readonly title = this.page.locator('[data-test="title"]');
  private readonly inventoryItems = this.page.locator('[data-test="inventory-item"]');
  private readonly cartBadge = this.page.locator('[data-test="shopping-cart-badge"]');
  private readonly cartLink = this.page.locator('[data-test="shopping-cart-link"]');
  private readonly burgerMenu = this.page.locator('#react-burger-menu-btn');
  private readonly logoutLink = this.page.locator('#logout_sidebar_link');

  constructor(page: Page) {
    super(page);
  }

  async getPageTitle(): Promise<string> {
    return (await this.title.textContent()) ?? '';
  }

  async getItemCount(): Promise<number> {
    return this.inventoryItems.count();
  }

  async addItemToCart(index = 0): Promise<void> {
    await this.inventoryItems.nth(index).locator('button').click();
  }

  async getCartCount(): Promise<string> {
    return (await this.cartBadge.textContent()) ?? '0';
  }

  async goToCart(): Promise<void> {
    await this.cartLink.click();
  }

  async logout(): Promise<void> {
    await this.burgerMenu.click();
    await this.logoutLink.click();
  }
}
